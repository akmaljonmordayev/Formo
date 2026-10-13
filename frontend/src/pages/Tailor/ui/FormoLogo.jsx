import logoImg from '../assets/formo.png';

export default function FormoLogo({ className = '' }) {
  return (
    <div className={`flex min-w-0 items-center gap-3 ${className}`}>
      <div className="relative h-24 w-24 shrink-0 overflow-hidden">
        <img
          src={logoImg}
          alt="Formo"
          className="absolute  h-full w-100% object-cover"

          style={{ mixBlendMode: 'lighten', filter: 'contrast(1.2) brightness(1.15),' }}
        />
      </div>
      <div className="min-w-0">
        <p className="truncate text-[25px] font-black leading-tight tracking-wide text-white">Formo</p>
        <p className="truncate text-[21px] font-semibold leading-tight text-slate-400">tikuv sex</p>
      </div>
    </div>
  );
}
