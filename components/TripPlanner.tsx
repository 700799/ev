'use client';

import { useState } from 'react';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useGame } from './GameProvider';

const pinIcon = (color: string) =>
  L.divIcon({
    className: '',
    html: `<div style="background:${color};width:16px;height:16px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:2px solid #fff;box-shadow:0 0 8px ${color}"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 16],
  });

const chargerIcon = L.divIcon({
  className: '',
  html: '<div style="background:#25e6a5;width:12px;height:12px;border-radius:50%;border:2px solid #04121a;box-shadow:0 0 6px #25e6a5"></div>',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  if (points.length >= 2) {
    map.fitBounds(L.latLngBounds(points), { padding: [40, 40] });
  }
  return null;
}

interface Charger {
  id: number;
  lat: number;
  lon: number;
  name: string;
}

interface RouteResult {
  line: [number, number][];
  miles: number;
  minutes: number;
  origin: [number, number];
  dest: [number, number];
  originLabel: string;
  destLabel: string;
}

async function geocode(q: string, signal: AbortSignal): Promise<{ lat: number; lon: number; label: string } | null> {
  const isZip = /^\d{5}$/.test(q.trim());
  const url = isZip
    ? `https://nominatim.openstreetmap.org/search?postalcode=${q.trim()}&country=US&format=json&limit=1`
    : `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&countrycodes=us&format=json&limit=1`;
  const res = await fetch(url, { signal, headers: { Accept: 'application/json' } });
  const data = await res.json();
  if (!data || data.length === 0) return null;
  return {
    lat: parseFloat(data[0].lat),
    lon: parseFloat(data[0].lon),
    label: data[0].display_name?.split(',').slice(0, 2).join(', ') || q,
  };
}

export default function TripPlanner() {
  const [origin, setOrigin] = useState('');
  const [dest, setDest] = useState('');
  const [range, setRange] = useState(300);
  const [efficiency, setEfficiency] = useState(3.5); // mi/kWh
  const [homeRate, setHomeRate] = useState(0.18); // $/kWh
  const [fastRate, setFastRate] = useState(0.45); // $/kWh

  const [route, setRoute] = useState<RouteResult | null>(null);
  const [chargers, setChargers] = useState<Charger[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { record } = useGame();

  const plan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!origin.trim() || !dest.trim()) {
      setError('Enter both a start and a destination (ZIP or city).');
      return;
    }
    setError(null);
    setLoading(true);
    setRoute(null);
    setChargers([]);
    const ac = new AbortController();

    try {
      const [a, b] = await Promise.all([geocode(origin, ac.signal), geocode(dest, ac.signal)]);
      if (!a || !b) {
        setError('Could not locate one of the places. Try a ZIP or "City, State".');
        setLoading(false);
        return;
      }

      // Free OSRM public routing.
      const rRes = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${a.lon},${a.lat};${b.lon},${b.lat}?overview=full&geometries=geojson`,
        { signal: ac.signal },
      );
      const r = await rRes.json();
      if (!r.routes || r.routes.length === 0) {
        setError('No drivable route found between those points.');
        setLoading(false);
        return;
      }
      const geo = r.routes[0];
      const line: [number, number][] = geo.geometry.coordinates.map((c: [number, number]) => [c[1], c[0]]);
      const miles = geo.distance / 1609.34;
      const minutes = geo.duration / 60;

      setRoute({
        line,
        miles,
        minutes,
        origin: [a.lat, a.lon],
        dest: [b.lat, b.lon],
        originLabel: a.label,
        destLabel: b.label,
      });
      record('tool:trip');

      // Sample points along the route and find chargers near them.
      const samples = sampleLine(line, 6);
      const clauses = samples
        .map((p) => `node["amenity"="charging_station"](around:8000,${p[0]},${p[1]});`)
        .join('');
      const q = `[out:json][timeout:25];(${clauses});out body 120;`;
      const opRes = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        body: 'data=' + encodeURIComponent(q),
        signal: ac.signal,
      });
      const op = await opRes.json();
      const seen = new Set<number>();
      const found: Charger[] = (op.elements || [])
        .filter((el: any) => el.lat && el.lon && !seen.has(el.id) && seen.add(el.id))
        .map((el: any) => ({
          id: el.id,
          lat: el.lat,
          lon: el.lon,
          name: el.tags?.name || el.tags?.operator || 'Charging station',
        }));
      setChargers(found);
    } catch (err: any) {
      if (err?.name !== 'AbortError') setError('Routing services are busy. Please try again shortly.');
    } finally {
      setLoading(false);
    }
  };

  // Trip math
  const energyKwh = route ? route.miles / efficiency : 0;
  const stops = route ? Math.max(0, Math.ceil(route.miles / (range * 0.75)) - 1) : 0;
  // First "fill" from home (cheap), remaining energy from fast chargers.
  const homeEnergy = route ? Math.min(energyKwh, range / efficiency) : 0;
  const roadEnergy = Math.max(0, energyKwh - homeEnergy);
  const tripCost = homeEnergy * homeRate + roadEnergy * fastRate;
  const gasCost = route ? (route.miles / 28) * 4.25 : 0; // 28 mpg @ $4.25/gal baseline

  return (
    <div>
      <form onSubmit={plan} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 12, alignItems: 'end' }}>
        <div className="field">
          <label>Start (ZIP or city)</label>
          <input value={origin} onChange={(e) => setOrigin(e.target.value)} placeholder="94583" />
        </div>
        <div className="field">
          <label>Destination</label>
          <input value={dest} onChange={(e) => setDest(e.target.value)} placeholder="Los Angeles, CA" />
        </div>
        <div className="field">
          <label>EV range (mi)</label>
          <input type="number" value={range} min={80} onChange={(e) => setRange(Number(e.target.value))} />
        </div>
        <div className="field">
          <label>Efficiency (mi/kWh)</label>
          <input type="number" step="0.1" value={efficiency} min={1} onChange={(e) => setEfficiency(Number(e.target.value))} />
        </div>
        <button className="btn primary" type="submit" disabled={loading} style={{ height: 44 }}>
          {loading ? <span className="spinner" /> : '🗺️ Plan trip'}
        </button>
      </form>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 12 }}>
        <div className="field" style={{ flex: '1 1 160px' }}>
          <label>Home rate ($/kWh)</label>
          <input type="number" step="0.01" value={homeRate} onChange={(e) => setHomeRate(Number(e.target.value))} />
        </div>
        <div className="field" style={{ flex: '1 1 160px' }}>
          <label>Fast-charge rate ($/kWh)</label>
          <input type="number" step="0.01" value={fastRate} onChange={(e) => setFastRate(Number(e.target.value))} />
        </div>
      </div>

      {error && <div className="note warn" style={{ marginTop: 14 }}>{error}</div>}

      {route && (
        <div className="grid cols-4" style={{ marginTop: 16 }}>
          <div className="card"><div className="num">DISTANCE</div><div className="result-strong">{route.miles.toFixed(0)} mi</div></div>
          <div className="card"><div className="num">DRIVE TIME</div><div className="result-strong">{Math.floor(route.minutes / 60)}h {Math.round(route.minutes % 60)}m</div></div>
          <div className="card"><div className="num">EST. CHARGING STOPS</div><div className="result-strong">{stops}</div></div>
          <div className="card"><div className="num">EST. ENERGY</div><div className="result-strong">{energyKwh.toFixed(0)} kWh</div></div>
          <div className="card"><div className="num">EST. EV TRIP COST</div><div className="result-strong">${tripCost.toFixed(2)}</div><p className="small">Home start + fast-charge top-ups</p></div>
          <div className="card"><div className="num">COMPARABLE GAS COST</div><div className="result-strong" style={{ color: 'var(--warn)' }}>${gasCost.toFixed(2)}</div><p className="small">28 mpg @ $4.25/gal</p></div>
          <div className="card"><div className="num">YOU SAVE</div><div className="result-strong">${Math.max(0, gasCost - tripCost).toFixed(2)}</div></div>
          <div className="card"><div className="num">CHARGERS ON ROUTE</div><div className="result-strong">{chargers.length}</div></div>
        </div>
      )}

      <div className="map" style={{ marginTop: 16, height: 460 }}>
        <MapContainer center={[39.5, -98.35]} zoom={4} style={{ height: '100%', width: '100%' }} scrollWheelZoom>
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; OpenStreetMap &copy; CARTO · routing &copy; OSRM'
          />
          {route && (
            <>
              <FitBounds points={route.line} />
              <Polyline positions={route.line} pathOptions={{ color: '#3aa0ff', weight: 5, opacity: 0.85 }} />
              <Marker position={route.origin} icon={pinIcon('#25e6a5')}><Popup>Start: {route.originLabel}</Popup></Marker>
              <Marker position={route.dest} icon={pinIcon('#ff5c7a')}><Popup>End: {route.destLabel}</Popup></Marker>
              {chargers.map((c) => (
                <Marker key={c.id} position={[c.lat, c.lon]} icon={chargerIcon}>
                  <Popup>{c.name}</Popup>
                </Marker>
              ))}
            </>
          )}
        </MapContainer>
      </div>
      <p className="muted small" style={{ marginTop: 10 }}>
        Free maps & routing via OpenStreetMap, OSRM, and Overpass. Estimates are for planning only — verify charger
        availability and your car&apos;s real range before long trips.
      </p>
    </div>
  );
}

function sampleLine(line: [number, number][], n: number): [number, number][] {
  if (line.length <= n) return line;
  const out: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    out.push(line[Math.floor((i / (n - 1)) * (line.length - 1))]);
  }
  return out;
}
