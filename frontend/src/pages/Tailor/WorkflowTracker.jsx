import { Check } from 'lucide-react';
import { useT } from './i18n';

export default function WorkflowTracker({ stage = 0, status = 'qabul' }) {
  const t = useT();
  const isBosildi = status === 'bosildi' || stage >= 2;
  const isTayyor = status === 'tayyor' || stage >= 3;

  const steps = [
    { id: 'qabul', label: t('wf.accepted'), done: true },
    { id: 'tayyorlandi', label: t('wf.prepared'), done: true },
    { id: 'bosish', label: t('wf.printing'), active: isBosildi && !isTayyor, done: isTayyor },
    { id: 'tayyor', label: t('wf.ready'), done: isTayyor },
  ];

  return (
    <div className="relative flex items-center justify-between py-2">
      {/* Connecting Line */}
      <div className="absolute left-6 right-6 top-1/2 h-0.5 -translate-y-1/2 bg-white/10 z-0" />

      {steps.map((step) => {
        return (
          <div key={step.id} className="relative z-10 flex flex-col items-center gap-2">
            {step.done ? (
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-teal-400 text-slate-950 font-black shadow-md">
                <Check className="h-4 w-4 stroke-[3]" />
              </div>
            ) : step.active ? (
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 ring-4 ring-blue-600/30">
                <div className="h-2 w-2 rounded-full bg-white animate-ping" />
              </div>
            ) : (
              <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white/20 bg-[#0e1424]">
                <div className="h-1.5 w-1.5 rounded-full bg-white/30" />
              </div>
            )}

            <span className="text-[11px] font-bold text-slate-300">{step.label}</span>
          </div>
        );
      })}
    </div>
  );
}
