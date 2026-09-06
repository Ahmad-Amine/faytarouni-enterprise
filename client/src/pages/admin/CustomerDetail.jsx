import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useDispatch } from 'react-redux';
import { adminCustomerService } from '../../services/adminService';
import { Spinner } from '../../components/Feedback';
import { pushToast } from '../../store/slices/uiSlice';
import WhatsAppButton from '../../components/WhatsAppButton';

export default function CustomerDetail() {
  const { id } = useParams();
  const dispatch = useDispatch();
  const [newPassword, setNewPassword] = useState('');
  const { data, isLoading } = useQuery({ queryKey: ['admin', 'customer', id], queryFn: () => adminCustomerService.getOne(id) });

  const passwordMutation = useMutation({
    mutationFn: () => adminCustomerService.setPassword(id, newPassword),
    onSuccess: () => {
      dispatch(pushToast('Password updated.'));
      setNewPassword('');
    },
  });

  if (isLoading) return <Spinner />;
  if (!data) return null;

  const { user, appointments } = data;

  return (
    <div>
      <div className="page-head"><h1>{user.name}</h1></div>

      <div className="grid-stack-mobile" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
        <div className="card">
          <p><strong>Email:</strong> {user.email}</p>
          <p><strong>Phone:</strong> {user.phone}</p>
          <p><strong>Booking code:</strong> {user.guestBookingCode || '—'}</p>
          <p><strong>Total appointments:</strong> {user.appointmentsCount}</p>
          <p><strong>Status:</strong> {user.isActive ? 'Active' : 'Inactive'}</p>
          <WhatsAppButton
            phone={user.phone}
            vars={{ name: user.name, code: user.guestBookingCode || '' }}
            fallbackMessage={`Hi ${user.name}, this is Faytarouni. Your booking code is ${user.guestBookingCode || ''}.`}
            style={{ marginTop: 10 }}
          />
        </div>
        <div className="card">
          <h3 style={{ marginBottom: 10 }}>Reset Password</h3>
          <div className="field">
            <input className="input" type="password" placeholder="New password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          </div>
          <button type="button" className="btn btn-secondary" disabled={newPassword.length < 8 || passwordMutation.isPending} onClick={() => passwordMutation.mutate()}>
            Update Password
          </button>
        </div>
      </div>

      <h3 style={{ marginBottom: 12 }}>Appointment History</h3>
      <div className="table-wrap">
        <table className="data-table">
          <thead><tr><th>Date</th><th>Time</th><th>Barber</th><th>Services</th><th>Status</th><th>Total</th></tr></thead>
          <tbody>
            {appointments.map((a) => (
              <tr key={a._id}>
                <td>{new Date(a.date).toLocaleDateString(undefined, { timeZone: 'UTC' })}</td>
                <td>{a.startTime}</td>
                <td>{a.barber?.name}</td>
                <td>{a.services.map((s) => s.name).join(', ')}</td>
                <td><span className={`badge badge-${a.status}`}>{a.status}</span></td>
                <td>${a.total.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
