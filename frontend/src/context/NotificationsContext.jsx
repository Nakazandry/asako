import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import { useAuth } from './AuthContext.jsx';

const NotificationsContext = createContext(null);

export const NotificationsProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [unread, setUnread] = useState(0);

  const refresh = useCallback(() => {
    if (!isAuthenticated) {
      setUnread(0);
      return Promise.resolve();
    }
    return api
      .get('/notifications/unread-count')
      .then((res) => setUnread(res.data.count || 0))
      .catch(() => {});
  }, [isAuthenticated]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 20000);
    return () => clearInterval(interval);
  }, [refresh]);

  const value = useMemo(() => ({ unread, refresh }), [unread, refresh]);

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
};

export const useNotifications = () => useContext(NotificationsContext);
