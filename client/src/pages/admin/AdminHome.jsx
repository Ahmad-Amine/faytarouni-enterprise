import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectPermissions } from '../../store/slices/authSlice';
import { usePermission } from '../../hooks/usePermission';
import { PERMISSIONS } from '../../utils/permissions';
import { NAV_GROUPS } from '../../layouts/AdminLayout';
import Dashboard from './Dashboard';

function isAllowed(userPermissions, permission) {
  if (!permission) return true;
  const required = Array.isArray(permission) ? permission : [permission];
  return required.every((p) => userPermissions.includes(p));
}

export default function AdminHome() {
  const canViewReports = usePermission(PERMISSIONS.REPORTS_VIEW);
  const userPermissions = useSelector(selectPermissions);

  if (canViewReports) return <Dashboard />;

  const firstAllowed = NAV_GROUPS.flatMap((g) => g.items).find((item) => isAllowed(userPermissions, item.permission));
  if (firstAllowed) return <Navigate to={firstAllowed.to} replace />;

  return (
    <div className="card">
      <h3>No sections available</h3>
      <p style={{ color: 'var(--brown-soft)', marginTop: 8 }}>
        Your account doesn't have access to any admin section yet. Ask an administrator to grant you a permission.
      </p>
    </div>
  );
}
