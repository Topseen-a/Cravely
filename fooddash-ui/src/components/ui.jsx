import { useEffect, useId, useState } from 'react';
import { STATUS, PAYMENT } from '../lib/status';
import Icon from './Icon';

const BTN = {
  primary: 'bg-danfo text-ink border-2 border-ink shadow-[3px_3px_0_0_var(--color-ink)] hover:-translate-y-0.5 hover:shadow-[4px_5px_0_0_var(--color-ink)] active:translate-y-0.5 active:shadow-[1px_1px_0_0_var(--color-ink)]',
  dark: 'bg-ink text-cream hover:bg-ink-soft',
  jollof: 'bg-jollof text-white hover:bg-jollof-dark',
  palm: 'bg-palm text-white hover:brightness-110',
  outline: 'border-2 border-ink/15 bg-white text-ink hover:border-ink/40',
  ghost: 'text-ink-soft hover:bg-ink/5',
  danger: 'bg-jollof-soft text-jollof-dark hover:bg-jollof hover:text-white',
};
const SIZE = { sm: 'h-9 px-3.5 text-sm', md: 'h-11 px-5 text-[15px]', lg: 'h-14 px-7 text-base' };

export function Button({ variant = 'primary', size = 'md', loading, className = '', children, disabled, ...props }) {
  return (
    <button
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-bold transition-all duration-150 disabled:pointer-events-none disabled:opacity-50 ${BTN[variant]} ${SIZE[size]} ${className}`}
      {...props}
    >
      {loading && <Spinner className="h-4 w-4" />}
      {children}
    </button>
  );
}

export function Spinner({ className = 'h-5 w-5' }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity=".25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

const fieldCls = 'w-full rounded-xl border-2 border-line bg-white px-4 text-[15px] text-ink placeholder:text-muted/70 transition focus:border-ink focus:outline-none';

export function Field({ label, hint, error, children, className = '' }) {
  const id = useId();
  return (
    <div className={className}>
      {label && <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-ink-soft">{label}</label>}
      {children(id)}
      {error ? <p className="mt-1.5 text-sm text-jollof-dark">{error}</p> : hint && <p className="mt-1.5 text-xs text-muted">{hint}</p>}
    </div>
  );
}

export function Input({ label, hint, error, className = '', ...props }) {
  return (
    <Field label={label} hint={hint} error={error} className={className}>
      {(id) => <input id={id} className={`${fieldCls} h-12`} {...props} />}
    </Field>
  );
}

// Password field with a show/hide toggle.
export function PasswordInput({ label = 'Password', hint, error, className = '', ...props }) {
  const [visible, setVisible] = useState(false);
  return (
    <Field label={label} hint={hint} error={error} className={className}>
      {(id) => (
        <div className="relative">
          <input id={id} type={visible ? 'text' : 'password'} className={`${fieldCls} h-12 pr-12`} {...props} />
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? 'Hide password' : 'Show password'}
            aria-pressed={visible}
            title={visible ? 'Hide password' : 'Show password'}
            className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-muted transition hover:bg-ink/5 hover:text-ink"
          >
            <Icon name={visible ? 'eye-off' : 'eye'} className="h-5 w-5" />
          </button>
        </div>
      )}
    </Field>
  );
}

export function Textarea({ label, hint, error, className = '', ...props }) {
  return (
    <Field label={label} hint={hint} error={error} className={className}>
      {(id) => <textarea id={id} rows={3} className={`${fieldCls} resize-none py-3`} {...props} />}
    </Field>
  );
}

export function Select({ label, hint, error, className = '', children, ...props }) {
  return (
    <Field label={label} hint={hint} error={error} className={className}>
      {(id) => (
        <select id={id} className={`${fieldCls} h-12 appearance-none bg-[url("data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20viewBox='0%200%2020%2020'%3E%3Cpath%20d='M5%208l5%205%205-5'%20stroke='%2317120e'%20stroke-width='2'%20fill='none'/%3E%3C/svg%3E")] bg-[length:20px] bg-[right_12px_center] bg-no-repeat pr-10`} {...props}>
          {children}
        </select>
      )}
    </Field>
  );
}

export function Card({ className = '', children, ...props }) {
  return (
    <div className={`rounded-3xl border border-line/70 bg-white shadow-card ${className}`} {...props}>
      {children}
    </div>
  );
}

export function StatusChip({ status, className = '' }) {
  const s = STATUS[status];
  if (!s) return null;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${s.chip} ${className}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

export function PaymentChip({ status, method }) {
  const p = PAYMENT[status];
  if (!p) return null;
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ${p.chip}`}>
      {p.label}
      {method && status !== 'paid' && <span className="ml-1 font-medium opacity-70">· {method === 'paystack' ? 'online' : 'on delivery'}</span>}
    </span>
  );
}

export function Modal({ open, onClose, title, children, wide = false }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-ink/50 backdrop-blur-sm" onClick={onClose} />
      <div className={`animate-fade-up relative max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-cream p-6 shadow-pop sm:rounded-3xl ${wide ? 'sm:max-w-2xl' : 'sm:max-w-md'}`}>
        <div className="mb-5 flex items-start justify-between gap-4">
          <h2 className="text-2xl font-bold">{title}</h2>
          <button onClick={onClose} className="-mr-2 -mt-1 rounded-full p-2 text-muted hover:bg-ink/5 hover:text-ink" aria-label="Close">
            <svg viewBox="0 0 20 20" className="h-5 w-5"><path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function EmptyState({ art, title, children, action }) {
  return (
    <div className="animate-fade-up mx-auto flex max-w-md flex-col items-center px-4 py-14 text-center">
      {art}
      <h2 className="mt-6 text-2xl font-bold">{title}</h2>
      {children && <p className="mt-2 text-muted">{children}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function Skeleton({ className = '' }) {
  return <div className={`skeleton rounded-2xl ${className}`} />;
}

export function PageTitle({ eyebrow, title, children, action }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && <p className="mb-1 text-sm font-bold uppercase tracking-[0.18em] text-jollof">{eyebrow}</p>}
        <h1 className="text-4xl font-extrabold leading-tight sm:text-5xl">{title}</h1>
        {children && <p className="mt-2 max-w-xl text-muted">{children}</p>}
      </div>
      {action}
    </div>
  );
}

export function Segmented({ value, onChange, options }) {
  return (
    <div className="no-scrollbar flex gap-2 overflow-x-auto">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`flex h-10 shrink-0 items-center gap-2 rounded-full border-2 px-4 text-sm font-bold transition ${value === o.value ? 'border-ink bg-ink text-cream' : 'border-line bg-white text-ink-soft hover:border-ink/40'}`}
        >
          {o.label}
          {o.count != null && (
            <span className={`rounded-full px-1.5 text-xs ${value === o.value ? 'bg-danfo text-ink' : 'bg-cream-dark'}`}>{o.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}
