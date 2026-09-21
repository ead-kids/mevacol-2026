import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import type { SellerLocation } from '../../types';

interface SellerLocationMapProps {
  sellers: SellerLocation[];
  selectedSellerId?: string | null;
  onSelectSeller?: (seller: SellerLocation) => void;
  height?: string;
}

export const SellerLocationMap: React.FC<SellerLocationMapProps> = ({
  sellers,
  selectedSellerId,
  onSelectSeller,
  height = '520px',
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);
  const accuracyCirclesRef = useRef<L.LayerGroup | null>(null);
  const markerMapRef = useRef<Map<string, L.Marker>>(new Map());

  // Helper para inicializar el mapa
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // Coordenadas por defecto (Centro de Colombia / Bogotá)
      const defaultCenter: [number, number] = [4.6533, -74.0836];

      const map = L.map(mapContainerRef.current, {
        center: defaultCenter,
        zoom: 12,
        zoomControl: true,
        scrollWheelZoom: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      const layerGroup = L.layerGroup().addTo(map);
      const accuracyGroup = L.layerGroup().addTo(map);
      layerGroupRef.current = layerGroup;
      accuracyCirclesRef.current = accuracyGroup;
      mapInstanceRef.current = map;

      // Invalidate size para evitar problemas de tiles en renders dinámicos
      setTimeout(() => {
        map.invalidateSize();
      }, 250);

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
          accuracyCirclesRef.current = null;
          markerMapRef.current.clear();
        }
      };
    }
  }, []);

  // Actualizar marcadores de vendedores
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layerGroup = layerGroupRef.current;
    const accuracyGroup = accuracyCirclesRef.current;
    if (!map || !layerGroup || !accuracyGroup) return;

    layerGroup.clearLayers();
    accuracyGroup.clearLayers();
    markerMapRef.current.clear();

    const bounds = L.latLngBounds([]);
    const sellersWithCoords = sellers.filter(
      (s) => typeof s.latitude === 'number' && typeof s.longitude === 'number'
    );

    sellersWithCoords.forEach((seller) => {
      const lat = seller.latitude!;
      const lng = seller.longitude!;
      const isSelected = selectedSellerId === seller.id;

      // Colores y badges según frescura
      let primaryColor = '#10b981'; // Live green
      let glowClass = 'seller-pin-pulse';
      let statusLabel = '🟢 En Línea (En Vivo)';
      let statusBadgeBg = '#ecfdf5';
      let statusBadgeColor = '#065f46';

      if (seller.freshness === 'STALE') {
        primaryColor = '#f59e0b'; // Amber
        glowClass = '';
        statusLabel = `🟡 Señal Antigua (${seller.minutes_ago ?? 0}m)`;
        statusBadgeBg = '#fffbeb';
        statusBadgeColor = '#92400e';
      } else if (seller.freshness === 'OFFLINE') {
        primaryColor = '#64748b'; // Slate gray
        glowClass = '';
        statusLabel = '⚪ Desconectado / Inactivo';
        statusBadgeBg = '#f1f5f9';
        statusBadgeColor = '#475569';
      }

      // Iniciales del vendedor para el avatar
      const initials = seller.full_name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => p[0].toUpperCase())
        .join('');

      // Crear icono HTML dinámico
      const markerHtml = `
        <div class="seller-marker-wrapper ${glowClass}" style="position: relative; display: flex; flex-direction: column; align-items: center;">
          <div style="
            background: ${primaryColor};
            color: #ffffff;
            width: 38px;
            height: 38px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 800;
            font-size: 13px;
            border: 3px solid #ffffff;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            cursor: pointer;
            transition: transform 0.2s;
            ${isSelected ? 'transform: scale(1.25); border-color: #3b82f6; box-shadow: 0 0 0 3px #3b82f6;' : ''}
          ">
            ${initials || 'V'}
          </div>
          <div style="
            margin-top: 4px;
            background: rgba(15, 23, 42, 0.85);
            color: #ffffff;
            font-size: 11px;
            font-weight: 700;
            padding: 2px 7px;
            border-radius: 9999px;
            white-space: nowrap;
            box-shadow: 0 2px 6px rgba(0,0,0,0.25);
            border: 1px solid rgba(255,255,255,0.2);
            pointer-events: none;
          ">
            ${seller.full_name.split(' ')[0]}
          </div>
        </div>
      `;

      const markerIcon = L.divIcon({
        className: 'seller-custom-div-icon',
        html: markerHtml,
        iconSize: [40, 60],
        iconAnchor: [20, 20],
        popupAnchor: [0, -20],
      });

      const marker = L.marker([lat, lng], {
        icon: markerIcon,
        zIndexOffset: isSelected ? 1500 : 100,
      });

      // Dibujar radio de precisión si existe y es razonable (< 500m)
      if (seller.accuracy && seller.accuracy > 5 && seller.accuracy < 1000) {
        const circle = L.circle([lat, lng], {
          radius: seller.accuracy,
          color: primaryColor,
          fillColor: primaryColor,
          fillOpacity: 0.12,
          weight: 1,
          dashArray: '4, 4',
        });
        accuracyGroup.addLayer(circle);
      }

      // Popup detallado
      const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
      const formatCOP = (amount: number) => `$ ${amount.toLocaleString('es-CO')}`;

      const popupHtml = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; min-width: 240px; padding: 4px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
            <span style="font-size: 11px; font-weight: 700; background: ${statusBadgeBg}; color: ${statusBadgeColor}; padding: 3px 8px; border-radius: 9999px;">
              ${statusLabel}
            </span>
            <span style="font-size: 11px; color: #64748b;">
              ${seller.updated_at ? seller.updated_at.split(' ')[1] || '' : ''}
            </span>
          </div>

          <div style="font-size: 15px; font-weight: 800; color: #0f172a; margin-bottom: 2px;">
            ${seller.full_name}
          </div>
          <div style="font-size: 12px; color: #64748b; margin-bottom: 10px;">
            @${seller.username} ${seller.phone ? `&bull; 📞 ${seller.phone}` : ''}
          </div>

          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 10px; margin-bottom: 10px;">
            <div style="font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase; margin-bottom: 4px;">
              Rendimiento Hoy
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="font-size: 12px; color: #334155;">Ventas Realizadas:</span>
              <span style="font-size: 13px; font-weight: 700; color: #0f172a;">${seller.today_sales_count}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 2px;">
              <span style="font-size: 12px; color: #334155;">Monto Facturado:</span>
              <span style="font-size: 13px; font-weight: 800; color: #10b981;">${formatCOP(seller.today_sales_cop)}</span>
            </div>
          </div>

          ${
            seller.accuracy
              ? `<div style="font-size: 11px; color: #64748b; margin-bottom: 8px;">
                  📡 Precisión satelital: &plusmn;${Math.round(seller.accuracy)} m
                </div>`
              : ''
          }

          <div style="display: flex; gap: 6px; margin-top: 6px;">
            ${
              seller.phone
                ? `<a href="tel:${seller.phone}" style="
                    flex: 1;
                    text-align: center;
                    background: #2563eb;
                    color: white;
                    text-decoration: none;
                    font-size: 12px;
                    font-weight: 600;
                    padding: 6px 8px;
                    border-radius: 6px;
                  ">Llamar</a>`
                : ''
            }
            <a href="${googleMapsUrl}" target="_blank" rel="noopener noreferrer" style="
              flex: 1;
              text-align: center;
              background: #f1f5f9;
              color: #1e293b;
              text-decoration: none;
              font-size: 12px;
              font-weight: 600;
              padding: 6px 8px;
              border-radius: 6px;
              border: 1px solid #cbd5e1;
            ">Google Maps ↗</a>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml, { maxWidth: 300 });

      marker.on('click', () => {
        if (onSelectSeller) {
          onSelectSeller(seller);
        }
      });

      layerGroup.addLayer(marker);
      markerMapRef.current.set(seller.id, marker);
      bounds.extend([lat, lng]);
    });

    // Ajustar límites si hay vendedores con coordenadas y no hay una selección fija
    if (sellersWithCoords.length > 0 && !selectedSellerId) {
      if (sellersWithCoords.length === 1) {
        map.setView([sellersWithCoords[0].latitude!, sellersWithCoords[0].longitude!], 14);
      } else {
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
      }
    }
  }, [sellers]);

  // Si cambia el vendedor seleccionado externamente, centrar el mapa y abrir su popup
  useEffect(() => {
    if (!selectedSellerId || !mapInstanceRef.current) return;
    const marker = markerMapRef.current.get(selectedSellerId);
    if (marker) {
      const latLng = marker.getLatLng();
      mapInstanceRef.current.setView(latLng, 15, { animate: true });
      marker.openPopup();
    }
  }, [selectedSellerId]);

  return (
    <div style={{ position: 'relative', width: '100%', height, borderRadius: '12px', overflow: 'hidden' }}>
      <style>{`
        @keyframes sellerRadarPulse {
          0% {
            box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
          }
          70% {
            box-shadow: 0 0 0 16px rgba(16, 185, 129, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(16, 185, 129, 0);
          }
        }
        .seller-pin-pulse > div:first-child {
          animation: sellerRadarPulse 2s infinite cubic-bezier(0.4, 0, 0.6, 1);
        }
      `}</style>
      <div ref={mapContainerRef} style={{ width: '100%', height: '100%', zIndex: 1 }} />
      {sellers.filter((s) => s.latitude && s.longitude).length === 0 && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'rgba(15, 23, 42, 0.85)',
            color: '#ffffff',
            padding: '12px 20px',
            borderRadius: '10px',
            fontSize: '13px',
            fontWeight: 600,
            zIndex: 1000,
            pointerEvents: 'none',
            backdropFilter: 'blur(4px)',
            textAlign: 'center',
          }}
        >
          📍 No hay vendedores transmitiendo coordenadas en este momento
        </div>
      )}
    </div>
  );
};
