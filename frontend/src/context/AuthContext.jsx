import { createContext, useContext, useMemo, useState } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem('asako_token'));
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('asako_user');
    return raw ? JSON.parse(raw) : null;
  });

  const persist = (payload) => {
    localStorage.setItem('asako_token', payload.token);
    localStorage.setItem('asako_user', JSON.stringify(payload.user));
    setToken(payload.token);
    setUser(payload.user);
  };

  const login = async (credentials) => {
    const { data } = await api.post('/auth/login', credentials);
    persist(data);
    return data.user;
  };

  const register = async (values) => {
    const { data } = await api.post('/auth/register', values);
    persist(data);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem('asako_token');
    localStorage.removeItem('asako_user');
    setToken(null);
    setUser(null);
  };

  const value = useMemo(() => ({ token, user, isAuthenticated: Boolean(token), login, register, logout }), [token, user]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
