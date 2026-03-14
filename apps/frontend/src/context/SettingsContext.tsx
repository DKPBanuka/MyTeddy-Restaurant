import React, { createContext, useContext } from 'react';
import type { ReactNode } from 'react';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

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
}

interface SettingsContextType {
  settings: RestaurantSettings | undefined;
  isLoading: boolean;
  updateSettings: (dto: Partial<RestaurantSettings>) => Promise<any>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

const API_BASE_URL = 'http://localhost:3000'; // Assuming API Gateway base

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery<RestaurantSettings>({
    queryKey: ['settings'],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE_URL}/settings`);
      return response.data;
    },
  });

  const mutation = useMutation({
    mutationFn: async (dto: Partial<RestaurantSettings>) => {
      const response = await axios.patch(`${API_BASE_URL}/settings`, dto);
      return response.data;
    },
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
