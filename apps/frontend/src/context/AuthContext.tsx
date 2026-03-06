import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api';
import { Role } from '../types';

export interface User {
    id: string;
    name: string;
    role: Role;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    login: (pin: string) => Promise<void>;
    logout: () => void;
    isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);

    useEffect(() => {
        // Check local storage on mount
        const storedToken = localStorage.getItem('pos_token');
        const storedUser = localStorage.getItem('pos_user');

        if (storedToken && storedUser) {
            setToken(storedToken);
            setUser(JSON.parse(storedUser));
            // Optionally set axios header here
            api.setAuthToken(storedToken);
        }
    }, []);

    const login = async (pin: string) => {
        try {
            const response = await api.login(pin);
            const { access_token, user: loggedInUser } = response;

            setToken(access_token);
            setUser(loggedInUser);

            localStorage.setItem('pos_token', access_token);
            localStorage.setItem('pos_user', JSON.stringify(loggedInUser));

            api.setAuthToken(access_token);
        } catch (error) {
            throw error;
        }
    };

    const logout = () => {
        setToken(null);
        setUser(null);
        localStorage.removeItem('pos_token');
        localStorage.removeItem('pos_user');
        api.setAuthToken(null);
    };

    return (
        <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated: !!token }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
