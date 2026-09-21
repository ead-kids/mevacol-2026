import React from 'react';
import type { Invoice } from '../../types';
import { formatCOP } from '../../utils/numberToWords';
import { MEVACOL_LOGO } from '../../assets/logo';

interface InvoiceDocumentProps {
  invoice: Invoice;
  onClose?: () => void;
  showCloseButton?: boolean;
}

export const InvoiceDocument: React.FC<InvoiceDocumentProps> = ({
  invoice,
  onClose,
  showCloseButton = true,
}) => {
  const company = invoice.company || {
    name: 'DISTRIBUCIONES MEVACOL',
    legal_name: 'Distribuidora Farmacéutica MEVACOL S.A.S.',
    nit: '901.458.789-3',
    address: 'Cra. 52 # 45-30',
    city: 'Medellín',
    department: 'Antioquia',
    country: 'Colombia',
    phone: '(604) 444-2310',
    mobile: '+57 312 890 4567',
    email: 'facturacion@mevacol.com.co',
    website: 'www.mevacol.com.co',
    logo_url: MEVACOL_LOGO,
    regime: 'Régimen Común - Facturación Comercial MEVACOL',
    dian_resolution: 'Resolución DIAN No. 18764000123456 de 2026-01-15',
    dian_range: 'Prefijo FAC del 0001 al 10000 Vigencia: 24 meses',
  };

  const handlePrint = () => {
    window.print();
  };

  const formattedDate = new Date(invoice.created_at).toLocaleString('es-CO', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

  const totalUnits =
    invoice.items?.reduce((acc, item) => acc + (Number(item.quantity) || 0), 0) || 0;

  return (
    <div className="pos-ticket-wrapper">
      {/* Estilos específicos para Ticket Térmico POS (80mm / 58mm) */}
      <style>{`
        .pos-ticket-wrapper {
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .pos-topbar-actions {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          max-width: 360px;
          background: #0f172a;
          border: 1px solid #334155;
          padding: 10px 14px;
          border-radius: 10px;
          margin-bottom: 12px;
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.35);
        }

        .pos-btn-print {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #059669;
          color: #ffffff;
          font-size: 11.5px;
          font-weight: 700;
          padding: 6px 14px;
          border-radius: 6px;
          border: none;
          cursor: pointer;
          transition: background 0.15s ease;
        }
        .pos-btn-print:hover {
          background: #047857;
        }

        .pos-btn-close {
          background: #1e293b;
          color: #cbd5e1;
          font-size: 11.5px;
          font-weight: 600;
          padding: 6px 12px;
          border-radius: 6px;
          border: 1px solid #475569;
          cursor: pointer;
        }
        .pos-btn-close:hover {
          background: #334155;
          color: #ffffff;
        }

        /* Hoja de Tirilla Térmica POS en pantalla */
        .pos-thermal-ticket {
          width: 100%;
          max-width: 280px;
          margin: 0 auto;
          background: #ffffff !important;
          color: #000000 !important;
          padding: 12px 10px;
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.45);
          font-family: 'Courier New', Courier, monospace, -apple-system, sans-serif;
          font-size: 9.5px;
          line-height: 1.22;
          box-sizing: border-box;
        }

        .pos-thermal-ticket * {
          box-sizing: border-box;
          color: #000000 !important;
        }

        .pos-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 9px;
          line-height: 1.15;
          margin: 4px 0;
        }

        /* Regla de Impresión Térmica @media print */
        @media print {
          @page {
            margin: 0 !important;
            size: 80mm auto;
          }
          body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
          }
          body * {
            visibility: hidden !important;
          }
          #mevacol-printable-invoice, #mevacol-printable-invoice * {
            visibility: visible !important;
          }
          #mevacol-printable-invoice {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 280px !important;
            max-width: 280px !important;
            margin: 0 !important;
            padding: 4px 6px !important;
            background: #ffffff !important;
            color: #000000 !important;
            box-shadow: none !important;
            border: none !important;
          }
          .no-print-area {
            display: none !important;
          }
          * {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            page-break-after: auto !important;
            break-after: auto !important;
          }
        }
      `}</style>

      {/* 1. Barra de Acciones Superior (no imprimible) */}
      <div className="no-print-area pos-topbar-actions">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '14px' }}>🧾</span>
          <div>
            <div style={{ color: '#ffffff', fontWeight: 'bold', fontSize: '12px' }}>
              Tirilla POS {invoice.invoice_code}
            </div>
            <div style={{ color: '#94a3b8', fontSize: '10px' }}>
              Formato Térmico 80mm
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button onClick={handlePrint} className="pos-btn-print">
            <svg style={{ width: '13px', height: '13px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            <span>Imprimir POS</span>
          </button>

          {showCloseButton && onClose && (
            <button onClick={onClose} className="pos-btn-close">
              Cerrar
            </button>
          )}
        </div>
      </div>

      {/* 2. CONTENEDOR PRINCIPAL: Tirilla / Ticket Térmico POS (280px / 72mm) */}
      <div id="mevacol-printable-invoice" className="pos-thermal-ticket">
        {/* ==============================================================
            2. ENCABEZADO (Centrado)
            ============================================================== */}
        <div style={{ textAlign: 'center' }}>
          {/* Logo centrado en la parte superior (width: 90px; height: auto; margin: 0 auto; display: block;) */}
          <img
            src={company.logo_url || MEVACOL_LOGO}
            alt="Logo MEVACOL"
            style={{
              width: '90px',
              height: 'auto',
              margin: '0 auto',
              display: 'block',
              objectFit: 'contain',
            }}
          />

          {/* Nombre de la empresa en negrita mayúscula (font-size: 12px; font-weight: bold;) */}
          <div
            style={{
              fontSize: '12px',
              fontWeight: 'bold',
              textTransform: 'uppercase',
              marginTop: '4px',
              letterSpacing: '0.02em',
            }}
          >
            {company.name || 'DISTRIBUCIONES MEVACOL'}
          </div>

          {/* Lema, NIT, dirección, ciudad, teléfonos en texto compacto (font-size: 10px; line-height: 1.2;) */}
          <div style={{ fontSize: '10px', lineHeight: 1.2, marginTop: '2px' }}>
            {company.legal_name && company.legal_name !== company.name && (
              <div style={{ fontWeight: 'bold' }}>{company.legal_name}</div>
            )}
            <div>NIT: {company.nit}</div>
            {company.regime && <div style={{ fontSize: '9px' }}>{company.regime}</div>}
            <div>{company.address} - {company.city}</div>
            <div>Tel: {company.phone || company.mobile}</div>
            {company.email && <div style={{ fontSize: '9px' }}>{company.email}</div>}
          </div>

          {/* Línea divisoria sólida simple */}
          <div style={{ borderTop: '1px solid #000', margin: '6px 0 5px 0' }} />
        </div>

        {/* ==============================================================
            3. DATOS DEL DOCUMENTO Y CLIENTE (Alineación Izquierda)
            ============================================================== */}
        <div>
          {/* Título del comprobante centrado en negrita (ej. REMISIÓN 25000 o FACTURA DE VENTA) */}
          <div
            style={{
              textAlign: 'center',
              fontWeight: 'bold',
              fontSize: '11px',
              textTransform: 'uppercase',
              margin: '2px 0 4px 0',
              letterSpacing: '0.02em',
            }}
          >
            FACTURA DE VENTA: {invoice.invoice_code}
          </div>
          {invoice.sale_code && (
            <div style={{ textAlign: 'center', fontSize: '9px', marginBottom: '4px' }}>
              REMISIÓN: {invoice.sale_code}
            </div>
          )}

          {/* Bloque de texto plano a dos columnas o líneas directas (font-size: 9.5px;) */}
          <div style={{ fontSize: '9.5px', lineHeight: 1.25 }}>
            <div>
              <span style={{ fontWeight: 'bold' }}>Hora / Fecha: </span>
              <span>{formattedDate}</span>
            </div>
            <div>
              <span style={{ fontWeight: 'bold' }}>Cédula / NIT: </span>
              <span>{invoice.customer_id_number || '222222222222'}</span>
            </div>
            <div>
              <span style={{ fontWeight: 'bold' }}>Razón Social / Cliente: </span>
              <span style={{ textTransform: 'uppercase' }}>
                {invoice.customer_name || 'Consumidor Final'}
              </span>
            </div>
            <div>
              <span style={{ fontWeight: 'bold' }}>Dirección: </span>
              <span>{invoice.customer_address || 'Sin registrar'}</span>
            </div>
            <div>
              <span style={{ fontWeight: 'bold' }}>Ciudad: </span>
              <span>{invoice.customer_city || company.city}</span>
            </div>
            <div>
              <span style={{ fontWeight: 'bold' }}>Teléfono: </span>
              <span>{invoice.customer_phone || 'Sin registrar'}</span>
            </div>
          </div>

          {/* Otra línea divisoria sólida */}
          <div style={{ borderTop: '1px solid #000', margin: '6px 0 4px 0' }} />
        </div>

        {/* ==============================================================
            4. TABLA DE PRODUCTOS (Estilo POS)
            ============================================================== */}
        <div>
          <table className="pos-table">
            <thead>
              <tr style={{ borderTop: '1px solid #000', borderBottom: '1px solid #000' }}>
                <th style={{ textAlign: 'left', padding: '3px 0', width: '22%' }}>PLU</th>
                <th style={{ textAlign: 'center', padding: '3px 0', width: '12%' }}>C/N</th>
                <th style={{ textAlign: 'right', padding: '3px 0', width: '22%' }}>V/UNI</th>
                <th style={{ textAlign: 'right', padding: '3px 0', width: '26%' }}>TOTAL</th>
                <th style={{ textAlign: 'right', padding: '3px 0', width: '18%' }}>DES</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items && invoice.items.length > 0 ? (
                invoice.items.map((item, idx) => (
                  <React.Fragment key={item.id || idx}>
                    {/* Fila 1: Descripción completa en mayúsculas ocupando todo el ancho (colspan) */}
                    <tr>
                      <td
                        colSpan={5}
                        style={{
                          fontWeight: 'bold',
                          paddingTop: idx === 0 ? '3px' : '4px',
                          paddingBottom: '1px',
                          textTransform: 'uppercase',
                          wordBreak: 'break-word',
                          fontSize: '9px',
                        }}
                      >
                        {item.product_name}
                      </td>
                    </tr>
                    {/* Fila 2: Números distribuidos en sus columnas correspondientes (PLU, C/N, V/UNI, TOTAL, DES) */}
                    <tr
                      style={{
                        borderBottom:
                          idx < (invoice.items?.length || 0) - 1
                            ? '1px dashed #cccccc'
                            : 'none',
                      }}
                    >
                      <td style={{ textAlign: 'left', paddingBottom: '3px', fontFamily: 'monospace' }}>
                        {item.product_code || 'PLU'}
                      </td>
                      <td style={{ textAlign: 'center', paddingBottom: '3px' }}>
                        {item.quantity}
                      </td>
                      <td style={{ textAlign: 'right', paddingBottom: '3px' }}>
                        {formatCOP(item.unit_price_cop)}
                      </td>
                      <td style={{ textAlign: 'right', paddingBottom: '3px', fontWeight: 'bold' }}>
                        {formatCOP(item.total_cop)}
                      </td>
                      <td style={{ textAlign: 'right', paddingBottom: '3px' }}>
                        {item.discount_cop > 0 ? formatCOP(item.discount_cop) : '0'}
                      </td>
                    </tr>
                  </React.Fragment>
                ))
              ) : (
                <tr>
                  <td colSpan={5} style={{ padding: '8px 0', textAlign: 'center', fontStyle: 'italic' }}>
                    Sin artículos registrados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ==============================================================
            5. TOTALES Y MÉTODOS DE PAGO
            ============================================================== */}
        <div>
          {/* Línea divisoria */}
          <div style={{ borderTop: '1px solid #000', margin: '4px 0' }} />

          {/* Bloque alineado a la derecha con: TOTAL, CANCELO, CAMBIO, TOTAL PRODUCTOS */}
          <div
            style={{
              textAlign: 'right',
              fontSize: '9.5px',
              lineHeight: 1.35,
              marginTop: '4px',
            }}
          >
            <div>
              <span style={{ fontWeight: 'normal' }}>SUBTOTAL: </span>
              <span style={{ fontWeight: 'bold' }}>
                {formatCOP(invoice.subtotal_cop || invoice.total_cop)}
              </span>
            </div>

            {invoice.discount_cop > 0 && (
              <div>
                <span style={{ fontWeight: 'normal' }}>DESCUENTO: </span>
                <span style={{ fontWeight: 'bold' }}>
                  -{formatCOP(invoice.discount_cop)}
                </span>
              </div>
            )}

            <div
              style={{
                fontSize: '12px',
                fontWeight: 'bold',
                margin: '2px 0',
                letterSpacing: '0.02em',
              }}
            >
              <span>TOTAL: </span>
              <span>{formatCOP(invoice.total_cop)}</span>
            </div>

            <div>
              <span style={{ fontWeight: 'normal' }}>CANCELÓ: </span>
              <span style={{ fontWeight: 'bold' }}>
                {formatCOP(invoice.total_cop)}
              </span>
            </div>

            <div>
              <span style={{ fontWeight: 'normal' }}>CAMBIO: </span>
              <span style={{ fontWeight: 'bold' }}>$ 0</span>
            </div>

            <div style={{ marginTop: '2px' }}>
              <span style={{ fontWeight: 'normal' }}>TOTAL PRODUCTOS: </span>
              <span style={{ fontWeight: 'bold' }}>
                {totalUnits} ({invoice.items?.length || 0} ÍTEMS)
              </span>
            </div>
          </div>

          {/* Sección de USTED AHORRÓ */}
          <div
            style={{
              borderTop: '1px dashed #000',
              borderBottom: '1px dashed #000',
              padding: '3px 0',
              margin: '6px 0',
              textAlign: 'center',
              fontSize: '9.5px',
              fontWeight: 'bold',
            }}
          >
            USTED AHORRÓ: {formatCOP(invoice.discount_cop || 0)}
          </div>

          {/* Caja de ESTADO ACEPTADA / FORMA DE PAGO (Contado / Efectivo / Total) */}
          <div
            style={{
              border: '1px solid #000',
              padding: '4px',
              margin: '6px 0',
              textAlign: 'center',
              fontSize: '9px',
              lineHeight: 1.3,
            }}
          >
            <div style={{ fontWeight: 'bold' }}>ESTADO: ACEPTADA</div>
            <div>FORMA DE PAGO: CONTADO / EFECTIVO</div>
            <div style={{ fontWeight: 'bold' }}>
              TOTAL PAGADO: {formatCOP(invoice.total_cop)}
            </div>
          </div>

          {/* Datos finales: Cajero, Vendedor, Observación */}
          <div style={{ fontSize: '8.5px', lineHeight: 1.25, marginTop: '6px' }}>
            <div>
              <strong>Cajero: </strong>
              <span>{invoice.seller_name || 'Cajero Principal'}</span>
            </div>
            <div>
              <strong>Vendedor: </strong>
              <span>{invoice.seller_name || 'Vendedor MEVACOL'}</span>
            </div>
            {invoice.notes && (
              <div>
                <strong>Observación: </strong>
                <span>{invoice.notes}</span>
              </div>
            )}
            <div style={{ marginTop: '4px', textAlign: 'center', color: '#222' }}>
              <div>{company.dian_resolution}</div>
              <div>{company.dian_range}</div>
              <div style={{ fontStyle: 'italic', fontSize: '8px', marginTop: '2px' }}>
                Esta tirilla de factura se asimila a la letra de cambio según Art. 774 C. de Co.
              </div>
            </div>
          </div>

          {/* Pie de firma del adquiriente en texto pequeño (font-size: 8.5px;) */}
          <div style={{ marginTop: '16px', textAlign: 'center', fontSize: '8.5px' }}>
            <div
              style={{
                borderTop: '1px dashed #000',
                width: '80%',
                margin: '0 auto 4px auto',
              }}
            />
            <div style={{ fontWeight: 'bold' }}>FIRMA / SELLO DEL ADQUIRIENTE</div>
            <div style={{ marginTop: '2px' }}>C.C. / NIT: _________________________</div>
          </div>

          {/* Mensaje de agradecimiento y pie */}
          <div style={{ textAlign: 'center', fontSize: '8.5px', marginTop: '10px' }}>
            <div style={{ fontWeight: 'bold' }}>*** GRACIAS POR SU COMPRA ***</div>
            <div style={{ fontSize: '8px', color: '#444', marginTop: '2px' }}>
              MEVACOL Sistema POS • {formattedDate}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
