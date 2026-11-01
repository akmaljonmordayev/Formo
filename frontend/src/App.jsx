import { Component } from 'react';
import { AuthProvider } from './features/auth/AuthContext';
import AppRouter from './routes/AppRouter';

// Render xatosi (masalan, kutilmagan API ma'lumoti) butun ilovani oq ekranga aylantirmasin
class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('UI xatosi:', error, info?.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ textAlign: 'center', maxWidth: 420 }}>
          <h1 style={{ fontSize: 20, marginBottom: 8 }}>Kutilmagan xatolik yuz berdi</h1>
          <p style={{ opacity: 0.7, marginBottom: 16 }}>Sahifani qayta yuklang. Muammo takrorlansa, administratorga xabar bering.</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{ padding: '10px 18px', borderRadius: 10, border: 0, background: '#F2A33A', color: '#080C24', fontWeight: 700, cursor: 'pointer' }}
          >
            Qayta yuklash
          </button>
        </div>
      </div>
    );
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppRouter />
      </AuthProvider>
    </ErrorBoundary>
  );
}
