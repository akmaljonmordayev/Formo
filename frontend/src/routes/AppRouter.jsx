import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ROLES } from '../constants/roles';
import ProtectedRoute from './ProtectedRoute';
import PublicRoute from './PublicRoute';
import DashboardLayout from '../components/layout/DashboardLayout';
import Login from '../pages/Login';
import NotFound from '../pages/NotFound';
import { superadminLayout, superadminMenu, superadminRoutes } from '../pages/Superadmin/routes';
import { tailorMenu, tailorRoutes } from '../pages/Tailor/routes';

const roleSections = [
  {
    role: ROLES.SUPERADMIN,
    basePath: '/superadmin',
    menu: superadminMenu,
    routes: superadminRoutes,
    layout: superadminLayout,
  },
  { role: ROLES.TAILOR, basePath: '/tailor', menu: tailorMenu, routes: tailorRoutes },
];

export default function AppRouter() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route element={<PublicRoute />}>
          <Route path="/login" element={<Login />} />
        </Route>

        {/* "/" -> /login, PublicRoute esa login qilganlarni o'z dashboardiga yuboradi */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        {roleSections.map(({ role, basePath, menu, routes, layout: Layout = DashboardLayout }) => (
          <Route key={role} element={<ProtectedRoute allowedRoles={[role]} />}>
            <Route path={basePath} element={<Layout menu={menu} />}>
              {routes.map(({ path, element }) =>
                path ? (
                  <Route key={path} path={path} element={element} />
                ) : (
                  <Route key="index" index element={element} />
                )
              )}
            </Route>
          </Route>
        ))}

        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
