import { MessagesSquare, Send } from 'lucide-react';
import { Card } from './ui';
import { useT } from './i18n';

export default function Chat() {
  const t = useT();

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-black text-white">{t('chat.title')}</h2>
        <p className="mt-1 text-xs font-medium text-slate-400">{t('chat.subtitle')}</p>
      </div>

      <Card className="grid min-h-[min(70vh,640px)] overflow-hidden border border-white/10 bg-[#121829] xl:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="border-b border-white/10 bg-[#0e1424] p-5 xl:border-b-0 xl:border-r">
          <h3 className="text-sm font-extrabold text-white">{t('chat.title')}</h3>
          <p className="mt-2 text-xs leading-5 text-slate-400">{t('chat.backendMissing')}</p>
        </aside>

        <section className="flex min-w-0 flex-col">
          <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-500/10 text-teal-400">
              <MessagesSquare size={25} aria-hidden="true" />
            </span>
            <h3 className="mt-4 text-base font-extrabold text-white">{t('chat.unavailable')}</h3>
            <p className="mt-2 max-w-lg text-xs leading-5 text-slate-400">{t('chat.backendMissing')}</p>
          </div>
          <form className="flex items-center gap-2 border-t border-white/10 bg-[#0e1424] p-3" onSubmit={(event) => event.preventDefault()}>
            <input
              type="text"
              className="min-w-0 flex-1 rounded-xl border border-white/10 bg-[#121829] px-4 py-2.5 text-xs text-white placeholder-slate-500"
              placeholder={t('chat.placeholder')}
              disabled
              aria-label={t('chat.placeholder')}
            />
            <button
              type="submit"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-400 text-slate-950 opacity-50"
              disabled
              aria-label={t('chat.send')}
              title={t('chat.backendMissing')}
            >
              <Send size={15} aria-hidden="true" />
            </button>
          </form>
        </section>
      </Card>
    </div>
  );
}
