import { create } from 'zustand';
import api from '../api/client';

interface User {
  id: string;
  name: string;
  email: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    set({ user: data.data, isAuthenticated: true });
  },

  register: async (name, email, password) => {
    const { data } = await api.post('/auth/register', { name, email, password });
    set({ user: data.data, isAuthenticated: true });
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // ignore
    }
    set({ user: null, isAuthenticated: false });
  },

  checkAuth: async () => {
    try {
      const { data } = await api.get('/auth/me');
      set({ user: data.data, isAuthenticated: true, isLoading: false });
    } catch {
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },
}));
