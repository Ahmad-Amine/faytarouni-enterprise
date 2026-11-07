import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import CalendarMonth, { toISODate } from '../../components/CalendarMonth';
import { Spinner, EmptyState } from '../../components/Feedback';
import { adminAppointmentService } from '../../services/adminService';
import WhatsAppButton from '../../components/WhatsAppButton';
import WhatsAppSendModal, { useWhatsAppAccess } from '../../components/WhatsAppSendModal';
import { whatsappTemplateService } from '../../services/resourceService';
import { pushToast } from '../../store/slices/uiSlice';
import { getDisplayStatus } from '../../utils/appointmentStatus';
import { useTimeFormat } from '../../hooks/useTimeFormat';

const STATUS_OPTIONS = ['pending', 'confirmed', 'rejected', 'canceled', 'completed', 'no_show'];
const STATUS_LABELS = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  rejected: 'Rejected',
  canceled: 'Canceled',
  completed: 'Completed',
  no_show: 'No-show',
};
const GROUP_ORDER = ['pending', 'confirmed', 'completed', 'no_show', 'rejected', 'canceled'];
const GROUP_LABELS = { ...STATUS_LABELS, pending: 'Pending', confirmed: 'Confirmed' };

// These statuses send a template by themselves once one is assigned to the event.
const STATUS_EVENTS = {
  confirmed: 'appointment_confirmed',
  rejected: 'appointment_rejected',
  canceled: 'appointment_canceled',
};
const NOTIFY_STATUSES = ['confirmed', 'rejected', 'canceled', 'completed', 'no_show'];

function formatUTCDate(value) {
  return new Date(value).toLocaleDateString(undefined, { timeZone: 'UTC', month: 'short', day: 'numeric', year: 'numeric' });
}

export default function AdminAppointments() {
  const [monthDate, setMonthDate] = useState(new Date());
  const [selectedISO, setSelectedISO] = useState(toISODate(new Date()));
  const [searchInput, setSearchInput] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [groupBy, setGroupBy] = useState('status');
  const queryClient = useQueryClient();
  const formatTime = useTimeFormat();
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const [statusNotice, setStatusNotice] = useState(null);
  const { connected } = useWhatsAppAccess(statusNotice?.appointment?._id);

  const { data: templateData } = useQuery({
    queryKey: ['admin', 'whatsapp-templates', 'events'],
    queryFn: () => whatsappTemplateService.list({ limit: 100 }),
    enabled: connected,
    retry: false,
  });
  const automaticEvents = new Set((templateData?.data || []).filter((template) => template.metaName).map((template) => template.event));

  const appointmentVars = (a) => ({
    name: a.customerName,
    date: a.date ? formatUTCDate(a.date) : selectedISO,
    time: formatTime(a.startTime),
    barberName: a.barber?.name || '',
  });

  // Offer a message after a status change, unless the server has already sent
  // the template for it, so the customer isn't told twice.
  const offerStatusMessage = (appointment, status) => {
    if (!NOTIFY_STATUSES.includes(status)) return;
    if (connected && automaticEvents.has(STATUS_EVENTS[status])) {
      dispatch(pushToast(t('whatsapp.sentAutomatically')));
      return;
    }
    setStatusNotice({ appointment, status });
  };

  const monthStr = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`;

  const { data: calendarDays } = useQuery({
    queryKey: ['admin', 'appointments', 'calendar', monthStr],
    queryFn: () => adminAppointmentService.calendar(monthStr),
  });
  const markedSet = new Set((calendarDays || []).map((d) => d._id));

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'appointments', selectedISO],
    queryFn: () => adminAppointmentService.list({ date: selectedISO, limit: 100 }),
    enabled: !activeSearch,
  });

  const { data: searchData, isFetching: searchLoading } = useQuery({
    queryKey: ['admin', 'appointments', 'search', activeSearch],
    queryFn: () => adminAppointmentService.list({ search: activeSearch, sort: '-date,-startTime', limit: 50 }),
    enabled: !!activeSearch,
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status, paymentMethod }) => adminAppointmentService.changeStatus(id, { status, paymentMethod }),
    onSuccess: (_, { status, notifyAppointment }) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'appointments'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
      if (notifyAppointment) offerStatusMessage(notifyAppointment, status);
    },
  });

  const paymentMutation = useMutation({
    mutationFn: ({ id, isPaid, paymentMethod }) => adminAppointmentService.setPaymentStatus(id, { isPaid, paymentMethod }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'appointments'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
    },
  });

  const runSearch = (e) => {
    e.preventDefault();
    setActiveSearch(searchInput.trim());
  };

  const clearSearch = () => {
    setSearchInput('');
    setActiveSearch('');
  };

  const appointments = (activeSearch ? searchData?.data : data?.data) || [];
  const listLoading = activeSearch ? searchLoading : isLoading;

  const groups = groupBy === 'barber'
    ? Object.values(
        appointments.reduce((acc, a) => {
          const key = a.barber?._id || 'unassigned';
          if (!acc[key]) acc[key] = { key, label: a.barber?.name || 'Unassigned', items: [] };
          acc[key].items.push(a);
          return acc;
        }, {})
      )
        .map((g) => ({ ...g, items: [...g.items].sort((a, b) => a.startTime.localeCompare(b.startTime)) }))
        .sort((a, b) => a.label.localeCompare(b.label))
    : GROUP_ORDER.map((status) => ({ key: status, status, label: GROUP_LABELS[status], items: appointments.filter((a) => a.status === status) })).filter(
        (g) => g.items.length > 0
      );

  return (
    <div>
      <div className="page-head"><h1>Appointments</h1></div>
      <div className="grid-stack-mobile" style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 24 }}>
        <div>
          <CalendarMonth
            monthDate={monthDate}
            onMonthChange={setMonthDate}
            selectedISO={selectedISO}
            onSelect={(iso) => {
              clearSearch();
              setSelectedISO(iso);
            }}
            dayMeta={(iso) => ({ marker: markedSet.has(iso), markerVariant: 'danger' })}
          />
          <p style={{ fontSize: 12, color: 'var(--brown-soft)', marginTop: 8 }}>
            <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 3, background: 'var(--danger)', marginInlineEnd: 6, verticalAlign: 'middle' }} />
            Dates with appointments
            <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 3, background: 'var(--teal-deep)', marginInlineEnd: 6, marginInlineStart: 12, verticalAlign: 'middle' }} />
            Today
          </p>

          <form onSubmit={runSearch} className="card" style={{ marginTop: 16 }}>
            <label style={{ fontSize: 12, color: 'var(--brown-soft)', display: 'block', marginBottom: 6 }}>Search customer</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                className="input"
                placeholder="Name or phone"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                style={{ flex: 1 }}
              />
              <button type="submit" className="btn btn-primary btn-sm">Search</button>
            </div>
            {activeSearch && (
              <button type="button" className="btn btn-ghost btn-sm" style={{ marginTop: 8 }} onClick={clearSearch}>
                ← Back to day view
              </button>
            )}
          </form>
        </div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
            <h3>{activeSearch ? `Results for "${activeSearch}"` : selectedISO}</h3>
            <div style={{ display: 'flex', gap: 6 }}>
              <button type="button" className={`btn btn-sm ${groupBy === 'status' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setGroupBy('status')}>
                By Status
              </button>
              <button type="button" className={`btn btn-sm ${groupBy === 'barber' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setGroupBy('barber')}>
                By Barber
              </button>
            </div>
          </div>
          {listLoading && <Spinner />}
          {!listLoading && appointments.length === 0 && <EmptyState />}

          {!listLoading && groups.map((group) => (
            <div key={group.key} style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                {groupBy === 'status' ? (
                  <span className={`badge badge-${group.status}`}>{group.label}</span>
                ) : (
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: 16 }}>{group.label}</span>
                )}
                <span style={{ fontSize: 12, color: 'var(--brown-soft)' }}>({group.items.length})</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {group.items.map((a) => {
                  const displayStatus = getDisplayStatus(a);
                  const canMarkPaid = ['pending', 'confirmed'].includes(a.status);
                  return (
                    <div key={a._id} className="card">
                      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                        <div>
                          <p style={{ fontFamily: 'var(--font-display)', fontSize: 17 }}>
                            {activeSearch ? `${formatUTCDate(a.date)} · ` : ''}{formatTime(a.startTime)} · {a.customerName}
                          </p>
                          <p style={{ fontSize: 13, color: 'var(--brown-soft)' }}>{a.customerPhone}</p>
                          <p style={{ fontSize: 13, marginTop: 4 }}>{a.barber?.name}</p>
                          <p style={{ fontSize: 12, color: 'var(--brown-soft)', marginTop: 4 }}>
                            {a.services.map((s) => s.name).join(', ')} · ${a.total.toFixed(2)}
                          </p>
                          <span className={`badge badge-${a.status}`} style={{ marginTop: 6, display: 'inline-block' }}>
                            {STATUS_LABELS[a.status]}
                          </span>
                          {displayStatus === 'passed' && (
                            <span className="badge badge-passed" style={{ marginTop: 6, marginInlineStart: 6, display: 'inline-block' }}>Passed</span>
                          )}
                          <span
                            className={`badge ${a.isPaid ? 'badge-completed' : 'badge-pending'}`}
                            style={{ marginTop: 6, marginInlineStart: 6, display: 'inline-block' }}
                          >
                            {a.isPaid ? 'Paid' : 'Unpaid'}
                          </span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
                          <WhatsAppButton
                            phone={a.customerPhone}
                            appointmentId={a._id}
                            vars={appointmentVars(a)}
                            fallbackMessage={`Hi ${a.customerName}, about your appointment on ${a.date ? formatUTCDate(a.date) : selectedISO} at ${formatTime(a.startTime)}...`}
                          />
                          {canMarkPaid && (
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              disabled={statusMutation.isPending}
                              onClick={() => statusMutation.mutate({ id: a._id, status: 'completed', paymentMethod: 'cash' })}
                            >
                              Mark Paid
                            </button>
                          )}
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            disabled={paymentMutation.isPending}
                            onClick={() =>
                              paymentMutation.mutate({
                                id: a._id,
                                isPaid: !a.isPaid,
                                paymentMethod: !a.isPaid ? 'cash' : 'unpaid',
                              })
                            }
                          >
                            {a.isPaid ? 'Mark Unpaid' : 'Mark Paid (no status change)'}
                          </button>
                          <div>
                            <label style={{ fontSize: 11, color: 'var(--brown-soft)', display: 'block', marginBottom: 2 }}>Status</label>
                            <select
                              className={`select status-select status-select-${a.status}`}
                              value={a.status}
                              onChange={(e) => statusMutation.mutate({ id: a._id, status: e.target.value, notifyAppointment: a })}
                            >
                              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
      <WhatsAppSendModal
        open={Boolean(statusNotice)}
        onClose={() => setStatusNotice(null)}
        phone={statusNotice?.appointment.customerPhone}
        vars={statusNotice ? appointmentVars(statusNotice.appointment) : {}}
        appointmentId={statusNotice?.appointment._id}
        title={statusNotice ? t('whatsapp.notifyCustomerTitle', { name: statusNotice.appointment.customerName }) : ''}
        initialMessage={statusNotice ? t(`whatsapp.statusMessage.${statusNotice.status}`, { ...appointmentVars(statusNotice.appointment), interpolation: { escapeValue: false } }) : ''}
      />
    </div>
  );
}
