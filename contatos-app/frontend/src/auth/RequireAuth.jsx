import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext.jsx';

/** Guarda de rota no cliente (UX). A autorização REAL é sempre reforçada no backend. */
export default function RequireAuth({ roles, children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="text-center mt-5"><div className="spinner-border" role="status" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}
