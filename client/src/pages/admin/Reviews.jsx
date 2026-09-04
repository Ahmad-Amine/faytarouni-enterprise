import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminReviewService } from '../../services/adminService';
import { Spinner, EmptyState } from '../../components/Feedback';

function formatDate(value) {
  return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function Reviews() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['admin', 'reviews'], queryFn: () => adminReviewService.list({ limit: 100 }) });

  const publishMutation = useMutation({
    mutationFn: ({ id, isPublished }) => adminReviewService.setPublished(id, isPublished),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'reviews'] }),
  });

  const reviews = data?.data || [];

  return (
    <div>
      <div className="page-head"><h1>Reviews</h1></div>
      {isLoading && <Spinner />}
      {!isLoading && reviews.length === 0 && <EmptyState>No reviews yet.</EmptyState>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {reviews.map((r) => (
          <div key={r._id} className="card" style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
            <div>
              <p style={{ fontWeight: 700 }}>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)} — {r.customer?.name} on {r.barber?.name}</p>
              <p style={{ fontSize: 12, color: 'var(--brown-soft)', marginTop: 2 }}>
                {r.customer?.email} · {formatDate(r.createdAt)}
                {r.appointment && ` · visit on ${formatDate(r.appointment.date)} at ${r.appointment.startTime} (${(r.appointment.services || []).map((s) => s.name).join(', ')})`}
              </p>
              {r.comment && <p style={{ fontSize: 14, marginTop: 6 }}>{r.comment}</p>}
              <span className={`badge ${r.isPublished ? 'badge-completed' : 'badge-pending'}`} style={{ marginTop: 6, display: 'inline-block' }}>
                {r.isPublished ? 'Published' : 'Unpublished'}
              </span>
            </div>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              disabled={publishMutation.isPending}
              onClick={() => publishMutation.mutate({ id: r._id, isPublished: !r.isPublished })}
              style={{ flexShrink: 0, alignSelf: 'flex-start' }}
            >
              {r.isPublished ? 'Unpublish' : 'Publish'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
