import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { adminCustomerService } from '../../services/adminService';
import { Spinner } from '../../components/Feedback';
import WhatsAppButton from '../../components/WhatsAppButton';
import { pushToast } from '../../store/slices/uiSlice';

export default function Customers() {
  const [search, setSearch] = useState('');
  const queryClient = useQueryClient();
  const dispatch = useDispatch();
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'customers', search],
    queryFn: () => adminCustomerService.list(search ? { search } : {}),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }) => adminCustomerService.setActive(id, isActive),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'customers'] }),
  });

  const copyCode = async (code) => {
    try {
      await navigator.clipboard.writeText(code);
      dispatch(pushToast('Booking code copied.'));
    } catch {
      dispatch(pushToast('Could not copy — copy it manually.', 'error'));
    }
  };

  const customers = data?.data || [];

  return (
    <div>
      <div className="page-head">
        <h1>Customers</h1>
        <input className="input" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: 220 }} />
      </div>
      {isLoading && <Spinner />}
      {!isLoading && (
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Role</th><th>Booking Code</th><th>Bookings</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c._id}>
                  <td><Link to={`/admin/customers/${c._id}`} style={{ color: 'var(--accent)', fontWeight: 600 }}>{c.name}</Link></td>
                  <td>{c.email}</td>
                  <td>{c.phone}</td>
                  <td>{c.role?.name !== 'customer' && <span className="badge badge-confirmed">{c.role?.name}</span>}</td>
                  <td>
                    {c.guestBookingCode ? (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span className="badge badge-confirmed" style={{ fontFamily: 'var(--font-display)', letterSpacing: 1 }}>{c.guestBookingCode}</span>
                        <button type="button" className="btn btn-ghost btn-sm" title="Copy" onClick={() => copyCode(c.guestBookingCode)}>Copy</button>
                      </span>
                    ) : (
                      <span style={{ color: 'var(--brown-soft)', fontSize: 12 }}>—</span>
                    )}
                  </td>
                  <td>{c.appointmentsCount}</td>
                  <td>{c.isActive ? 'Active' : 'Inactive'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <WhatsAppButton
                        phone={c.phone}
                        vars={{ name: c.name, code: c.guestBookingCode || '' }}
                        fallbackMessage={`Hi ${c.name}, this is Faytarouni. Your booking code is ${c.guestBookingCode || ''}.`}
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
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
