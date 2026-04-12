import Dexie, { type Table } from 'dexie';

export interface LocalOrder {
    id: string; // The UUID generated on frontend
    sync_status: 'pending' | 'synced';
    data: any; // Using any to prevent circular reference type errors with DTOs
    createdAt: number;
}

export class POSDatabase extends Dexie {
    orders!: Table<LocalOrder>;

    constructor() {
        super('POSDatabase');
        this.version(1).stores({
            orders: 'id, sync_status, createdAt' // Primary key is id, index sync_status and createdAt
        });
    }
}

export const db = new POSDatabase();
