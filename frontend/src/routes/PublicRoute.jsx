import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { ROLE_HOME } from '../constants/roles';

// Login qilgan foydalanuvchi /login ga kirsa, o'z dashboardiga qaytariladi
export default function PublicRoute() {
  const { isAuthenticated, role } = useAuth();

  if (isAuthenticated && ROLE_HOME[role]) return <Navigate to={ROLE_HOME[role]} replace />;

  return <Outlet />;
}
