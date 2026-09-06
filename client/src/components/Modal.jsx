import { AnimatePresence, motion } from 'framer-motion';

export default function Modal({ open, onClose, title, children, width = 480 }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(74,46,30,0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
            zIndex: 100,
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            onClick={(e) => e.stopPropagation()}
            className="card"
            style={{ width: '100%', maxWidth: width, maxHeight: '90vh', overflowY: 'auto' }}
          >
            {title && <h3 style={{ marginBottom: 16 }}>{title}</h3>}
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
