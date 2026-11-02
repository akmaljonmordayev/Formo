import { Link } from 'react-router-dom';
import logoImg from '../Tailor/assets/formologo.png';

const styles = `
.nf { min-height: 100vh; display: grid; place-items: center; padding: 24px; text-align: center;
  background: radial-gradient(700px 500px at 20% 10%, rgba(29,47,140,.35), transparent 70%),
    radial-gradient(600px 400px at 85% 95%, rgba(242,163,58,.14), transparent 70%), var(--ink, #080c24);
  color: var(--paper, #f3f5f9); font-family: var(--font-body, system-ui, sans-serif); }
.nf__card { width: 100%; max-width: 420px; }
.nf__logo { width: 120px; height: auto; margin: 0 auto 28px; display: block; mix-blend-mode: screen; }
.nf__code { margin: 0; font-family: var(--font-display, system-ui, sans-serif); font-weight: 800;
  font-size: clamp(72px, 22vw, 120px); line-height: 1; letter-spacing: .04em;
  background: linear-gradient(100deg, var(--paper, #f3f5f9) 40%, var(--orange, #f2a33a));
  -webkit-background-clip: text; background-clip: text; color: transparent; }
.nf__text { margin: 12px 0 28px; color: var(--muted, #a9b0d0); font-size: 16px; }
.nf__btn { display: inline-block; padding: 12px 28px; border-radius: 12px; font-weight: 600; text-decoration: none;
  background: var(--orange, #f2a33a); color: var(--ink, #080c24); transition: transform .2s ease, opacity .2s ease; }
.nf__btn:hover { transform: translateY(-1px); opacity: .92; }
.nf__btn:focus-visible { outline: 2px solid var(--paper, #f3f5f9); outline-offset: 3px; }
`;

export default function NotFound() {
  return (
    <main className="nf">
      <style>{styles}</style>
      <div className="nf__card">
        <img className="nf__logo" src={logoImg} alt="Formo" />
        <h1 className="nf__code">404</h1>
        <p className="nf__text">Sahifa topilmadi</p>
        <Link className="nf__btn" to="/">
          Bosh sahifaga qaytish
        </Link>
      </div>
    </main>
  );
}
