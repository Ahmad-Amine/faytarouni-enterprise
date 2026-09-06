import { useSelector } from 'react-redux';
import { selectPermissions } from '../store/slices/authSlice';

export function usePermission(permission) {
  const permissions = useSelector(selectPermissions);
  if (!permission) return true;
  const list = Array.isArray(permission) ? permission : [permission];
  return list.every((p) => permissions.includes(p));
}
