import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { ROLES } from '../constants/roles';
import { AuthContext } from '../features/auth/AuthContext';
import ProtectedRoute from './ProtectedRoute';
import PublicRoute from './PublicRoute';

const renderAt = (path, role) =>
  render(
    <AuthContext.Provider value={{ isAuthenticated: !!role, role: role ?? null }}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route element={<PublicRoute />}>
            <Route path="/login" element={<p>login sahifasi</p>} />
          </Route>
          <Route element={<ProtectedRoute allowedRoles={[ROLES.SUPERADMIN]} />}>
            <Route path="/superadmin" element={<p>superadmin paneli</p>} />
          </Route>
          <Route element={<ProtectedRoute allowedRoles={[ROLES.OPERATOR]} />}>
            <Route path="/operator" element={<p>operator paneli</p>} />
          </Route>
          <Route element={<ProtectedRoute allowedRoles={[ROLES.TAILOR]} />}>
            <Route path="/tailor" element={<p>tikuv sexi paneli</p>} />
          </Route>
          <Route path="/" element={<p>bosh sahifa</p>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  );

describe('ProtectedRoute', () => {
  it('login qilmagan foydalanuvchi — /login ga', () => {
    renderAt('/superadmin', null);
    expect(screen.getByText('login sahifasi')).toBeInTheDocument();
  });

  it('roli mos — sahifa ochiladi', () => {
    renderAt('/operator', ROLES.OPERATOR);
    expect(screen.getByText('operator paneli')).toBeInTheDocument();
  });

  it.each([
    [ROLES.OPERATOR, '/superadmin', 'operator paneli'],
    [ROLES.TAILOR, '/superadmin', 'tikuv sexi paneli'],
    [ROLES.SUPERADMIN, '/tailor', 'superadmin paneli'],
  ])('%s %s ga kirsa — o‘z paneliga qaytariladi', (role, path, expected) => {
    renderAt(path, role);
    expect(screen.getAllByText(/paneli$/).map((el) => el.textContent)).toEqual([expected]);
  });

  it('panelda o‘rni yo‘q rol (USER) — begona panel ko‘rsatilmaydi', () => {
    // /login ham uni qaytaradi; muhimi — himoyalangan sahifa hech qachon chizilmaydi
    renderAt('/superadmin', 'USER');
    expect(screen.queryByText('superadmin paneli')).not.toBeInTheDocument();
  });
});

describe('PublicRoute', () => {
  it('login qilmagan — login sahifasi ko‘rinadi', () => {
    renderAt('/login', null);
    expect(screen.getByText('login sahifasi')).toBeInTheDocument();
  });

  it('login qilgan foydalanuvchi /login ga kirsa — o‘z paneliga', () => {
    renderAt('/login', ROLES.TAILOR);
    expect(screen.getByText('tikuv sexi paneli')).toBeInTheDocument();
  });
});
