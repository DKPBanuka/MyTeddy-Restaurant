import React, { createContext, useContext, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useSocket } from './SocketContext';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';

export interface RestaurantSettings {
  id: string;
  restaurantName: string;
  address: string;
  phone: string;
  logoUrl?: string;
  currencySymbol: string;
  taxRate: number;
  serviceCharge: number;
  packagingCharge: number;
  receiptFooter?: string;
  qrCodeUrl?: string;
  wifiPassword?: string;
  partyExclusiveCharge: number;
  partyAdvancePercentage: number;
}

interface SettingsContextType {
  settings: RestaurantSettings | undefined;
  isLoading: boolean;
  updateSettings: (dto: Partial<RestaurantSettings>) => Promise<any>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery<RestaurantSettings>({
    queryKey: ['settings'],
    queryFn: () => api.getSettings(),
  });

  const { socket } = useSocket();

  useEffect(() => {
    if (!socket) return;

    const handleUpdate = () => {
      console.log('Real-time: Settings updated, invalidating query...');
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    };

    socket.on('SETTING_UPDATED', handleUpdate);

    return () => {
      socket.off('SETTING_UPDATED', handleUpdate);
    };
  }, [socket, queryClient]);

  const mutation = useMutation({
    mutationFn: (dto: Partial<RestaurantSettings>) => api.updateSettings(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
  });

  const updateSettings = async (dto: Partial<RestaurantSettings>) => {
    return mutation.mutateAsync(dto);
  };

  return (
    <SettingsContext.Provider value={{ settings, isLoading, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
