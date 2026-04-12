import { useEffect, useState, useCallback } from 'react';
import { db } from '../db/db';
import { api } from '../api';
import { toast } from 'sonner';

export function useSyncManager() {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [isSyncing, setIsSyncing] = useState(false);

    const syncPendingOrders = useCallback(async () => {
        if (!navigator.onLine || isSyncing) return;

        const pendingOrders = await db.orders
            .where('sync_status')
            .equals('pending')
            .toArray();

        if (pendingOrders.length === 0) return;

        setIsSyncing(true);
        console.log(`Starting sync for ${pendingOrders.length} pending orders...`);

        for (const order of pendingOrders) {
            try {
                await api.createOrder(order.data as any);
                await db.orders.update(order.id, { sync_status: 'synced' });
                console.log(`Order ${order.id} synced successfully.`);
            } catch (error) {
                console.error(`Failed to sync order ${order.id}:`, error);
                // We keep it as pending to try again later
            }
        }

        setIsSyncing(false);
    }, [isSyncing]);

    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            toast.info('Back online! Syncing pending orders...');
            syncPendingOrders();
        };

        const handleOffline = () => {
            setIsOnline(false);
            toast.warning('Working offline. Orders will be saved locally.');
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Initial sync attempt if online
        if (navigator.onLine) {
            syncPendingOrders();
        }

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [syncPendingOrders]);

    return { isOnline, isSyncing, syncPendingOrders };
}
