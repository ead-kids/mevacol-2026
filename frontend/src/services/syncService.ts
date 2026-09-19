/**
 * syncService.ts — Servicio de Sincronización Offline → Online
 *
 * Procesa la cola de operaciones pendientes (localDb.offlineQueue) y las envía
 * al backend cuando se recupera la conexión a Internet.
 *
 * Garantías implementadas:
 * - Anti-duplicación: cada item tiene un ID UUID generado en el cliente; si el
 *   backend ya tiene ese registro, el error se captura y se marca como synced.
 * - No destructivo: los items fallidos NO se eliminan, solo se registra el error.
 * - Transaccional por item: un fallo no detiene la sincronización de los demás.
 */

import { localDb } from '../db/localDb';
import { api } from './api';

export interface SyncResult {
  processed: number;
  succeeded: number;
  failed: number;
  errors: { id: string; entity: string; action: string; error: string }[];
}

/**
 * Procesa todos los items pendientes de la cola offline y los sincroniza con el backend.
 * Retorna un resumen del resultado de la sincronización.
 */
export async function syncOfflineQueue(): Promise<SyncResult> {
  const result: SyncResult = { processed: 0, succeeded: 0, failed: 0, errors: [] };

  // Obtener todos los items NO sincronizados, ordenados por timestamp (más antiguos primero)
  let pendingItems: any[] = [];
  try {
    pendingItems = await localDb.offlineQueue
      .where('synced')
      .equals(0 as any)
      .sortBy('timestamp');
  } catch {
    // Si IndexedDB falla (modo privado, etc.) simplemente retornar sin procesar
    return result;
  }

  if (pendingItems.length === 0) return result;

  for (const item of pendingItems) {
    result.processed++;
    try {
      await processQueueItem(item);
      // Marcar como sincronizado
      await localDb.offlineQueue.update(item.id, { synced: true });
      result.succeeded++;
    } catch (err: any) {
      const errorMsg = err?.message || 'Error desconocido';

      // Registrar el error en el item para diagnóstico, pero NO eliminarlo
      try {
        await localDb.offlineQueue.update(item.id, { errorMessage: errorMsg });
      } catch {
        // Si la actualización falla, continuar de todos modos
      }

      result.failed++;
      result.errors.push({
        id: item.id,
        entity: item.entity,
        action: item.action,
        error: errorMsg,
      });
    }
  }

  return result;
}

/**
 * Procesa un único item de la cola según su entidad y acción.
 * Lanza un error si el procesamiento falla.
 */
async function processQueueItem(item: any): Promise<void> {
  const { entity, action, data } = item;

  // ─── Clientes ───────────────────────────────────────────────────────────────
  if (entity === 'customer') {
    if (action === 'create') {
      try {
        await api.createCustomer(data);
      } catch (err: any) {
        // Si ya existe (conflicto de unicidad), consideramos la sincronización exitosa
        if (isConflictError(err)) return;
        throw err;
      }
      // Actualizar caché local para marcar como sincronizado
      try {
        await localDb.cachedCustomers.update(data.id, { synced: true });
      } catch {
        // El caché local puede no tener el registro; no es error crítico
      }
      return;
    }

    if (action === 'update') {
      await api.updateCustomer(data.id, data);
      return;
    }
  }

  // ─── Ventas ─────────────────────────────────────────────────────────────────
  if (entity === 'sale') {
    if (action === 'create') {
      try {
        await api.createSale(data);
      } catch (err: any) {
        if (isConflictError(err)) return;
        throw err;
      }
      try {
        await localDb.cachedSales.update(data.id, { synced: true });
      } catch {
        // Ignorar si no existe en caché
      }
      return;
    }
  }

  // ─── Entregas ────────────────────────────────────────────────────────────────
  if (entity === 'delivery') {
    if (action === 'update') {
      // Actualización de estado de entrega
      await api.updateDeliveryStatus(data.id, { status: data.status, notes: data.notes });
      return;
    }
  }

  // ─── Ubicaciones ─────────────────────────────────────────────────────────────
  // Las actualizaciones de ubicación no tienen endpoint dedicado; se descartan silenciosamente
  if (entity === 'location') {
    return;
  }

  // Si la entidad/acción no está manejada, lanzar error para que quede en el log
  throw new Error(`Tipo de sincronización no manejado: entity="${entity}", action="${action}"`);
}

/**
 * Determina si un error es de conflicto (registro ya existe en el servidor).
 * Esto evita duplicaciones cuando el backend ya tiene el dato.
 */
function isConflictError(err: any): boolean {
  const msg: string = err?.message?.toLowerCase() ?? '';
  return (
    msg.includes('already exists') ||
    msg.includes('ya existe') ||
    msg.includes('duplicate') ||
    msg.includes('unique') ||
    msg.includes('conflict') ||
    err?.status === 409 ||
    err?.statusCode === 409
  );
}
