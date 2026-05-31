'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useGame } from './GameProvider';

// Optional Open Charge Map API key (NEXT_PUBLIC_OCM_KEY). Works key-less too,
// just with stricter rate limits. Get a free key at openchargemap.org.
const OCM_KEY = process.env.NEXT_PUBLIC_OCM_KEY;

type Provider = 'ocm' | 'osm';

interface Station {
  id: string;
  lat: number;
  lon: number;
  name: string;
  operator?: string;
  distanceMi: number;
  powerKw?: number;
  connectors?: string;
  points?: number;
  cost?: string; // pricing
  status?: string; // availability/status text
  operational?: boolean;
  source: Provider;
}

const homeIcon = L.divIcon({
  className: '',
  html: '<div style="background:#3aa0ff;width:18px;height:18px;border-radius:50%;border:3px solid #fff;box-shadow:0 0 10px #3aa0ff"></div>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

const stationIcon = (color: string) =>
  L.divIcon({
    className: '',
    html: `<div style="background:${color};width:14px;height:14px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:2px solid #04121a;box-shadow:0 0 8px ${color}"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 14],
  });

function statusColor(s: Station) {
  if (s.source === 'osm') return '#25e6a5';
  if (s.operational === false) return '#ff5c7a';
  if (s.operational === true) return '#25e6a5';
  return '#ffb547';
}

function Recenter({ center }: { center: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.flyTo(center, 12, { duration: 0.8 });
  }, [center, map]);
  return null;
}

function haversineMi(a: [number, number], b: [number, number]) {
  const R = 3958.8;
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLon = ((b[1] - a[1]) * Math.PI) / 180;
  const lat1 = (a[0] * Math.PI) / 180;
  const lat2 = (b[0] * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

// --- Open Charge Map: richest free source (operator, power, cost, status) ---
async function fetchOCM(lat: number, lon: number, radiusMi: number, signal: AbortSignal): Promise<Station[]> {
  const params = new URLSearchParams({
    output: 'json',
    countrycode: 'US',
    latitude: String(lat),
    longitude: String(lon),
    distance: String(radiusMi),
    distanceunit: 'Miles',
    maxresults: '80',
    compact: 'false',
    verbose: 'false',
  });
  if (OCM_KEY) params.set('key', OCM_KEY);
  const res = await fetch(`https://api.openchargemap.io/v3/poi/?${params.toString()}`, { signal });
  if (!res.ok) throw new Error('OCM request failed');
  const data = await res.json();
  return (data || [])
    .map((poi: any): Station | null => {
      const ai = poi.AddressInfo;
      if (!ai?.Latitude || !ai?.Longitude) return null;
      const conns: any[] = poi.Connections || [];
      const powerKw = conns.reduce((m, c) => Math.max(m, c.PowerKW || 0), 0) || undefined;
      const connectors = Array.from(
        new Set(conns.map((c) => c.ConnectionType?.Title).filter(Boolean)),
      ).join(', ');
      return {
        id: `ocm-${poi.ID}`,
        lat: ai.Latitude,
        lon: ai.Longitude,
        name: ai.Title || 'Charging station',
        operator: poi.OperatorInfo?.Title && poi.OperatorInfo.Title !== '(Unknown Operator)' ? poi.OperatorInfo.Title : undefined,
        distanceMi: ai.Distance ?? haversineMi([lat, lon], [ai.Latitude, ai.Longitude]),
        powerKw,
        connectors: connectors || undefined,
        points: poi.NumberOfPoints || undefined,
        cost: poi.UsageCost || undefined,
        status: poi.StatusType?.Title,
        operational: poi.StatusType?.IsOperational ?? undefined,
        source: 'ocm',
      };
    })
    .filter(Boolean)
    .sort((a: Station, b: Station) => a.distanceMi - b.distanceMi);
}

// --- OpenStreetMap / Overpass fallback (no key, community data) ---
async function fetchOverpass(lat: number, lon: number, radiusMi: number, signal: AbortSignal): Promise<Station[]> {
  const meters = Math.round(radiusMi * 1609.34);
  const q = `[out:json][timeout:25];(node["amenity"="charging_station"](around:${meters},${lat},${lon});way["amenity"="charging_station"](around:${meters},${lat},${lon}););out center 80;`;
  const res = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    body: 'data=' + encodeURIComponent(q),
    signal,
  });
  const op = await res.json();
  return (op.elements || [])
    .map((el: any): Station | null => {
      const slat = el.lat ?? el.center?.lat;
      const slon = el.lon ?? el.center?.lon;
      if (slat == null || slon == null) return null;
      const tags = el.tags || {};
      return {
        id: `osm-${el.id}`,
        lat: slat,
        lon: slon,
        name: tags.name || tags.operator || 'Charging station',
        operator: tags.operator,
        distanceMi: haversineMi([lat, lon], [slat, slon]),
        connectors: tags['socket:type2'] || tags['socket:tesla_supercharger'] ? 'Type 2 / Supercharger' : tags.socket,
        cost: tags.fee === 'no' ? 'Free' : tags.fee === 'yes' ? 'Paid' : undefined,
        source: 'osm',
      };
    })
    .filter(Boolean)
    .sort((a: Station, b: Station) => a.distanceMi - b.distanceMi);
}

export default function StationFinder() {
  const [zip, setZip] = useState('');
  const [radius, setRadius] = useState(10);
  const [provider, setProvider] = useState<Provider>('ocm');
  const [center, setCenter] = useState<[number, number] | null>(null);
  const [place, setPlace] = useState('');
  const [stations, setStations] = useState<Station[]>([]);
  const [activeSource, setActiveSource] = useState<Provider>('ocm');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const { record } = useGame();

  const search = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const clean = zip.trim();
    if (!/^\d{5}$/.test(clean)) {
      setError('Please enter a valid 5-digit US ZIP code.');
      return;
    }
    setError(null);
    setLoading(true);
    setStations([]);
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    try {
      const geoRes = await fetch(
        `https://nominatim.openstreetmap.org/search?postalcode=${clean}&country=US&format=json&limit=1&addressdetails=1`,
        { signal: ac.signal, headers: { Accept: 'application/json' } },
      );
      const geo = await geoRes.json();
      if (!geo || geo.length === 0) {
        setError('Could not find that ZIP code. Try another.');
        setLoading(false);
        return;
      }
      const lat = parseFloat(geo[0].lat);
      const lon = parseFloat(geo[0].lon);
      setCenter([lat, lon]);
      setPlace(geo[0].display_name?.split(',').slice(0, 3).join(', ') || clean);

      let results: Station[] = [];
      let used: Provider = provider;
      if (provider === 'ocm') {
        try {
          results = await fetchOCM(lat, lon, radius, ac.signal);
        } catch {
          results = [];
        }
        // Auto-fallback to OSM if OCM is empty or rate-limited.
        if (results.length === 0) {
          results = await fetchOverpass(lat, lon, radius, ac.signal);
          used = 'osm';
        }
      } else {
        results = await fetchOverpass(lat, lon, radius, ac.signal);
      }

      setActiveSource(used);
      setStations(results);
      record('tool:stations');
      if (results.length === 0) {
        setError('No charging stations found for this area. Try a larger radius or the other data source.');
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        setError('Lookup failed (the free map services may be busy). Please try again in a moment.');
      }
    } finally {
      setLoading(false);
    }
  };

  const mapCenter = useMemo<[number, number]>(() => center || [39.5, -98.35], [center]);

  return (
    <div>
      <form onSubmit={search} style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div className="field" style={{ flex: '1 1 150px' }}>
          <label htmlFor="zip">ZIP code</label>
          <input id="zip" inputMode="numeric" placeholder="e.g. 94583" value={zip} onChange={(e) => setZip(e.target.value)} maxLength={5} />
        </div>
        <div className="field" style={{ flex: '0 1 130px' }}>
          <label htmlFor="radius">Radius</label>
          <select id="radius" value={radius} onChange={(e) => setRadius(Number(e.target.value))}>
            <option value={5}>5 miles</option>
            <option value={10}>10 miles</option>
            <option value={25}>25 miles</option>
            <option value={50}>50 miles</option>
          </select>
        </div>
        <div className="field" style={{ flex: '0 1 200px' }}>
          <label htmlFor="provider">Data source</label>
          <select id="provider" value={provider} onChange={(e) => setProvider(e.target.value as Provider)}>
            <option value="ocm">Open Charge Map (pricing + status)</option>
            <option value="osm">OpenStreetMap (community)</option>
          </select>
        </div>
        <button className="btn primary" type="submit" disabled={loading} style={{ height: 44 }}>
          {loading ? <span className="spinner" /> : '🔌 Find stations'}
        </button>
      </form>

      {error && <div className="note warn" style={{ marginTop: 14 }}>{error}</div>}
      {place && !error && (
        <p className="muted small" style={{ marginTop: 10 }}>
          Showing chargers near <strong>{place}</strong> — {stations.length} found within {radius} mi via{' '}
          <strong>{activeSource === 'ocm' ? 'Open Charge Map' : 'OpenStreetMap'}</strong>
          {provider === 'ocm' && activeSource === 'osm' && ' (Open Charge Map returned none, fell back automatically)'}.
        </p>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: stations.length ? '1.4fr 1fr' : '1fr', gap: 16, marginTop: 16 }}>
        <div className="map">
          <MapContainer center={mapCenter} zoom={center ? 11 : 4} style={{ height: '100%', width: '100%' }} scrollWheelZoom>
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
            />
            <Recenter center={center} />
            {center && (
              <>
                <Marker position={center} icon={homeIcon}><Popup>Your ZIP area</Popup></Marker>
                <Circle center={center} radius={radius * 1609.34} pathOptions={{ color: '#3aa0ff', opacity: 0.4, fillOpacity: 0.05 }} />
              </>
            )}
            {stations.map((s) => (
              <Marker key={s.id} position={[s.lat, s.lon]} icon={stationIcon(statusColor(s))}>
                <Popup>
                  <strong>{s.name}</strong>
                  <br />
                  {s.operator && <>{s.operator}<br /></>}
                  {s.distanceMi.toFixed(1)} mi away
                  {s.powerKw && <><br />⚡ up to {s.powerKw} kW</>}
                  {s.connectors && <><br />🔌 {s.connectors}</>}
                  {s.cost && <><br />💲 {s.cost}</>}
                  {s.status && <><br />📶 {s.status}</>}
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>

        {stations.length > 0 && (
          <div style={{ maxHeight: 440, overflowY: 'auto', display: 'grid', gap: 10, alignContent: 'start' }}>
            {stations.slice(0, 40).map((s) => (
              <div key={s.id} className="card" style={{ padding: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'baseline' }}>
                  <h3 style={{ fontSize: '0.98rem' }}>{s.name}</h3>
                  {s.operational != null && (
                    <span className="pill" style={{ color: s.operational ? 'var(--accent)' : 'var(--danger)', borderColor: 'currentColor' }}>
                      {s.operational ? 'Operational' : 'Down'}
                    </span>
                  )}
                </div>
                <div className="article-meta">
                  <span>📍 {s.distanceMi.toFixed(1)} mi</span>
                  {s.operator && <span>🏢 {s.operator}</span>}
                  {s.powerKw && <span>⚡ {s.powerKw} kW</span>}
                  {s.points && <span>🔢 {s.points} ports</span>}
                  {s.connectors && <span>🔌 {s.connectors}</span>}
                  <span>💲 {s.cost || 'Price varies'}</span>
                </div>
                <a className="small" href={`https://www.openstreetmap.org/?mlat=${s.lat}&mlon=${s.lon}#map=17/${s.lat}/${s.lon}`} target="_blank" rel="noopener noreferrer">
                  Open in map ↗
                </a>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="muted small" style={{ marginTop: 10 }}>
        Pricing &amp; status from <a href="https://openchargemap.org" target="_blank" rel="noopener noreferrer">Open Charge Map</a>;
        community locations from OpenStreetMap (Nominatim &amp; Overpass). Both are free and not exhaustive — always confirm
        live availability in your charging app before heading out.
      </p>
    </div>
  );
}
