'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

interface Station {
  id: number;
  lat: number;
  lon: number;
  name: string;
  operator?: string;
  socket?: string;
  access?: string;
  fee?: string;
  distanceMi: number;
}

const homeIcon = L.divIcon({
  className: '',
  html: '<div style="background:#3aa0ff;width:18px;height:18px;border-radius:50%;border:3px solid #fff;box-shadow:0 0 10px #3aa0ff"></div>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

const stationIcon = L.divIcon({
  className: '',
  html: '<div style="background:#25e6a5;width:14px;height:14px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:2px solid #04121a;box-shadow:0 0 8px #25e6a5"></div>',
  iconSize: [16, 16],
  iconAnchor: [8, 14],
});

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

export default function StationFinder() {
  const [zip, setZip] = useState('');
  const [radius, setRadius] = useState(10); // miles
  const [center, setCenter] = useState<[number, number] | null>(null);
  const [place, setPlace] = useState<string>('');
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

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
      // 1) Geocode the ZIP via OpenStreetMap Nominatim (free, no key).
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
      const label = geo[0].display_name?.split(',').slice(0, 3).join(', ') || clean;
      setCenter([lat, lon]);
      setPlace(label);

      // 2) Query charging stations via Overpass (OpenStreetMap data, free, no key).
      const meters = Math.round(radius * 1609.34);
      const q = `[out:json][timeout:25];(node["amenity"="charging_station"](around:${meters},${lat},${lon});way["amenity"="charging_station"](around:${meters},${lat},${lon}););out center 80;`;
      const opRes = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        body: 'data=' + encodeURIComponent(q),
        signal: ac.signal,
      });
      const op = await opRes.json();
      const results: Station[] = (op.elements || [])
        .map((el: any) => {
          const slat = el.lat ?? el.center?.lat;
          const slon = el.lon ?? el.center?.lon;
          if (slat == null || slon == null) return null;
          const tags = el.tags || {};
          return {
            id: el.id,
            lat: slat,
            lon: slon,
            name: tags.name || tags.operator || 'Charging station',
            operator: tags.operator,
            socket:
              tags['socket:type2'] || tags['socket:tesla_supercharger']
                ? 'Type 2 / Supercharger'
                : tags.socket || undefined,
            access: tags.access,
            fee: tags.fee,
            distanceMi: haversineMi([lat, lon], [slat, slon]),
          } as Station;
        })
        .filter(Boolean)
        .sort((a: Station, b: Station) => a.distanceMi - b.distanceMi);

      setStations(results);
      if (results.length === 0) {
        setError('No charging stations found in OpenStreetMap for this area. Try a larger radius.');
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
        <div className="field" style={{ flex: '1 1 160px' }}>
          <label htmlFor="zip">ZIP code</label>
          <input
            id="zip"
            inputMode="numeric"
            placeholder="e.g. 94583"
            value={zip}
            onChange={(e) => setZip(e.target.value)}
            maxLength={5}
          />
        </div>
        <div className="field" style={{ flex: '0 1 150px' }}>
          <label htmlFor="radius">Radius</label>
          <select id="radius" value={radius} onChange={(e) => setRadius(Number(e.target.value))}>
            <option value={5}>5 miles</option>
            <option value={10}>10 miles</option>
            <option value={25}>25 miles</option>
            <option value={50}>50 miles</option>
          </select>
        </div>
        <button className="btn primary" type="submit" disabled={loading} style={{ height: 44 }}>
          {loading ? <span className="spinner" /> : '🔌 Find stations'}
        </button>
      </form>

      {error && (
        <div className="note warn" style={{ marginTop: 14 }}>
          {error}
        </div>
      )}
      {place && !error && (
        <p className="muted small" style={{ marginTop: 10 }}>
          Showing chargers near <strong>{place}</strong> — {stations.length} found within {radius} mi.
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
                <Marker position={center} icon={homeIcon}>
                  <Popup>Your ZIP area</Popup>
                </Marker>
                <Circle center={center} radius={radius * 1609.34} pathOptions={{ color: '#3aa0ff', opacity: 0.4, fillOpacity: 0.05 }} />
              </>
            )}
            {stations.map((s) => (
              <Marker key={s.id} position={[s.lat, s.lon]} icon={stationIcon}>
                <Popup>
                  <strong>{s.name}</strong>
                  <br />
                  {s.operator && <>Operator: {s.operator}<br /></>}
                  {s.distanceMi.toFixed(1)} mi away
                  {s.fee && <><br />Fee: {s.fee}</>}
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>

        {stations.length > 0 && (
          <div style={{ maxHeight: 420, overflowY: 'auto', display: 'grid', gap: 10, alignContent: 'start' }}>
            {stations.slice(0, 40).map((s) => (
              <div key={s.id} className="card" style={{ padding: 12 }}>
                <h3 style={{ fontSize: '0.98rem' }}>{s.name}</h3>
                <div className="article-meta">
                  <span>📍 {s.distanceMi.toFixed(1)} mi</span>
                  {s.operator && <span>🏢 {s.operator}</span>}
                  {s.access && <span>🔓 {s.access}</span>}
                  {s.fee && <span>💲 {s.fee}</span>}
                </div>
                <a
                  className="small"
                  href={`https://www.openstreetmap.org/?mlat=${s.lat}&mlon=${s.lon}#map=17/${s.lat}/${s.lon}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open in map ↗
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
      <p className="muted small" style={{ marginTop: 10 }}>
        Data from OpenStreetMap contributors via Nominatim & Overpass — free, community-maintained, and not exhaustive.
        Always confirm availability in your charging app before heading out.
      </p>
    </div>
  );
}
