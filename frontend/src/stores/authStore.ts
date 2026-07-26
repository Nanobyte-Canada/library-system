import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { LoginResponse, UserRole } from '@/types';

interface AuthState {
  token: string | null;
  user: LoginResponse | null;
  isAuthenticated: boolean;
  login: (token: string, user: LoginResponse) => void;
  logout: () => void;
  hasRole: (...roles: UserRole[]) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      isAuthenticated: false,

      login: (token: string, user: LoginResponse) => {
        localStorage.setItem('token', token);
        set({ token, user, isAuthenticated: true });
      },

      logout: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        set({ token: null, user: null, isAuthenticated: false });
      },

      hasRole: (...roles: UserRole[]) => {
        const user = get().user;
        if (!user?.role) return false;
        return roles.includes(user.role as UserRole);
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
