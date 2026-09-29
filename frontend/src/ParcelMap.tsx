import { useEffect, useMemo, useState } from 'react'
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import type { ParcelOrder } from './types'
import { statusLabels, statusProgress } from './types'

type Point = [number, number]
type OsrmResult = { routes?: { geometry?: { coordinates: [number, number][] } }[] }
const boxIcon = L.divIcon({ className: 'parcel-map-icon', html: '<span>📦</span>', iconSize: [38, 38], iconAnchor: [19, 19] })
const originIcon = L.divIcon({ className: 'origin-map-icon', html: '<span>●</span>', iconSize: [20, 20], iconAnchor: [10, 10] })
const destinationIcon = L.divIcon({ className: 'destination-map-icon', html: '<span>●</span>', iconSize: [20, 20], iconAnchor: [10, 10] })

function pointAt(points: Point[], progress: number): Point {
  if (points.length < 2) return points[0]
  const lengths = points.slice(1).map((p, i) => Math.hypot(p[0] - points[i][0], p[1] - points[i][1]))
  const total = lengths.reduce((a, b) => a + b, 0)
  let remaining = total * progress
  for (let i = 0; i < lengths.length; i++) {
    if (remaining <= lengths[i]) {
      const ratio = lengths[i] === 0 ? 0 : remaining / lengths[i]
      return [points[i][0] + (points[i + 1][0] - points[i][0]) * ratio, points[i][1] + (points[i + 1][1] - points[i][1]) * ratio]
    }
    remaining -= lengths[i]
  }
  return points[points.length - 1]
}
function FitRoute({ points }: { points: Point[] }) {
  const map = useMap()
  useEffect(() => { if (points.length) map.fitBounds(L.latLngBounds(points), { padding: [35, 35] }) }, [map, points])
  return null
}

export default function ParcelMap({ order }: { order: ParcelOrder }) {
  const from: Point = [order.originLatitude, order.originLongitude]
  const to: Point = [order.destinationLatitude, order.destinationLongitude]
  const [route, setRoute] = useState<Point[]>([from, to])
  const [routeNote, setRouteNote] = useState('')
  useEffect(() => {
    const controller = new AbortController()
    setRoute([from, to]); setRouteNote('')
    const url = `https://router.project-osrm.org/route/v1/driving/${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&geometries=geojson&steps=false`
    fetch(url, { signal: controller.signal }).then(r => { if (!r.ok) throw new Error('route'); return r.json() as Promise<OsrmResult> })
      .then(data => {
        const coords = data.routes?.[0]?.geometry?.coordinates
        if (!coords?.length) throw new Error('route')
        setRoute(coords.map(([lon, lat]) => [lat, lon]))
      }).catch(() => { if (!controller.signal.aborted) setRouteNote('Nuk u ngarkua rruga e automjetit; po shfaqet vija e drejtë mes adresave.') })
    return () => controller.abort()
  // Coordinates belong to the selected order.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order.trackingNumber])
  const marker = useMemo(() => pointAt(route, statusProgress[order.status]), [route, order.status])
  const center: Point = [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2]
  return <div className="map-wrap">
    <MapContainer key={order.trackingNumber} center={center} zoom={7} scrollWheelZoom className="map">
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <FitRoute points={route} />
      <Polyline positions={route} pathOptions={{ color: '#25815e', weight: 5, opacity: .8 }} />
      <Marker position={from} icon={originIcon}><Popup>Nisja: {order.originAddress}</Popup></Marker>
      <Marker position={to} icon={destinationIcon}><Popup>Destinacioni: {order.destinationAddress}</Popup></Marker>
      <Marker position={marker} icon={boxIcon}><Popup>Pakoja · {statusLabels[order.status]}</Popup></Marker>
    </MapContainer>
    <div className="map-caption"><span>📍 {order.originAddress}</span><span>📦 {statusLabels[order.status]}</span><span>🏁 {order.destinationAddress}</span></div>
    <p className="map-disclaimer">Pozicioni i pakos është i përafërt dhe lëviz sipas statusit që vendos admini; nuk është GPS në kohë reale.{routeNote && ` ${routeNote}`}</p>
  </div>
}
