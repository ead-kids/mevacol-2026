import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import type { DeliveryLocation, RouteStop } from '../../types';
import { mapService, MEVACOL_DEPOT } from '../../services/mapService';

interface DeliveryMapProps {
  deliveries: DeliveryLocation[];
  selectedDeliveryId?: string | null;
  onSelectDelivery?: (delivery: DeliveryLocation) => void;
  origin?: { lat: number; lng: number; label?: string } | null;
  routeCoordinates?: [number, number][];
  routeStops?: RouteStop[];
  height?: string;
  showDepot?: boolean;
}

export const DeliveryMap: React.FC<DeliveryMapProps> = ({
  deliveries,
  selectedDeliveryId,
  onSelectDelivery,
  origin,
  routeCoordinates,
  routeStops,
  height = '480px',
  showDepot = true,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);

  // Inicializar mapa de Leaflet una sola vez
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // Centro por defecto: Bogotá o primera entrega
      const defaultCenter: [number, number] = deliveries.length > 0 && deliveries[0].latitude
        ? [deliveries[0].latitude, deliveries[0].longitude]
        : [MEVACOL_DEPOT.lat, MEVACOL_DEPOT.lng];

      const map = L.map(mapContainerRef.current, {
        center: defaultCenter,
        zoom: 13,
        zoomControl: true,
        scrollWheelZoom: true,
      });

      // Mosaico OpenStreetMap 100% gratuito sin API key
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      const layerGroup = L.layerGroup().addTo(map);
      layerGroupRef.current = layerGroup;
      mapInstanceRef.current = map;

      // Invalidate size después de renderizar para evitar artefactos grises
      setTimeout(() => {
        map.invalidateSize();
      }, 250);

      // Observar cambios de tamaño del contenedor para reajustar Leaflet automáticamente en móviles
      let resizeObserver: ResizeObserver | null = null;
      if (typeof ResizeObserver !== 'undefined' && mapContainerRef.current) {
        resizeObserver = new ResizeObserver(() => {
          map.invalidateSize();
        });
        resizeObserver.observe(mapContainerRef.current);
      }

      const handleWindowResize = () => {
        map.invalidateSize();
      };
      window.addEventListener('resize', handleWindowResize);

      return () => {
        if (resizeObserver) resizeObserver.disconnect();
        window.removeEventListener('resize', handleWindowResize);
        if (mapInstanceRef.current) {
          mapInstanceRef.current.remove();
          mapInstanceRef.current = null;
          layerGroupRef.current = null;
          polylineRef.current = null;
        }
      };
    }
  }, []);

  // Actualizar marcadores, rutas y límites cuando cambian los datos
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layerGroup = layerGroupRef.current;
    if (!map || !layerGroup) return;

    // Limpiar marcadores anteriores
    layerGroup.clearLayers();
    if (polylineRef.current) {
      polylineRef.current.remove();
      polylineRef.current = null;
    }

    const bounds = L.latLngBounds([]);

    // 1. Marcador del Depósito Central MEVACOL
    if (showDepot) {
      const depotIcon = mapService.createMarkerIcon({ status: 'DEPOT' });
      const depotMarker = L.marker([MEVACOL_DEPOT.lat, MEVACOL_DEPOT.lng], { icon: depotIcon })
        .bindPopup(`
          <div style="font-family: sans-serif; font-size: 13px; min-width: 180px;">
            <div style="font-weight: 800; color: #4f46e5; margin-bottom: 2px;">🏢 ${MEVACOL_DEPOT.name}</div>
            <div style="color: #64748b; font-size: 11px;">Punto base de despacho</div>
            <div style="margin-top: 4px; font-size: 12px; color: #334155;">${MEVACOL_DEPOT.address}</div>
          </div>
        `);
      layerGroup.addLayer(depotMarker);
      bounds.extend([MEVACOL_DEPOT.lat, MEVACOL_DEPOT.lng]);
    }

    // 2. Marcador de Origen / Repartidor si está presente
    if (origin && origin.lat && origin.lng) {
      const originIcon = mapService.createMarkerIcon({ status: 'ORIGIN' });
      const originMarker = L.marker([origin.lat, origin.lng], { icon: originIcon })
        .bindPopup(`
          <div style="font-family: sans-serif; font-size: 13px; min-width: 180px;">
            <div style="font-weight: 800; color: #9333ea; margin-bottom: 2px;">📍 ${origin.label || 'Ubicación de Partida'}</div>
            <div style="color: #64748b; font-size: 11px;">Punto de inicio de ruta</div>
          </div>
        `);
      layerGroup.addLayer(originMarker);
      bounds.extend([origin.lat, origin.lng]);
    }

    // Mapa de pasos ordenados para asignar números de parada (#1, #2...) si hay ruta multiparada
    const stopNumberMap = new Map<string, number>();
    if (routeStops && routeStops.length > 0) {
      routeStops.forEach((st) => {
        stopNumberMap.set(st.id, st.step_number);
      });
    }

    // 3. Marcadores de Entregas
    deliveries.forEach((deliv) => {
      if (!deliv.latitude || !deliv.longitude) return;

      const stepNumber = stopNumberMap.get(deliv.id);
      const isSelected = selectedDeliveryId === deliv.id;

      const markerIcon = mapService.createMarkerIcon({
        status: deliv.status,
        stepNumber,
      });

      const marker = L.marker([deliv.latitude, deliv.longitude], {
        icon: markerIcon,
        zIndexOffset: isSelected ? 1000 : 100,
      });

      // Generar enlaces externos
      const googleMapsUrl = mapService.getGoogleMapsUrl({
        lat: deliv.latitude,
        lng: deliv.longitude,
        address: deliv.delivery_address,
        city: deliv.delivery_city,
      });
      const wazeUrl = mapService.getWazeUrl({
        lat: deliv.latitude,
        lng: deliv.longitude,
        address: deliv.delivery_address,
        city: deliv.delivery_city,
      });

      // Popup informativo con datos requeridos (Cliente, Dirección, Teléfono, Estado, Entregador)
      const popupHtml = `
        <div style="font-family: sans-serif; min-width: 220px; max-width: 280px; padding: 2px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <span style="font-family: monospace; font-weight: 800; font-size: 12px; background: #fef3c7; color: #b45309; padding: 2px 6px; border-radius: 4px;">
              ${deliv.delivery_code} ${stepNumber ? `&bull; Parada #${stepNumber}` : ''}
            </span>
            <span style="font-size: 11px; font-weight: 700; color: #475569;">
              ${deliv.status}
            </span>
          </div>

          <div style="font-size: 14px; font-weight: 800; color: #0f172a; margin-bottom: 2px;">
            ${deliv.customer_name}
          </div>

          <div style="font-size: 12px; color: #475569; margin-bottom: 4px;">
            📍 <strong>${deliv.delivery_address}</strong>, ${deliv.delivery_city}
          </div>

          ${deliv.customer_phone ? `
            <div style="font-size: 12px; color: #2563eb; margin-bottom: 6px;">
              📞 <a href="tel:${deliv.customer_phone}" style="color: #2563eb; text-decoration: none; font-weight: 600;">
                ${deliv.customer_phone}
              </a>
            </div>
          ` : ''}

          <div style="font-size: 11px; color: #64748b; margin-bottom: 10px; border-top: 1px solid #e2e8f0; padding-top: 4px;">
            🚚 Entregador: <strong>${deliv.deliverer_name || 'Sin asignar'}</strong>
          </div>

          <div style="display: flex; gap: 6px;">
            <a 
              href="${googleMapsUrl}" 
              target="_blank" 
              rel="noopener noreferrer"
              style="
                flex: 1;
                text-align: center;
                background: #2563eb;
                color: #ffffff;
                text-decoration: none;
                padding: 6px 8px;
                border-radius: 6px;
                font-size: 11px;
                font-weight: 700;
              "
            >
              Google Maps
            </a>
            <a 
              href="${wazeUrl}" 
              target="_blank" 
              rel="noopener noreferrer"
              style="
                flex: 1;
                text-align: center;
                background: #0284c7;
                color: #ffffff;
                text-decoration: none;
                padding: 6px 8px;
                border-radius: 6px;
                font-size: 11px;
                font-weight: 700;
              "
            >
              Waze
            </a>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml);

      marker.on('click', () => {
        if (onSelectDelivery) {
          onSelectDelivery(deliv);
        }
      });

      layerGroup.addLayer(marker);
      bounds.extend([deliv.latitude, deliv.longitude]);

      if (isSelected) {
        marker.openPopup();
      }
    });

    // 4. Polilínea de ruta de conducción si existe
    if (routeCoordinates && routeCoordinates.length > 1) {
      const polyline = L.polyline(routeCoordinates, {
        color: '#2563eb',
        weight: 5,
        opacity: 0.85,
        lineCap: 'round',
        lineJoin: 'round',
        dashArray: undefined,
      }).addTo(map);

      polylineRef.current = polyline;

      // Extender los límites para contener toda la ruta
      routeCoordinates.forEach((c) => bounds.extend(c));
    }

    // 5. Ajustar vista del mapa si hay puntos
    if (bounds.isValid()) {
      map.fitBounds(bounds, {
        padding: [45, 45],
        maxZoom: 16,
      });
    }

    map.invalidateSize();
  }, [deliveries, selectedDeliveryId, origin, routeCoordinates, routeStops, showDepot]);

  return (
    <div style={{ position: 'relative', width: '100%', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border-subtle)', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)' }}>
      <div
        ref={mapContainerRef}
        style={{
          width: '100%',
          height,
          background: '#1e293b',
        }}
      />
    </div>
  );
};
