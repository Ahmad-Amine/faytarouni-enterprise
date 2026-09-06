import { useDispatch, useSelector } from 'react-redux';
import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { dismissToast } from '../store/slices/uiSlice';

export default function ToastContainer() {
  const toasts = useSelector((s) => s.ui.toasts);
  const dispatch = useDispatch();

  useEffect(() => {
    if (toasts.length === 0) return undefined;
    const timers = toasts.map((t) => setTimeout(() => dispatch(dismissToast(t.id)), 4000));
    return () => timers.forEach(clearTimeout);
  }, [toasts, dispatch]);

  return (
    <div style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 200, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            style={{
              background: t.variant === 'error' ? 'var(--danger)' : 'var(--teal)',
              color: '#fff9ec',
              padding: '12px 20px',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-pop)',
              fontSize: 14,
              fontWeight: 600,
              maxWidth: 320,
            }}
          >
            {t.message}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
