import { EarthquakeEvent, SuperAppHub } from '../types';

export const INITIAL_SUPERAPP_HUBS: Omit<SuperAppHub, 'status'>[] = [
  {
    id: 'hub-bogota-80',
    name: 'Hub Calle 80 - Almacén Central',
    city: 'Bogotá',
    country: 'Colombia',
    latitude: 4.695,
    longitude: -74.112,
    activeCouriers: 145,
  },
  {
    id: 'hub-medellin-guayabal',
    name: 'Hub Guayabal - Dark Store',
    city: 'Medellín',
    country: 'Colombia',
    latitude: 6.208,
    longitude: -75.586,
    activeCouriers: 98,
  },
  {
    id: 'hub-cali-chipichape',
    name: 'Hub Chipichape - Despacho Rápido',
    city: 'Cali',
    country: 'Colombia',
    latitude: 3.473,
    longitude: -76.528,
    activeCouriers: 76,
  },
  {
    id: 'hub-cdmx-vallejo',
    name: 'Hub Norte Vallejo - Macro Centro',
    city: 'Ciudad de México',
    country: 'México',
    latitude: 19.493,
    longitude: -99.162,
    activeCouriers: 215,
  },
  {
    id: 'hub-lima-callao',
    name: 'Hub Callao - Terminal Pacífico',
    city: 'Lima',
    country: 'Perú',
    latitude: -12.056,
    longitude: -77.118,
    activeCouriers: 165,
  },
  {
    id: 'hub-santiago-pudahuel',
    name: 'Hub Pudahuel - Centro Enea',
    city: 'Santiago',
    country: 'Chile',
    latitude: -33.432,
    longitude: -70.768,
    activeCouriers: 130,
  },
  {
    id: 'hub-quito-mariscal',
    name: 'Hub Mariscal - Dark Store',
    city: 'Quito',
    country: 'Ecuador',
    latitude: -0.190,
    longitude: -78.487,
    activeCouriers: 64,
  },
  {
    id: 'hub-sanjose-uruca',
    name: 'Hub La Uruca - Distribución',
    city: 'San José',
    country: 'Costa Rica',
    latitude: 9.948,
    longitude: -84.108,
    activeCouriers: 52,
  },
  {
    id: 'hub-la-downtown',
    name: 'Hub Downtown - Logistics Center',
    city: 'Los Ángeles',
    country: 'EE.UU.',
    latitude: 34.040,
    longitude: -118.246,
    activeCouriers: 180,
  },
  {
    id: 'hub-tokyo-shinjuku',
    name: 'Hub Shinjuku - Micro Fulfillment',
    city: 'Tokio',
    country: 'Japón',
    latitude: 35.693,
    longitude: 139.703,
    activeCouriers: 220,
  },
];

/**
 * Fórmula de Haversine para calcular distancia esférica en km
 */
export function calculateHaversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Radio de la Tierra en km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Evalúa el impacto sísmico en cada Hub de SuperApp con respecto a los eventos sísmicos activos.
 * Determina si el Hub está OPERATIVO, en ALERTA_PRECAUCIÓN o requiere EVACUACIÓN_INMEDIATA.
 */
export function computeHubImpacts(events: EarthquakeEvent[]): SuperAppHub[] {
  return INITIAL_SUPERAPP_HUBS.map((hub) => {
    let worstStatus: SuperAppHub['status'] = 'OPERATIVO';
    let minDistance = Infinity;
    let triggerMag: number | undefined;
    let triggerPlace: string | undefined;

    for (const ev of events) {
      if (ev.latitude == null || ev.longitude == null || ev.mag == null) continue;
      const dist = calculateHaversineDistanceKm(
        hub.latitude,
        hub.longitude,
        ev.latitude,
        ev.longitude
      );

      if (dist < minDistance) {
        minDistance = dist;
      }

      // Regla de Evacuación Inmediata:
      // Evento fuerte cercano (d <= 80 km y M >= 5.0) o evento masivo (d <= 180 km y M >= 6.5)
      if (
        (dist <= 80 && ev.mag >= 5.0) ||
        (dist <= 180 && ev.mag >= 6.5) ||
        (dist <= 40 && ev.mag >= 4.5)
      ) {
        worstStatus = 'EVACUACIÓN_INMEDIATA';
        triggerMag = ev.mag;
        triggerPlace = ev.place;
        break; // Estado máximo alcanzado
      }

      // Regla de Alerta de Precaución:
      // Sismo perceptible moderado en radio urbano (d <= 150 km y M >= 4.2) o sismo muy cercano (d <= 50 km y M >= 3.5)
      if (
        (dist <= 150 && ev.mag >= 4.2) ||
        (dist <= 50 && ev.mag >= 3.5) ||
        (dist <= 250 && ev.mag >= 6.0)
      ) {
        worstStatus = 'ALERTA_PRECAUCIÓN';
        triggerMag = ev.mag;
        triggerPlace = ev.place;
      }
    }

    return {
      ...hub,
      status: worstStatus,
      nearestEventDistanceKm: minDistance < Infinity ? Math.round(minDistance) : undefined,
      triggerEventMag: triggerMag,
      triggerEventPlace: triggerPlace,
    };
  });
}
