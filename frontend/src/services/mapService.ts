import L from 'leaflet';
import type { DeliveryStatus, GeoCoordinates } from '../types';

export const MEVACOL_DEPOT: {
  name: string;
  address: string;
  city: string;
  lat: number;
  lng: number;
} = {
  name: 'Sede Central MEVACOL',
  address: 'Calle 100 # 15-20, Bogotá',
  city: 'Bogotá',
  lat: 4.6853,
  lng: -74.0536,
};

// Generador de enlaces a aplicaciones de navegación externas
export const mapService = {
  /**
   * Genera el enlace para abrir en Google Maps (web o app nativa)
   */
  getGoogleMapsUrl(destination: {
    lat?: number | null;
    lng?: number | null;
    address?: string;
    city?: string;
  }): string {
    if (destination.lat && destination.lng) {
      return `https://www.google.com/maps/dir/?api=1&destination=${destination.lat},${destination.lng}`;
    }
    const query = [destination.address, destination.city, 'Colombia'].filter(Boolean).join(', ');
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(query)}`;
  },

  /**
   * Genera el enlace para abrir en Apple Maps (iOS / macOS)
   */
  getAppleMapsUrl(destination: {
    lat?: number | null;
    lng?: number | null;
    address?: string;
    city?: string;
  }): string {
    if (destination.lat && destination.lng) {
      return `maps://?daddr=${destination.lat},${destination.lng}&dirflg=d`;
    }
    const query = [destination.address, destination.city, 'Colombia'].filter(Boolean).join(', ');
    return `maps://?daddr=${encodeURIComponent(query)}&dirflg=d`;
  },

  /**
   * Genera el enlace para abrir en Waze
   */
  getWazeUrl(destination: {
    lat?: number | null;
    lng?: number | null;
    address?: string;
    city?: string;
  }): string {
    if (destination.lat && destination.lng) {
      return `https://waze.com/ul?ll=${destination.lat},${destination.lng}&navigate=yes`;
    }
    const query = [destination.address, destination.city, 'Colombia'].filter(Boolean).join(', ');
    return `https://waze.com/ul?q=${encodeURIComponent(query)}&navigate=yes`;
  },

  /**
   * Cálculo de distancia geodésica Haversine en kilómetros
   */
  haversineDistanceKm(
    coord1: GeoCoordinates,
    coord2: GeoCoordinates
  ): number {
    const R = 6371; // Radio de la Tierra en km
    const dLat = ((coord2.lat - coord1.lat) * Math.PI) / 180;
    const dLon = ((coord2.lng - coord1.lng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((coord1.lat * Math.PI) / 180) *
        Math.cos((coord2.lat * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 10) / 10;
  },

  /**
   * Consulta servicio público OSRM para obtener ruta de conducción y geometría
   * Si falla o no hay conexión, hace fallback a línea directa con cálculo Haversine
   */
  async getDrivingRoute(
    origin: GeoCoordinates,
    destination: GeoCoordinates
  ): Promise<{
    coordinates: [number, number][]; // [lat, lng] para Leaflet Polyline
    distanceKm: number;
    durationMinutes: number;
    isFallback: boolean;
  }> {
    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000); // 4s timeout

      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data.routes && data.routes.length > 0) {
          const route = data.routes[0];
          // GeoJSON coordinates son [lng, lat] -> Leaflet necesita [lat, lng]
          const leafletCoords: [number, number][] = route.geometry.coordinates.map(
            (c: [number, number]) => [c[1], c[0]]
          );

          return {
            coordinates: leafletCoords,
            distanceKm: Math.round((route.distance / 1000) * 10) / 10,
            durationMinutes: Math.max(1, Math.round(route.duration / 60)),
            isFallback: false,
          };
        }
      }
    } catch (err) {
      console.warn('Aviso al consultar OSRM, usando cálculo estimado:', err);
    }

    // Fallback: Línea directa
    const dist = this.haversineDistanceKm(origin, destination);
    const mins = Math.max(1, Math.round((dist / 25) * 60)); // Estimado a 25 km/h
    return {
      coordinates: [
        [origin.lat, origin.lng],
        [destination.lat, destination.lng],
      ],
      distanceKm: dist,
      durationMinutes: mins,
      isFallback: true,
    };
  },

  /**
   * Crea un marcador personalizado SVG Leaflet DivIcon con estética moderna de MEVACOL
   */
  createMarkerIcon(options: {
    status?: DeliveryStatus | 'ORIGIN' | 'DEPOT';
    stepNumber?: number;
  }): L.DivIcon {
    const { status = 'ASIGNADA', stepNumber } = options;

    let bg = '#f59e0b'; // Amber por defecto
    let border = '#d97706';
    let iconSvg = '';

    if (status === 'ORIGIN') {
      bg = '#a855f7'; // Púrpura conductor
      border = '#7e22ce';
      iconSvg = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon>
        </svg>
      `;
    } else if (status === 'DEPOT') {
      bg = '#4f46e5'; // Indigo Sede Central
      border = '#3730a3';
      iconSvg = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
          <polyline points="9 22 9 12 15 12 15 22"></polyline>
        </svg>
      `;
    } else if (status === 'EN_CAMINO') {
      bg = '#3b82f6'; // Azul
      border = '#1d4ed8';
      iconSvg = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <rect x="1" y="3" width="15" height="13"></rect>
          <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
          <circle cx="5.5" cy="18.5" r="2.5"></circle>
          <circle cx="18.5" cy="18.5" r="2.5"></circle>
        </svg>
      `;
    } else if (status === 'ENTREGADA') {
      bg = '#10b981'; // Esmeralda
      border = '#047857';
      iconSvg = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      `;
    } else if (status === 'NO_ENTREGADA') {
      bg = '#ef4444'; // Rojo novedad
      border = '#b91c1c';
      iconSvg = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
          <line x1="12" y1="9" x2="12" y2="13"></line>
          <line x1="12" y1="17" x2="12.01" y2="17"></line>
        </svg>
      `;
    } else {
      // ASIGNADA / PENDIENTE
      bg = '#f59e0b';
      border = '#d97706';
      iconSvg = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <polyline points="12 6 12 12 16 14"></polyline>
        </svg>
      `;
    }

    const badgeContent = typeof stepNumber === 'number'
      ? `<span style="font-size: 13px; font-weight: 800; color: #ffffff;">${stepNumber}</span>`
      : iconSvg;

    const html = `
      <div style="
        position: relative;
        width: 36px;
        height: 36px;
        background: ${bg};
        border: 2.5px solid #ffffff;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4), 0 0 0 2px ${border};
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: transform 0.2s ease;
      ">
        <div style="
          transform: rotate(45deg);
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 100%;
        ">
          ${badgeContent}
        </div>
      </div>
    `;

    return L.divIcon({
      className: 'mevacol-custom-marker',
      html,
      iconSize: [36, 36],
      iconAnchor: [18, 36],
      popupAnchor: [0, -38],
    });
  },
};
