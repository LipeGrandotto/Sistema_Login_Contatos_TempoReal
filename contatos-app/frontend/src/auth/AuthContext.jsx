import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, csrf, setUnauthorizedHandler } from '../api.js';
import { disconnectEcho } from '../echo.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/me')
      .then((r) => setUser(r.data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  // Sessão expirada/revogada em qualquer chamada -> volta para o login
  useEffect(() => {
    setUnauthorizedHandler(() => { disconnectEcho(); setUser(null); });
  }, []);

  const login = useCallback(async (email, password) => {
    await csrf(); // obtém o cookie XSRF-TOKEN
    const { data } = await api.post('/login', { email, password });
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    try { await api.post('/logout'); } finally {
      disconnectEcho();
      setUser(null);
    }
  }, []);

  const value = useMemo(() => ({ user, loading, login, logout }), [user, loading, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
