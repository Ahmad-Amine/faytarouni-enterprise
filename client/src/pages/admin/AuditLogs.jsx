import { useQuery } from '@tanstack/react-query';
import { adminAuditLogService } from '../../services/adminService';
import { Spinner } from '../../components/Feedback';

export default function AuditLogs() {
  const { data, isLoading } = useQuery({ queryKey: ['admin', 'audit-logs'], queryFn: () => adminAuditLogService.list({ limit: 100 }) });
  const logs = data?.data || [];

  return (
    <div>
      <div className="page-head"><h1>Audit Logs</h1></div>
      {isLoading && <Spinner />}
      <div className="table-wrap">
        <table className="data-table">
          <thead><tr><th>When</th><th>Actor</th><th>Action</th><th>Entity</th></tr></thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l._id}>
                <td>{new Date(l.createdAt).toLocaleString()}</td>
                <td>{l.actorName}</td>
                <td>{l.action}</td>
                <td>{l.entityType}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
