import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { adminCustomerService } from '../../services/adminService';
import { Spinner } from '../../components/Feedback';
import WhatsAppButton from '../../components/WhatsAppButton';
import { pushToast } from '../../store/slices/uiSlice';

const APPROVAL_FILTERS = [
  { value: '', label: 'All' },
  { value: 'pending', label: 'Waiting approval' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];

export const APPROVAL_LABELS = { pending: 'Waiting approval', approved: 'Approved', rejected: 'Rejected' };
export const APPROVAL_BADGES = { pending: 'badge-pending', approved: 'badge-completed', rejected: 'badge-rejected' };

export default function Customers() {
  const [search, setSearch] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();
  const approval = searchParams.get('approval') || '';
  const queryClient = useQueryClient();
  const dispatch = useDispatch();
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'customers', search, approval],
    queryFn: () => adminCustomerService.list({ ...(search ? { search } : {}), ...(approval ? { approval } : {}) }),
  });
  const { data: pendingData } = useQuery({
    queryKey: ['admin', 'customers', 'pending-count'],
    queryFn: () => adminCustomerService.list({ approval: 'pending', limit: 1 }),
  });
  const pendingCount = pendingData?.meta?.total || 0;

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin', 'customers'] });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }) => adminCustomerService.setActive(id, isActive),
    onSuccess: invalidate,
  });

  const approvalMutation = useMutation({
    mutationFn: ({ id, status }) => adminCustomerService.setApproval(id, status),
    onSuccess: (user) => {
      invalidate();
      dispatch(pushToast(`${user.name} is now ${APPROVAL_LABELS[user.approvalStatus].toLowerCase()}.`));
    },
    onError: (e) => dispatch(pushToast(e.message, 'error')),
  });

  const setApprovalFilter = (value) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set('approval', value);
    else next.delete('approval');
    setSearchParams(next);
  };

  const customers = data?.data || [];

  return (
    <div>
      <div className="page-head">
        <h1>Customers</h1>
        <input className="input" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: 220 }} />
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
        {APPROVAL_FILTERS.map((f) => (
          <button
            key={f.value || 'all'}
            type="button"
            className={`btn btn-sm ${approval === f.value ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setApprovalFilter(f.value)}
          >
            {f.label}
            {f.value === 'pending' && pendingCount > 0 ? ` (${pendingCount})` : ''}
          </button>
        ))}
      </div>

      {isLoading && <Spinner />}
      {!isLoading && (
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Role</th><th>Online booking</th><th>Bookings</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {customers.map((c) => {
                const status = c.approvalStatus || 'approved';
                return (
                  <tr key={c._id}>
                    <td><Link to={`/admin/customers/${c._id}`} style={{ color: 'var(--accent)', fontWeight: 600 }}>{c.name}</Link></td>
                    <td>{c.email}</td>
                    <td>{c.phone}</td>
                    <td>{c.role?.name !== 'customer' && <span className="badge badge-confirmed">{c.role?.name}</span>}</td>
                    <td><span className={`badge ${APPROVAL_BADGES[status]}`}>{APPROVAL_LABELS[status]}</span></td>
                    <td>{c.appointmentsCount}</td>
                    <td>{c.isActive ? 'Active' : 'Inactive'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {status !== 'approved' && (
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            disabled={approvalMutation.isPending}
                            onClick={() => approvalMutation.mutate({ id: c._id, status: 'approved' })}
                          >
                            Approve
                          </button>
                        )}
                        {status !== 'rejected' && (
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            style={{ color: 'var(--danger)' }}
                            disabled={approvalMutation.isPending}
                            onClick={() =>
                              window.confirm(`Block ${c.name} from booking online?`) &&
                              approvalMutation.mutate({ id: c._id, status: 'rejected' })
                            }
                          >
                            {status === 'approved' ? 'Revoke booking' : 'Reject'}
                          </button>
                        )}
                        <WhatsAppButton
                          phone={c.phone}
                          vars={{ name: c.name }}
                          fallbackMessage={`Hi ${c.name}, this is Faytarouni.`}
                        />
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => toggleActiveMutation.mutate({ id: c._id, isActive: !c.isActive })}
                        >
                          {c.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
