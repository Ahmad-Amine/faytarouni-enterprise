import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminBackupService } from '../../services/adminService';
import { Spinner, EmptyState } from '../../components/Feedback';

export default function Backups() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['admin', 'backups'], queryFn: adminBackupService.list });

  const triggerMutation = useMutation({
    mutationFn: adminBackupService.trigger,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'backups'] }),
  });

  return (
    <div>
      <div className="page-head">
        <h1>Backups</h1>
        <button type="button" className="btn btn-primary" disabled={triggerMutation.isPending} onClick={() => triggerMutation.mutate()}>
          {triggerMutation.isPending ? 'Creating...' : '+ Create Backup Now'}
        </button>
      </div>
      {isLoading && <Spinner />}
      {!isLoading && (data || []).length === 0 && <EmptyState>No backups yet.</EmptyState>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {(data || []).map((b) => (
          <div key={b.filename} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontWeight: 600 }}>{b.filename}</p>
              <p style={{ fontSize: 12, color: 'var(--brown-soft)' }}>{new Date(b.createdAt).toLocaleString()} · {(b.sizeBytes / 1024).toFixed(1)} KB</p>
            </div>
            <a className="btn btn-outline btn-sm" href={adminBackupService.downloadUrl(b.filename)}>Download</a>
          </div>
        ))}
      </div>
    </div>
  );
}
