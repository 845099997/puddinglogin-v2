import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import Icon from '../components/Icon';

export function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ');
}

type ToastKind = 'success' | 'error' | 'info';
type ToastItem = { id: number; kind: ToastKind; text: string };

const ToastCtx = createContext<{ push: (kind: ToastKind, text: string) => void }>({
  push: () => {},
});

export function useToast() {
  return useContext(ToastCtx);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const seq = useRef(0);

  const push = useCallback((kind: ToastKind, text: string) => {
    seq.current += 1;
    const id = seq.current;
    setItems((prev) => [...prev, { id, kind, text }]);
    window.setTimeout(() => {
      setItems((prev) => prev.filter((t) => t.id !== id));
    }, 3600);
  }, []);

  const value = useMemo(() => ({ push }), [push]);

  return (
    <ToastCtx.Provider value={value}>
      {children}
      <div className='pointer-events-none fixed inset-x-0 top-4 z-[90] flex flex-col items-center gap-2 px-4'>
        {items.map((t) => (
          <div
            key={t.id}
            className={cx(
              'pointer-events-auto flex max-w-md items-center gap-2.5 rounded-2xl border px-4 py-3 text-sm shadow-card backdrop-blur-xl animate-fade-up',
              t.kind === 'success' && 'border-mint/30 bg-mint/12 text-mint',
              t.kind === 'error' && 'border-red-400/30 bg-red-500/12 text-red-200',
              t.kind === 'info' && 'border-white/15 bg-white/10 text-cream/90'
            )}
          >
            <Icon name={t.kind === 'success' ? 'check' : t.kind === 'error' ? 'close' : 'sparkle'} size={16} />
            <span className='leading-snug'>{t.text}</span>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  width = 'max-w-lg',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className='fixed inset-0 z-[80] flex items-end justify-center bg-ink-950/70 p-0 backdrop-blur-sm sm:items-center sm:p-6'>
      <div
        className={cx('absolute inset-0', 'cursor-default')}
        onClick={onClose}
        aria-hidden='true'
      />
      <div
        className={cx(
          'relative w-full animate-fade-up overflow-hidden rounded-t-3xl border border-white/10 bg-ink-850/95 shadow-card sm:rounded-3xl',
          width
        )}
      >
        <div className='flex items-start justify-between gap-4 border-b border-white/8 px-6 py-5'>
          <div>
            <h3 className='text-lg font-semibold text-cream'>{title}</h3>
            {subtitle ? <p className='mt-1 text-sm text-white/45'>{subtitle}</p> : null}
          </div>
          <button
            type='button'
            onClick={onClose}
            className='rounded-xl border border-white/10 bg-white/5 p-2 text-white/60 transition hover:bg-white/10 hover:text-white'
            aria-label='关闭'
          >
            <Icon name='close' size={16} />
          </button>
        </div>
        <div className='max-h-[65vh] overflow-y-auto px-6 py-5'>{children}</div>
        {footer ? (
          <div className='flex items-center justify-end gap-3 border-t border-white/8 bg-ink-900/60 px-6 py-4'>{footer}</div>
        ) : null}
      </div>
    </div>
  );
}

export async function copyText(text: string) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (e) {
    // fall through
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch (e) {
    return false;
  }
}

export function Spinner({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox='0 0 24 24' className='animate-spin'>
      <circle cx='12' cy='12' r='9' stroke='currentColor' strokeWidth='3' fill='none' opacity='0.22' />
      <path d='M21 12a9 9 0 0 0-9-9' stroke='currentColor' strokeWidth='3' fill='none' strokeLinecap='round' />
    </svg>
  );
}

export function Field({
  label,
  icon,
  hint,
  error,
  children,
}: {
  label: string;
  icon?: ReactNode;
  hint?: ReactNode;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <div className='mb-2 flex items-center justify-between'>
        <label className='text-[13px] font-medium tracking-wide text-white/55'>{label}</label>
        {hint}
      </div>
      <div className='relative'>
        {icon ? <div className='pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/30'>{icon}</div> : null}
        {children}
      </div>
      {error ? <p className='mt-1.5 text-xs text-red-300'>{error}</p> : null}
    </div>
  );
}

