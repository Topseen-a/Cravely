import { useCallback, useState } from 'react';
import { ToastContext } from './hooks';


const TONE = {
  success: 'bg-palm text-white',
  error: 'bg-jollof text-white',
  info: 'bg-ink text-cream',
};

// Small, accessible notifications replacing window.alert().
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const toast = useCallback((message, tone = 'info') => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t.slice(-2), { id, message, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3800);
  }, []);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 top-20 z-[60] flex flex-col items-center gap-2 px-4 md:bottom-6 md:top-auto">
        {toasts.map((t) => (
          <div key={t.id} role="status" className={`animate-pop max-w-md rounded-2xl px-5 py-3 text-sm font-semibold shadow-pop ${TONE[t.tone]}`}>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
