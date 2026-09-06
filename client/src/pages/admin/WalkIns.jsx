import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { catalogService } from '../../services/publicService';
import { adminAppointmentService } from '../../services/adminService';
import { ErrorBanner, SuccessBanner } from '../../components/Feedback';

export default function WalkIns() {
  const { data: barbers = [] } = useQuery({ queryKey: ['barbers'], queryFn: catalogService.barbers });
  const { data: services = [] } = useQuery({ queryKey: ['services'], queryFn: () => catalogService.services() });

  const [form, setForm] = useState({
    barberId: '',
    serviceIds: [],
    date: new Date().toISOString().slice(0, 10),
    startTime: new Date().toTimeString().slice(0, 5),
    customerName: '',
    customerPhone: '',
  });

  const mutation = useMutation({ mutationFn: adminAppointmentService.createWalkIn });

  const toggleService = (id) =>
    setForm((f) => ({ ...f, serviceIds: f.serviceIds.includes(id) ? f.serviceIds.filter((x) => x !== id) : [...f.serviceIds, id] }));

  return (
    <div>
      <div className="page-head"><h1>Walk-in Booking</h1></div>
      <form
        className="card"
        style={{ maxWidth: 520 }}
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate(form);
        }}
      >
        <ErrorBanner message={mutation.error?.message} />
        {mutation.isSuccess && <SuccessBanner message="Walk-in booked." />}

        <div className="field">
          <label>Barber</label>
          <select className="select" required value={form.barberId} onChange={(e) => setForm({ ...form, barberId: e.target.value })}>
            <option value="">Select barber...</option>
            {barbers.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}
          </select>
        </div>

        <div className="field">
          <label>Services</label>
          {services.map((s) => (
            <label key={s._id} className="checkbox-row" style={{ marginBottom: 4 }}>
              <input type="checkbox" checked={form.serviceIds.includes(s._id)} onChange={() => toggleService(s._id)} />
              {s.name} — ${s.price.toFixed(2)}
            </label>
          ))}
        </div>

        <div className="grid-stack-mobile" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="field">
            <label>Date</label>
            <input className="input" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </div>
          <div className="field">
            <label>Time</label>
            <input className="input" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} placeholder="14:30" />
          </div>
        </div>

        <div className="field">
          <label>Customer name</label>
          <input className="input" required value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} />
        </div>
        <div className="field">
          <label>Customer phone</label>
          <input className="input" required value={form.customerPhone} onChange={(e) => setForm({ ...form, customerPhone: e.target.value })} />
        </div>

        <button type="submit" className="btn btn-primary btn-block" disabled={mutation.isPending || form.serviceIds.length === 0}>
          {mutation.isPending ? 'Booking...' : 'Book walk-in'}
        </button>
      </form>
    </div>
  );
}
