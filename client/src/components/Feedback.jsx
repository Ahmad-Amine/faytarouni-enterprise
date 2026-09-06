export function Spinner() {
  return <div className="spinner" />;
}

export function EmptyState({ children }) {
  return <div className="empty-state">{children || 'Nothing here yet.'}</div>;
}

export function ErrorBanner({ message }) {
  if (!message) return null;
  return <div className="error-banner">{message}</div>;
}

export function SuccessBanner({ message }) {
  if (!message) return null;
  return <div className="success-banner">{message}</div>;
}
