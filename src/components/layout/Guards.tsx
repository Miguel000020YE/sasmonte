import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { FullPageSpinner } from '@/components/ui/spinner';
import { useAuth } from '@/context/AuthContext';

/** Pages réservées aux utilisateurs connectés. */
export function ProtectedRoute() {
  const { session, loading } = useAuth();
  const location = useLocation();
  if (loading) return <FullPageSpinner />;
  if (!session) return <Navigate to="/connexion" state={{ from: location.pathname }} replace />;
  return <Outlet />;
}

/**
 * Pages admin. Ce garde ne sert qu'à l'affichage : l'accès réel aux données est protégé côté serveur
 * (policies RLS basées sur has_role et Edge Functions avec requireAdmin).
 */
export function AdminRoute() {
  const { isAdmin, loading } = useAuth();
  if (loading) return <FullPageSpinner />;
  if (!isAdmin) return <Navigate to="/studio" replace />;
  return <Outlet />;
}

/** Connexion / inscription : renvoie vers le Studio si déjà connecté. */
export function PublicOnly() {
  const { session, loading } = useAuth();
  if (loading) return <FullPageSpinner />;
  if (session) return <Navigate to="/studio" replace />;
  return <Outlet />;
}
