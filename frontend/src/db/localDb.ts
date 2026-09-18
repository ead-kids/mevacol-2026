import Dexie, { type Table } from 'dexie';
import type { OfflineQueueItem } from '../types';

export interface LocalCustomer {
  id: string;
  id_number: string;
  name: string;
  phone?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  synced: boolean;
}

export interface LocalProduct {
  id: string;
  code: string;
  name: string;
  price_cop: number;
  current_stock: number;
}

export interface LocalSale {
  id: string;
  invoice_number?: string;
  customer_id?: string;
  seller_user_id: string;
  status: 'ABIERTA' | 'FINALIZADA';
  total_cop: number;
  items_count: number;
  created_at: string;
  synced: boolean;
}

export class MevacolLocalDatabase extends Dexie {
  offlineQueue!: Table<OfflineQueueItem, string>;
  cachedCustomers!: Table<LocalCustomer, string>;
  cachedProducts!: Table<LocalProduct, string>;
  cachedSales!: Table<LocalSale, string>;

  constructor() {
    super('MevacolLocalDB');
    this.version(1).stores({
      offlineQueue: 'id, entity, action, timestamp, synced',
      cachedCustomers: 'id, id_number, name, synced',
      cachedProducts: 'id, code, name',
      cachedSales: 'id, customer_id, seller_user_id, status, synced',
    });
  }
}

export const localDb = new MevacolLocalDatabase();
