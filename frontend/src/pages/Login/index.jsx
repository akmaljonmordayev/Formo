import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { ROLE_HOME } from '../../constants/roles';
import Jersey, { KITS } from './Jersey';
import './Login.css';

// "90 123 45 67" ko'rinishida formatlash (faqat 9 ta raqam)
function formatPhone(digits) {
  const d = digits.slice(0, 9);
  return [d.slice(0, 2), d.slice(2, 5), d.slice(5, 7), d.slice(7, 9)].filter(Boolean).join(' ');
}

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// Superadmin, Operator va Tikuv sexi uchun bitta umumiy login sahifasi.
// Rol backend javobidan aniqlanadi va foydalanuvchi o'z paneliga yo'naltiriladi.
export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [digits, setDigits] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [error, setError] = useState('');
  const [shaking, setShaking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [kitIndex, setKitIndex] = useState(0);
  const [autoKit, setAutoKit] = useState(() => !prefersReducedMotion());
  const [welcomeName, setWelcomeName] = useState('');
  const phoneRef = useRef(null);

  // Formalar o'z-o'zidan almashib turadi, foydalanuvchi tanlasa to'xtaydi
  useEffect(() => {
    if (!autoKit) return undefined;
    const t = setInterval(() => setKitIndex((i) => (i + 1) % KITS.length), 3600);
    return () => clearInterval(t);
  }, [autoKit]);

  useEffect(() => {
    phoneRef.current?.focus();
  }, []);

  const fail = () => {
    setShaking(false);
    requestAnimationFrame(() => setShaking(true));
  };

  const number = digits.length >= 2 ? digits.slice(-2) : '10';
  const phoneComplete = digits.length === 9;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    if (!phoneComplete) {
      setError("Telefon raqamni to'liq kiriting");
      fail();
      return;
    }

    setError('');
    setLoading(true);
    try {
      const user = await login(
        { phone: `+998${digits}`, password },
        {
          delayMs: prefersReducedMotion() ? 0 : 1100,
          onSuccess: (u) => {
            setWelcomeName((u.fullName || 'FORMO').split(' ')[0].toUpperCase().slice(0, 10));
            setPasswordFocused(false);
          },
        },
      );
      navigate(ROLE_HOME[user.role], { replace: true });
    } catch (err) {
      setError(err.message);
      fail();
      setLoading(false);
    }
  };

  const kit = KITS[kitIndex];

  return (
    <div className="login" style={{ '--kit-a': kit.from, '--kit-b': kit.to }}>
      <section className="login__stage" aria-hidden="true">
        <svg className="login__pitch" viewBox="0 0 600 800" preserveAspectRatio="xMidYMid slice">
          <g fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="40" y="40" width="520" height="720" rx="4" />
            <line x1="40" y1="400" x2="560" y2="400" />
            <circle cx="300" cy="400" r="90" />
            <circle cx="300" cy="400" r="4" fill="currentColor" />
            <rect x="170" y="40" width="260" height="110" />
            <rect x="170" y="650" width="260" height="110" />
          </g>
        </svg>

        <div className="login__brand">
          <span className="login__logo">FORMO</span>
          <span className="login__badge">ish paneli</span>
        </div>

        <div className="login__jersey-wrap">
          <Jersey
            kit={kit}
            name={welcomeName || 'FORMO'}
            number={number}
            flipped={passwordFocused && !showPassword && !welcomeName}
            error={!!error && !loading}
          />
          <div className="login__kits" role="radiogroup" aria-label="Forma rangi">
            {KITS.map((k, i) => (
              <button
                key={k.id}
                type="button"
                tabIndex={-1}
                className={`login__swatch${i === kitIndex ? ' login__swatch--active' : ''}`}
                style={{ background: `linear-gradient(135deg, ${k.from}, ${k.to})`, '--trim': k.trim }}
                onClick={() => {
                  setAutoKit(false);
                  setKitIndex(i);
                }}
                title={k.name}
              />
            ))}
            <span className="login__kit-name">{kit.name}</span>
          </div>
        </div>

        <p className="login__tagline">
          Har bir forma — <em>bitta jamoa</em> hikoyasi.
        </p>
        <div className="login__ghost">FORMO</div>
      </section>

      <section className="login__side">
        <form
          className={`tag${shaking ? ' tag--shake' : ''}${welcomeName ? ' tag--success' : ''}`}
          onAnimationEnd={(e) => e.target === e.currentTarget && setShaking(false)}
          onSubmit={handleSubmit}
          noValidate
        >
          <div className="tag__string" aria-hidden="true" />
          <div className="tag__hole" aria-hidden="true" />

          <div className="tag__meta">
            <span>FORMO · PANEL</span>
            <span>№ 0001</span>
          </div>

          <h1 className="tag__title">
            {welcomeName ? (
              <>
                Xush kelibsiz,
                <br />
                <span>{welcomeName}</span>
              </>
            ) : (
              <>
                Kiyinish
                <br />
                <span>xonasiga</span> kirish
              </>
            )}
          </h1>
          <p className="tag__subtitle">Superadmin, operator va tikuv sexlari uchun</p>

          <label className="tag__field">
            <span className="tag__label">Telefon raqam</span>
            <span className={`tag__input tag__input--phone${phoneComplete ? ' is-complete' : ''}`}>
              <span className="tag__prefix">+998</span>
              <input
                ref={phoneRef}
                type="tel"
                inputMode="numeric"
                autoComplete="username"
                placeholder="90 123 45 67"
                value={formatPhone(digits)}
                onChange={(e) => {
                  let d = e.target.value.replace(/\D/g, '');
                  // to'liq raqam joylashtirilsa (+998 bilan) prefiksni olib tashlaymiz
                  if (d.length > 9 && d.startsWith('998')) d = d.slice(3);
                  setDigits(d.slice(0, 9));
                  setError('');
                }}
                aria-invalid={!!error}
                aria-describedby={error ? 'login-error' : undefined}
                required
              />
              {phoneComplete && <span className="tag__check" aria-hidden="true">✓</span>}
            </span>
          </label>

          <label className="tag__field">
            <span className="tag__label">Parol</span>
            <span className="tag__input">
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => setPasswordFocused(false)}
                aria-invalid={!!error}
                required
              />
              <button
                type="button"
                className="tag__eye"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Parolni yashirish' : "Parolni ko'rsatish"}
                aria-pressed={showPassword}
              >
                {showPassword ? 'Yashirish' : "Ko'rsatish"}
              </button>
            </span>
          </label>

          <div className="tag__error" id="login-error" role="alert" aria-live="assertive">
            {error}
          </div>

          <button type="submit" className="tag__submit" disabled={loading || !password}>
            <span>{welcomeName ? 'Maydonga chiqilmoqda' : loading ? 'Tekshirilmoqda' : 'Kirish'}</span>
            <span className="tag__arrow" aria-hidden="true">
              →
            </span>
          </button>

          <div className="tag__care">
            <span className="tag__care-icons" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path d="M3 7 L5 18 H19 L21 7" />
                <path d="M3 7 Q7.5 10 12 7 Q16.5 4 21 7" />
              </svg>
              <svg viewBox="0 0 24 24">
                <path d="M12 4 L21 19 H3 Z" />
              </svg>
              <svg viewBox="0 0 24 24">
                <path d="M4 17 H20 L18 10 H9 Q5 10 4 17 Z" />
                <circle cx="13" cy="14" r="1" />
              </svg>
            </span>
            <span>Akkauntlarni faqat superadmin ochib beradi</span>
          </div>
        </form>
      </section>
    </div>
  );
}
