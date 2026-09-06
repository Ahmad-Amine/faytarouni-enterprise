import { Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectUser } from '../store/slices/authSlice';
import { usePermission } from '../hooks/usePermission';
import { Spinner } from './Feedback';

export function RequireAuth({ children }) {
  const status = useSelector((s) => s.auth.status);
  const user = useSelector(selectUser);
  const location = useLocation();

  if (status === 'idle' || status === 'loading') return <Spinner />;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  return children;
}

export function RequirePermission({ permission, children }) {
  const status = useSelector((s) => s.auth.status);
  const user = useSelector(selectUser);
  const allowed = usePermission(permission);
  const location = useLocation();

  if (status === 'idle' || status === 'loading') return <Spinner />;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  if (!allowed) return <Navigate to="/admin" replace />;
  return children;
}
