import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { bookingService } from '../../services/publicService';
import { Spinner, EmptyState } from '../../components/Feedback';
import Modal from '../../components/Modal';
import CalendarMonth, { toISODate } from '../../components/CalendarMonth';
import { pushToast } from '../../store/slices/uiSlice';
import { getDisplayStatus } from '../../utils/appointmentStatus';

export default function MyAppointments() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const queryClient = useQueryClient();
  const { data: appointments, isLoading } = useQuery({ queryKey: ['myAppointments'], queryFn: bookingService.myAppointments });

  const [rescheduling, setRescheduling] = useState(null);
  const [reviewing, setReviewing] = useState(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [newDate, setNewDate] = useState(null);
  const [newTime, setNewTime] = useState('');

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['myAppointments'] });

  const cancelMutation = useMutation({
    mutationFn: (id) => bookingService.cancelAppointment(id, 'Customer canceled'),
    onSuccess: () => {
      invalidate();
      dispatch(pushToast(t('myAppointments.canceledToast')));
    },
  });

  const rescheduleMutation = useMutation({
    mutationFn: () => bookingService.rescheduleAppointment(rescheduling._id, { date: newDate, startTime: newTime }),
    onSuccess: () => {
      invalidate();
      setRescheduling(null);
      dispatch(pushToast(t('myAppointments.rescheduledToast')));
    },
  });

  const reviewMutation = useMutation({
    mutationFn: () => bookingService.leaveReview({ appointmentId: reviewing._id, rating, comment }),
    onSuccess: () => {
      setReviewing(null);
      setComment('');
      dispatch(pushToast(t('myAppointments.reviewToast')));
    },
  });

  if (isLoading) return <Spinner />;

  return (
    <div className="container" style={{ padding: '50px 24px', maxWidth: 640 }}>
      <h1 style={{ color: 'var(--accent)', fontSize: 28 }}>{t('myAppointments.title')}</h1>

      {appointments?.length === 0 && <EmptyState>{t('myAppointments.empty')}</EmptyState>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 20 }}>
        {appointments?.map((a) => {
          const displayStatus = getDisplayStatus(a);
          return (
            <div key={a._id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <p style={{ fontFamily: 'var(--font-display)', fontSize: 18 }}>
                    {new Date(a.date).toLocaleDateString(undefined, { timeZone: 'UTC' })} · {a.startTime}
                  </p>
                  <p style={{ color: 'var(--brown-soft)', fontSize: 14 }}>{a.barber?.name}</p>
                  <p style={{ fontSize: 12, color: 'var(--brown-soft)', marginTop: 4 }}>{a.services.map((s) => s.name).join(', ')}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span className={`badge badge-${displayStatus}`}>{t(`myAppointments.status.${displayStatus}`)}</span>
                  <p style={{ marginTop: 8, fontWeight: 700, color: 'var(--accent)' }}>${a.total.toFixed(2)}</p>
                </div>
              </div>
              {['pending', 'confirmed'].includes(a.status) && (
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => { setRescheduling(a); setNewDate(null); setNewTime(''); }}>
                    {t('myAppointments.reschedule')}
                  </button>
                  <button type="button" className="btn btn-danger btn-sm" onClick={() => cancelMutation.mutate(a._id)}>
                    {t('myAppointments.cancel')}
                  </button>
                </div>
              )}
              {a.status === 'completed' && (
                <button type="button" className="btn btn-secondary btn-sm" style={{ marginTop: 12 }} onClick={() => setReviewing(a)}>
                  {t('myAppointments.leaveReview')}
                </button>
              )}
            </div>
          );
        })}
      </div>

      <Modal open={!!rescheduling} onClose={() => setRescheduling(null)} title={t('myAppointments.rescheduleTitle')}>
        <CalendarMonth monthDate={new Date()} onMonthChange={() => {}} selectedISO={newDate} onSelect={setNewDate} minToday />
        <div className="field" style={{ marginTop: 12 }}>
          <label>{t('myAppointments.newTime')}</label>
          <input className="input" placeholder="14:30" value={newTime} onChange={(e) => setNewTime(e.target.value)} />
        </div>
        <button type="button" className="btn btn-primary btn-block" disabled={!newDate || !newTime || rescheduleMutation.isPending} onClick={() => rescheduleMutation.mutate()}>
          {t('myAppointments.confirmNewTime')}
        </button>
      </Modal>

      <Modal open={!!reviewing} onClose={() => setReviewing(null)} title={t('myAppointments.reviewTitle')}>
        <div className="field">
          <label>{t('reviews.rating')}</label>
          <select className="select" value={rating} onChange={(e) => setRating(Number(e.target.value))}>
            {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} star{n > 1 ? 's' : ''}</option>)}
          </select>
        </div>
        <div className="field">
          <label>{t('reviews.comment')}</label>
          <textarea className="textarea" rows={3} value={comment} onChange={(e) => setComment(e.target.value)} />
        </div>
        <button type="button" className="btn btn-primary btn-block" disabled={reviewMutation.isPending} onClick={() => reviewMutation.mutate()}>
          {t('reviews.submit')}
        </button>
      </Modal>
    </div>
  );
}
