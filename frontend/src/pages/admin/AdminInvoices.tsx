import React, { useState, useEffect } from 'react';
import {
  Receipt,
  Search,
  DollarSign,
  TrendingUp,
  Calendar,
  RefreshCw,
  Printer,
  AlertCircle,
  Sparkles,
  Filter,
  CheckCircle2,
  FileCheck2,
  Zap,
} from 'lucide-react';
import type { Invoice, InvoiceStats, User } from '../../types';
import { api } from '../../services/api';
import { InvoiceDocument } from '../../components/invoices/InvoiceDocument';
import { formatCOP } from '../../utils/numberToWords';

export const AdminInvoices: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [stats, setStats] = useState<InvoiceStats | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sellerFilter, setSellerFilter] = useState('');
  const [sellersList, setSellersList] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Modal para ver/imprimir factura
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  const fetchStats = async () => {
    try {
      const res = await api.getInvoiceStats();
      setStats(res.stats);
    } catch (err) {
      console.error('Error al cargar estadísticas de facturación:', err);
    }
  };

  const fetchSellers = async () => {
    try {
      const res = await api.getUsers();
      setSellersList(res.users.filter((u) => u.role_code === 'VENDEDOR' || u.role_code === 'ADMINISTRADOR'));
    } catch (err) {
      console.error('Error al cargar usuarios:', err);
    }
  };

  const fetchInvoices = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await api.getInvoices({
        search: searchTerm || undefined,
        seller_id: sellerFilter || undefined,
      });
      setInvoices(res.invoices);
    } catch (err: any) {
      console.error('Error al cargar facturas:', err);
      setErrorMsg(err.message || 'Error al consultar facturas.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchSellers();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchInvoices();
    }, 250);
    return () => clearTimeout(timer);
  }, [searchTerm, sellerFilter]);

  const handleOpenInvoiceDetail = async (invoiceId: string) => {
    try {
      const res = await api.getInvoiceById(invoiceId);
      setSelectedInvoice(res.invoice);
    } catch (err: any) {
      console.error('Error al obtener detalle de factura:', err);
      setErrorMsg(err.message || 'No se pudo abrir la factura.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Encabezado Principal Futurista */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-cyan-950/60 text-cyan-300 border border-cyan-500/30 shadow-[0_0_12px_rgba(0,229,255,0.2)]">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse mr-2"></span>
              Fase 5 • Facturación Comercial
            </span>
            <span className="text-xs text-slate-400 font-mono tracking-wide">
              MEVACOL S.A.S. • DIAN
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-1.5 flex items-center gap-2.5 tracking-tight">
            <Receipt className="w-8 h-8 text-cyan-400 drop-shadow-[0_0_12px_rgba(0,229,255,0.4)]" />
            <span>Módulo de Facturación</span>
          </h1>
          <p className="text-sm text-slate-400 mt-0.5 max-w-3xl">
            Control, emisión, auditoría e impresión de facturas comerciales vinculadas a ventas registradas en tiempo real.
          </p>
        </div>

        {/* Badge de Sincronización y Estado */}
        <div className="flex items-center space-x-3">
          <div className="hidden sm:flex items-center space-x-2 bg-slate-900/80 border border-slate-800 px-3.5 py-2 rounded-xl text-xs text-slate-300">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Sincronización Automática 1:1</span>
          </div>
        </div>
      </div>

      {/* 1. KPIs y Métricas Superiores (Cards Grid en 4 columnas responsivas) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* KPI 1: Facturas Emitidas */}
        <div
          className="relative rounded-2xl p-5 overflow-hidden transition-all duration-300 group hover:-translate-y-1"
          style={{
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(0, 229, 255, 0.15)',
            boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
          }}
        >
          {/* Acento de luz superior */}
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent group-hover:via-cyan-400 transition-all"></div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Facturas Emitidas
              </p>
              <h3 className="text-3xl font-extrabold text-white font-mono mt-1 tracking-tight">
                {stats?.total_invoices ?? 0}
              </h3>
            </div>
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110"
              style={{
                background: 'rgba(0, 229, 255, 0.08)',
                border: '1px solid rgba(0, 229, 255, 0.25)',
                boxShadow: '0 0 16px rgba(0, 229, 255, 0.15)',
                color: '#22d3ee',
              }}
            >
              <FileCheck2 className="w-6 h-6" />
            </div>
          </div>

          <div className="mt-3.5 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
            <span className="text-cyan-400 font-medium flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              100% Vinculadas a ventas
            </span>
            <span className="text-slate-500 font-mono text-[11px]">Sincronizadas</span>
          </div>
        </div>

        {/* KPI 2: Facturación Total */}
        <div
          className="relative rounded-2xl p-5 overflow-hidden transition-all duration-300 group hover:-translate-y-1"
          style={{
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(0, 229, 255, 0.15)',
            boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
          }}
        >
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent group-hover:via-cyan-400 transition-all"></div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Facturación Total
              </p>
              <h3 className="text-2xl lg:text-3xl font-extrabold font-mono mt-1 tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-teal-300 to-emerald-400 drop-shadow-[0_0_10px_rgba(0,229,255,0.25)]">
                {formatCOP(stats?.total_revenue_cop ?? 0)}
              </h3>
            </div>
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110"
              style={{
                background: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                boxShadow: '0 0 16px rgba(16, 185, 129, 0.15)',
                color: '#34d399',
              }}
            >
              <DollarSign className="w-6 h-6" />
            </div>
          </div>

          <div className="mt-3.5 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
            <span className="text-emerald-400 font-medium">Ingresos brutos acumulados</span>
            <span className="text-slate-500 font-mono text-[11px]">COP</span>
          </div>
        </div>

        {/* KPI 3: Facturación Hoy */}
        <div
          className="relative rounded-2xl p-5 overflow-hidden transition-all duration-300 group hover:-translate-y-1"
          style={{
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(0, 229, 255, 0.15)',
            boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
          }}
        >
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent group-hover:via-cyan-400 transition-all"></div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Facturación Hoy
              </p>
              <h3 className="text-2xl lg:text-3xl font-extrabold font-mono mt-1 tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">
                {formatCOP(stats?.today_revenue_cop ?? 0)}
              </h3>
            </div>
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110"
              style={{
                background: 'rgba(59, 130, 246, 0.08)',
                border: '1px solid rgba(59, 130, 246, 0.25)',
                boxShadow: '0 0 16px rgba(59, 130, 246, 0.15)',
                color: '#60a5fa',
              }}
            >
              <Calendar className="w-6 h-6" />
            </div>
          </div>

          <div className="mt-3.5 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
            <span className="text-cyan-300 font-medium flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-cyan-400" />
              {stats?.today_invoices ?? 0} facturas hoy
            </span>
            <span className="text-slate-500 font-mono text-[11px]">Jornada en curso</span>
          </div>
        </div>

        {/* KPI 4: Ticket Promedio */}
        <div
          className="relative rounded-2xl p-5 overflow-hidden transition-all duration-300 group hover:-translate-y-1"
          style={{
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(0, 229, 255, 0.15)',
            boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
          }}
        >
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent group-hover:via-cyan-400 transition-all"></div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Ticket Promedio
              </p>
              <h3 className="text-2xl lg:text-3xl font-extrabold font-mono mt-1 tracking-tight text-white">
                {formatCOP(stats?.average_ticket_cop ?? 0)}
              </h3>
            </div>
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110"
              style={{
                background: 'rgba(245, 158, 11, 0.08)',
                border: '1px solid rgba(245, 158, 11, 0.25)',
                boxShadow: '0 0 16px rgba(245, 158, 11, 0.15)',
                color: '#fbbf24',
              }}
            >
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>

          <div className="mt-3.5 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
            <span className="text-amber-400 font-medium">Promedio por operación</span>
            <span className="text-slate-500 font-mono text-[11px]">Ticket medio</span>
          </div>
        </div>
      </div>

      {/* Alerta de Error si Ocurre */}
      {errorMsg && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-300 text-sm flex items-center space-x-3 shadow-lg">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* 2. Barra de Filtros y Búsqueda (Contenedor Horizontal Tipo Toolbar) */}
      <div
        className="rounded-2xl p-3.5 shadow-xl transition-all"
        style={{
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(0, 229, 255, 0.15)',
          boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.3)',
        }}
      >
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Buscador Rápido con Icono de Lupa */}
          <div className="relative w-full md:max-w-md">
            <Search className="w-4 h-4 text-cyan-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar por FAC-XXXX, VTA, cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-950/70 border border-slate-700/80 focus:border-cyan-400 rounded-xl text-sm text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 transition-all font-sans"
            />
          </div>

          {/* Grupo de Filtros & Botón Actualizar */}
          <div className="flex items-center gap-3 w-full md:w-auto">
            {/* Selector Desplegable Estilizado */}
            <div className="relative flex-1 md:w-64">
              <select
                value={sellerFilter}
                onChange={(e) => setSellerFilter(e.target.value)}
                className="w-full pl-3 pr-8 py-2.5 bg-slate-950/70 border border-slate-700/80 focus:border-cyan-400 rounded-xl text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 transition-all cursor-pointer appearance-none"
              >
                <option value="">Todos los asesores / vendedores</option>
                {sellersList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.full_name} ({s.role_code})
                  </option>
                ))}
              </select>
              <Filter className="w-3.5 h-3.5 text-cyan-400/70 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Botón de Acción "Actualizar" con Hover Luminoso */}
            <button
              onClick={() => {
                fetchInvoices();
                fetchStats();
              }}
              className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-cyan-300 bg-cyan-950/40 border border-cyan-500/30 hover:border-cyan-400 hover:text-white hover:bg-cyan-500/20 hover:shadow-[0_0_18px_rgba(0,229,255,0.35)] transition-all duration-300 cursor-pointer flex-shrink-0"
              title="Recargar datos de facturación"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-cyan-300' : ''}`} />
              <span className="hidden sm:inline">Actualizar</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. Tabla de Facturación (Data Table Futurista) */}
      <div
        className="rounded-2xl shadow-2xl overflow-hidden transition-all duration-300"
        style={{
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800/90 bg-slate-950/80 text-slate-400 text-[11px] font-mono uppercase tracking-wider">
                <th className="py-4 px-4 font-semibold">No. Factura</th>
                <th className="py-4 px-4 font-semibold">Venta Ref.</th>
                <th className="py-4 px-4 font-semibold">Fecha y Hora</th>
                <th className="py-4 px-4 font-semibold">Cliente</th>
                <th className="py-4 px-4 font-semibold">Vendedor</th>
                <th className="py-4 px-4 font-semibold text-center">Ítems</th>
                <th className="py-4 px-4 font-semibold text-right">Total COP</th>
                <th className="py-4 px-4 font-semibold text-center">Estado</th>
                <th className="py-4 px-4 font-semibold text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-sm font-sans">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-slate-400">
                    <div className="relative inline-flex mb-3">
                      <RefreshCw className="w-8 h-8 animate-spin text-cyan-400 drop-shadow-[0_0_10px_rgba(0,229,255,0.5)]" />
                    </div>
                    <div className="font-mono text-sm text-cyan-300">Cargando base de datos de facturación...</div>
                    <div className="text-xs text-slate-500 mt-1">Sincronizando registros relacionales MEVACOL</div>
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-slate-400">
                    <Receipt className="w-12 h-12 text-slate-600 mx-auto mb-3 opacity-40" />
                    <div className="font-semibold text-slate-300 text-base">No se encontraron facturas</div>
                    <div className="text-xs text-slate-500 mt-1">Intenta con otros términos de búsqueda o selecciona otro asesor.</div>
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr
                    key={inv.id}
                    className="hover:bg-cyan-500/5 transition-colors duration-150 group"
                  >
                    {/* No. Factura (Monospace + Badge Cian Neón) */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 font-mono font-bold text-cyan-300 bg-cyan-950/60 border border-cyan-500/30 px-2.5 py-1 rounded-lg text-xs shadow-[0_0_10px_rgba(0,229,255,0.15)] group-hover:border-cyan-400 transition-all">
                        <Receipt className="w-3 h-3 text-cyan-400" />
                        {inv.invoice_code}
                      </span>
                    </td>

                    {/* Venta Ref. (Monospace + Slate Badge) */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="font-mono text-xs text-slate-300 bg-slate-950/80 px-2.5 py-1 rounded-md border border-slate-800 group-hover:border-slate-700 transition-all">
                        {inv.sale_code || 'VTA-ASOC'}
                      </span>
                    </td>

                    {/* Fecha y Hora */}
                    <td className="py-3.5 px-4 whitespace-nowrap text-xs">
                      <div className="font-medium text-slate-200">
                        {new Date(inv.created_at).toLocaleDateString('es-CO', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                        {new Date(inv.created_at).toLocaleTimeString('es-CO', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </td>

                    {/* Cliente */}
                    <td className="py-3.5 px-4 min-w-[180px]">
                      <div className="font-bold text-white leading-snug">
                        {inv.customer_name || 'Consumidor Final'}
                      </div>
                      <div className="text-xs text-slate-400 font-mono mt-0.5">
                        {inv.customer_id_number ? `NIT/CC: ${inv.customer_id_number}` : 'Sin documento'}
                      </div>
                    </td>

                    {/* Vendedor */}
                    <td className="py-3.5 px-4 whitespace-nowrap text-xs text-slate-300">
                      <div className="flex items-center space-x-2">
                        <div className="w-6 h-6 rounded-full bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-300 text-[10px] font-bold">
                          {inv.seller_name ? inv.seller_name.charAt(0).toUpperCase() : 'V'}
                        </div>
                        <span className="font-medium">{inv.seller_name || 'Vendedor MEVACOL'}</span>
                      </div>
                    </td>

                    {/* Ítems */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-mono font-medium text-slate-300 bg-slate-800/80 border border-slate-700/80">
                        {inv.items_count || 1} {inv.items_count === 1 ? 'prod' : 'prods'}
                      </span>
                    </td>

                    {/* Total COP (Monospace & Alineación Perfecta) */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <span className="font-mono font-extrabold text-cyan-300 text-sm tracking-tight drop-shadow-[0_0_8px_rgba(0,229,255,0.2)]">
                        {formatCOP(inv.total_cop)}
                      </span>
                    </td>

                    {/* Estado: Badge Redondeado con Pulso Neón */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-cyan-950/50 text-cyan-300 border border-cyan-500/30 shadow-[0_0_8px_rgba(0,229,255,0.15)]">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
                        {inv.dian_status || 'INTERNA'}
                      </span>
                    </td>

                    {/* Acciones: Botón Estilizado Tipo Píldora */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <button
                        onClick={() => handleOpenInvoiceDetail(inv.id)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-cyan-500/15 to-blue-500/15 hover:from-cyan-500/30 hover:to-blue-500/30 text-cyan-300 hover:text-white border border-cyan-500/30 hover:border-cyan-400 shadow-sm hover:shadow-[0_0_15px_rgba(0,229,255,0.3)] transition-all duration-200 cursor-pointer"
                        title="Ver e Imprimir Factura Oficial"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Ver Factura</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Barra de Estado Inferior de la Tabla */}
        {!isLoading && invoices.length > 0 && (
          <div className="px-5 py-3 border-t border-slate-800/80 bg-slate-950/60 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 font-mono">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span>{invoices.length} facturas comerciales listadas</span>
            </div>
            <div className="mt-1 sm:mt-0 text-slate-500 text-[11px]">
              MEVACOL S.A.S. • Facturación Comercial y Tributaria
            </div>
          </div>
        )}
      </div>

      {/* Modal de Visualización e Impresión de Factura */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
          <div className="relative w-full max-w-4xl max-h-[92vh] overflow-y-auto">
            <InvoiceDocument
              invoice={selectedInvoice}
              onClose={() => setSelectedInvoice(null)}
              showCloseButton={true}
            />
          </div>
        </div>
      )}
    </div>
  );
};
