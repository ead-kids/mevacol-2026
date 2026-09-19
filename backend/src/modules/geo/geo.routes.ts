import { Router, Request, Response } from 'express';
import { queryOne, queryAll, queryRun } from '../../database/db';
import { authMiddleware } from '../../middlewares/auth.middleware';

export const geoRouter = Router();
geoRouter.use(authMiddleware);

export const COLOMBIAN_CITIES_COORDS: Record<string, { lat: number; lng: number }> = {
  bogota: { lat: 4.6097, lng: -74.0817 },
  'bogotá': { lat: 4.6097, lng: -74.0817 },
  'bogota d.c.': { lat: 4.6097, lng: -74.0817 },
  'bogotá d.c.': { lat: 4.6097, lng: -74.0817 },
  medellin: { lat: 6.2442, lng: -75.5812 },
  'medellín': { lat: 6.2442, lng: -75.5812 },
  cali: { lat: 3.4516, lng: -76.5320 },
  barranquilla: { lat: 10.9685, lng: -74.7813 },
  bucaramanga: { lat: 7.1254, lng: -73.1198 },
  pereira: { lat: 4.8133, lng: -75.6961 },
  manizales: { lat: 5.0689, lng: -75.5174 },
  cartagena: { lat: 10.3910, lng: -75.4794 },
  'santa marta': { lat: 11.2408, lng: -74.1990 },
  cucuta: { lat: 7.8939, lng: -72.5078 },
  'cúcuta': { lat: 7.8939, lng: -72.5078 },
  ibague: { lat: 4.4389, lng: -75.2322 },
  'ibagué': { lat: 4.4389, lng: -75.2322 },
  villavicencio: { lat: 4.1420, lng: -73.6266 },
  pasto: { lat: 1.2136, lng: -77.2811 },
  monteria: { lat: 8.7479, lng: -75.8814 },
  'montería': { lat: 8.7479, lng: -75.8814 },
  armenia: { lat: 4.5339, lng: -75.6811 },
  neiva: { lat: 2.9273, lng: -75.2819 },
  popayan: { lat: 2.4419, lng: -76.6063 },
  'popayán': { lat: 2.4419, lng: -76.6063 },
  valledupar: { lat: 10.4631, lng: -73.2532 },
  tunja: { lat: 5.5353, lng: -73.3678 },
  sincelejo: { lat: 9.3047, lng: -75.3978 },
};

export const DEFAULT_DEPOT = {
  name: 'Sede Central MEVACOL',
  address: 'Calle 100 # 15-20, Bogotá',
  city: 'Bogotá',
  lat: 4.6853,
  lng: -74.0536,
};

export function calculateHaversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 100) / 100;
}

// 1. Geocodificar Dirección Individual
geoRouter.get('/geocode', async (req: Request, res: Response): Promise<void> => {
  try {
    const address = String(req.query.address || '').trim();
    const city = String(req.query.city || '').trim();

    if (!address && !city) { res.status(400).json({ success: false, error: 'Se requiere dirección o ciudad para geocodificar.' }); return; }

    const cityKey = city.toLowerCase();
    const cityFallback = COLOMBIAN_CITIES_COORDS[cityKey] || DEFAULT_DEPOT;
    let geoResult: { lat: number; lng: number; display_name: string; is_approximate: boolean } | null = null;

    if (address) {
      try {
        const query = `${address}, ${city ? city + ', ' : ''}Colombia`;
        const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);
        const response = await fetch(url, { headers: { 'User-Agent': 'MEVACOL-ERP-Logistica/1.0', 'Accept-Language': 'es' }, signal: controller.signal });
        clearTimeout(timeoutId);
        if (response.ok) {
          const data = (await response.json()) as any[];
          if (Array.isArray(data) && data.length > 0 && data[0].lat && data[0].lon) {
            geoResult = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), display_name: data[0].display_name, is_approximate: false };
          }
        }
      } catch (fetchErr) {
        console.warn('Aviso al consultar Nominatim:', fetchErr);
      }
    }

    if (!geoResult) {
      let hash = 0;
      for (let i = 0; i < address.length; i++) { hash = (hash << 5) - hash + address.charCodeAt(i); hash |= 0; }
      const latOffset = ((Math.abs(hash) % 100) - 50) * 0.0003;
      const lngOffset = (((Math.abs(hash) >> 2) % 100) - 50) * 0.0003;
      geoResult = { lat: Math.round((cityFallback.lat + latOffset) * 100000) / 100000, lng: Math.round((cityFallback.lng + lngOffset) * 100000) / 100000, display_name: `${address ? address + ', ' : ''}${city || 'Colombia'} (Ubicación aproximada)`, is_approximate: true };
    }

    res.json({ success: true, data: geoResult });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Error al procesar geocodificación.' });
  }
});

// 2. Obtener Coordenadas de Entregas Activas
geoRouter.post('/deliveries-locations', async (req: Request, res: Response): Promise<void> => {
  try {
    const userRole = req.user!.role_code;
    const userId = req.user!.id;
    const { delivery_ids, status_filter } = req.body || {};

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];

    if (userRole === 'ENTREGADOR') { whereClause += ' AND d.delivery_user_id = ?'; params.push(userId); }
    else if (userRole === 'VENDEDOR') { whereClause += ' AND s.seller_user_id = ?'; params.push(userId); }

    if (Array.isArray(delivery_ids) && delivery_ids.length > 0) {
      const placeholders = delivery_ids.map(() => '?').join(',');
      whereClause += ` AND d.id IN (${placeholders})`;
      params.push(...delivery_ids);
    } else if (status_filter && status_filter !== 'TODOS') {
      whereClause += ' AND d.status = ?';
      params.push(status_filter);
    }

    const rows = await queryAll<any>(`
      SELECT d.id, d.delivery_code, d.customer_name, d.customer_phone, d.delivery_address, d.delivery_city, d.status,
        d.scheduled_date, d.latitude, d.longitude, d.geocoded_at, d.delivery_user_id,
        u.full_name as deliverer_name, s.total_cop as sale_total_cop, inv.invoice_code
      FROM deliveries d JOIN sales s ON d.sale_id = s.id
      LEFT JOIN invoices inv ON d.invoice_id = inv.id
      LEFT JOIN users u ON d.delivery_user_id = u.id
      ${whereClause} ORDER BY d.scheduled_date ASC, d.created_at ASC
    `, params);

    const resultLocations = [];
    for (const d of rows) {
      let lat = d.latitude;
      let lng = d.longitude;

      if (!lat || !lng) {
        const cityKey = (d.delivery_city || '').toLowerCase().trim();
        const base = COLOMBIAN_CITIES_COORDS[cityKey] || DEFAULT_DEPOT;
        let hash = 0;
        const str = (d.delivery_address || '') + (d.customer_name || '');
        for (let i = 0; i < str.length; i++) { hash = (hash << 5) - hash + str.charCodeAt(i); hash |= 0; }
        const latOffset = ((Math.abs(hash) % 80) - 40) * 0.0004;
        const lngOffset = (((Math.abs(hash) >> 2) % 80) - 40) * 0.0004;
        lat = Math.round((base.lat + latOffset) * 100000) / 100000;
        lng = Math.round((base.lng + lngOffset) * 100000) / 100000;
        try { await queryRun(`UPDATE deliveries SET latitude = ?, longitude = ?, geocoded_at = NOW() WHERE id = ?`, [lat, lng, d.id]); } catch (uErr) { console.warn('Aviso al guardar coordenadas:', uErr); }
      }

      resultLocations.push({ id: d.id, delivery_code: d.delivery_code, customer_name: d.customer_name, customer_phone: d.customer_phone, delivery_address: d.delivery_address, delivery_city: d.delivery_city, status: d.status, scheduled_date: d.scheduled_date, latitude: lat, longitude: lng, delivery_user_id: d.delivery_user_id, deliverer_name: d.deliverer_name || 'Sin asignar', sale_total_cop: d.sale_total_cop, invoice_code: d.invoice_code });
    }

    res.json({ success: true, depot: DEFAULT_DEPOT, locations: resultLocations });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Error al cargar ubicaciones de entregas.' });
  }
});

// 3. Planificador / Optimizador de Ruta Multiparada
geoRouter.post('/route-plan', async (req: Request, res: Response): Promise<void> => {
  try {
    const { origin, delivery_ids } = req.body || {};

    if (!Array.isArray(delivery_ids) || delivery_ids.length === 0) { res.status(400).json({ success: false, error: 'Debes seleccionar al menos una entrega para calcular la ruta.' }); return; }

    const startPoint = { lat: origin?.latitude || DEFAULT_DEPOT.lat, lng: origin?.longitude || DEFAULT_DEPOT.lng, label: origin?.label || 'Punto de Partida' };

    const placeholders = delivery_ids.map(() => '?').join(',');
    const deliveries = await queryAll<any>(`
      SELECT d.id, d.delivery_code, d.customer_name, d.customer_phone, d.delivery_address, d.delivery_city,
        d.status, d.scheduled_date, d.latitude, d.longitude,
        u.full_name as deliverer_name, s.total_cop as sale_total_cop, inv.invoice_code
      FROM deliveries d JOIN sales s ON d.sale_id = s.id
      LEFT JOIN invoices inv ON d.invoice_id = inv.id
      LEFT JOIN users u ON d.delivery_user_id = u.id
      WHERE d.id IN (${placeholders})
    `, delivery_ids);

    if (deliveries.length === 0) { res.status(404).json({ success: false, error: 'No se encontraron las entregas especificadas.' }); return; }

    const unvisited = deliveries.map((d) => {
      let lat = d.latitude;
      let lng = d.longitude;
      if (!lat || !lng) { const cityKey = (d.delivery_city || '').toLowerCase().trim(); const base = COLOMBIAN_CITIES_COORDS[cityKey] || DEFAULT_DEPOT; lat = base.lat; lng = base.lng; }
      return { ...d, latitude: lat, longitude: lng };
    });

    const orderedStops = [];
    let currentPos = { lat: startPoint.lat, lng: startPoint.lng };
    let totalDistanceKm = 0;

    while (unvisited.length > 0) {
      let closestIdx = 0;
      let minDistance = Infinity;
      for (let i = 0; i < unvisited.length; i++) {
        const dist = calculateHaversineKm(currentPos.lat, currentPos.lng, unvisited[i].latitude, unvisited[i].longitude);
        if (dist < minDistance) { minDistance = dist; closestIdx = i; }
      }
      const nextStop = unvisited.splice(closestIdx, 1)[0];
      totalDistanceKm += minDistance;
      orderedStops.push({ step_number: orderedStops.length + 1, ...nextStop, distance_from_prev_km: Math.round(minDistance * 100) / 100, cumulative_distance_km: Math.round(totalDistanceKm * 100) / 100 });
      currentPos = { lat: nextStop.latitude, lng: nextStop.longitude };
    }

    const travelTimeHours = totalDistanceKm / 25;
    const travelTimeMinutes = Math.round(travelTimeHours * 60);
    const serviceTimeMinutes = orderedStops.length * 10;
    const totalDurationMinutes = travelTimeMinutes + serviceTimeMinutes;

    res.json({ success: true, origin: startPoint, stops_count: orderedStops.length, total_distance_km: Math.round(totalDistanceKm * 10) / 10, estimated_travel_minutes: travelTimeMinutes, estimated_total_minutes: totalDurationMinutes, stops: orderedStops });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Error al calcular la ruta de entrega.' });
  }
});
