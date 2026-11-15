import React, { createContext, useContext, useState, useCallback } from 'react';
import { ModalPortal } from './ModalPortal';
import { CheckIcon, CloseIcon } from './Icons';

interface ToastOptions {
  title?: string;
  message: string;
  type?: 'success' | 'info' | 'error';
}

interface ToastContextValue {
  showToast: (opts: ToastOptions | string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toast, setToast] = useState<{ id: number; title?: string; message: string; type: 'success' | 'info' | 'error' } | null>(null);

  const showToast = useCallback((opts: ToastOptions | string) => {
    const payload = typeof opts === 'string' ? { message: opts, type: 'info' as const } : { ...opts, type: opts.type || 'info' };
    const id = Date.now();
    setToast({ id, ...payload });

    // Auto dismiss after 3.5 seconds
    setTimeout(() => {
      setToast((cur) => (cur?.id === id ? null : cur));
    }, 3500);
  }, []);

  const closeToast = useCallback(() => {
    setToast(null);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast && (
        <ModalPortal>
          <div
            style={{
              position: 'fixed',
              top: '24px',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 99999,
              width: '90%',
              maxWidth: '400px',
              pointerEvents: 'none',
              animation: 'solecareFadeDown 0.25s ease-out forwards',
            }}
          >
            <div
              style={{
                pointerEvents: 'auto',
                background: '#ffffff',
                borderRadius: '16px',
                border: '1.5px solid #e2e8f0',
                boxShadow: '0 12px 32px rgba(0, 27, 58, 0.16)',
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: toast.type === 'success' ? '#dcfce7' : toast.type === 'error' ? '#fee2e2' : '#e0e9f4',
                  color: toast.type === 'success' ? '#15803d' : toast.type === 'error' ? '#b91c1c' : '#001b3a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {toast.type === 'success' ? (
                  <CheckIcon size={18} color="#15803d" />
                ) : (
                  <span style={{ fontSize: '1.1rem', fontWeight: 800 }}>!</span>
                )}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                {toast.title && (
                  <strong style={{ display: 'block', fontSize: '0.88rem', color: '#0f172a', marginBottom: '2px' }}>
                    {toast.title}
                  </strong>
                )}
                <div style={{ fontSize: '0.84rem', color: '#334155', lineHeight: 1.4, wordBreak: 'break-word' }}>
                  {toast.message}
                </div>
              </div>

              <button
                type="button"
                onClick={closeToast}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  color: '#94a3b8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <CloseIcon size={16} color="#94a3b8" />
              </button>
            </div>
          </div>
        </ModalPortal>
      )}
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return {
      showToast: (opts: ToastOptions | string) => {
        const msg = typeof opts === 'string' ? opts : opts.message;
        console.log('[Toast fallback]:', msg);
      },
    };
  }
  return ctx;
};
