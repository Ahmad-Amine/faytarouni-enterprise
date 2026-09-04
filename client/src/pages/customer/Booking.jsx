import { useMemo, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import CalendarMonth from '../../components/CalendarMonth';
import { Spinner, ErrorBanner } from '../../components/Feedback';
import { bookingService, catalogService } from '../../services/publicService';
import { useAuth } from '../../hooks/useAuth';
import { useSiteSettings, useContentText } from '../../hooks/useSiteSettings';

const STEPS = { DATE: 1, SERVICES: 2, TIME: 3, BARBER: 4, DETAILS: 5 };

export default function Booking() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language === 'ar' ? 'ar' : 'en';
  const { data: settings } = useSiteSettings();
  const pageTitle = useContentText(settings, 'booking_page_title', t('booking.title'), lang);
  const { user, isAuthenticated } = useAuth();
  const [step, setStep] = useState(STEPS.DATE);
  const [monthDate, setMonthDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [selectedBarber, setSelectedBarber] = useState(null);
  const [selectedServiceIds, setSelectedServiceIds] = useState([]);
  const [customerName, setCustomerName] = useState(user?.name || '');
  const [customerPhone, setCustomerPhone] = useState(user?.phone || '');
  const [couponCode, setCouponCode] = useState('');
  const [guestCode, setGuestCode] = useState('');
  const [success, setSuccess] = useState(false);

  const monthStr = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`;

  const { data: openDays } = useQuery({
    queryKey: ['availability', 'month', monthStr],
    queryFn: () => bookingService.monthAvailability(monthStr),
  });
  const openSet = new Set(openDays?.days || []);

  const { data: services = [] } = useQuery({ queryKey: ['services'], queryFn: () => catalogService.services() });

  const totalDuration = useMemo(
    () => services.filter((s) => selectedServiceIds.includes(s._id)).reduce((sum, s) => sum + s.durationMinutes, 0),
    [services, selectedServiceIds]
  );
  const total = useMemo(
    () => services.filter((s) => selectedServiceIds.includes(s._id)).reduce((sum, s) => sum + s.price, 0),
    [services, selectedServiceIds]
  );

  const { data: slotsData, isFetching: loadingSlots } = useQuery({
    queryKey: ['availability', 'day', selectedDate, totalDuration],
    queryFn: () => bookingService.daySlots(selectedDate, totalDuration),
    enabled: !!selectedDate && totalDuration > 0,
  });

  const { data: barbersData, isFetching: loadingBarbers } = useQuery({
    queryKey: ['availability', 'barbers', selectedDate, selectedTime, totalDuration],
    queryFn: () => bookingService.availableBarbers(selectedDate, selectedTime, totalDuration),
    enabled: !!selectedDate && !!selectedTime && totalDuration > 0,
  });

  const bookMutation = useMutation({
    mutationFn: bookingService.createAppointment,
    onSuccess: () => setSuccess(true),
  });

  const toggleService = (id) =>
    setSelectedServiceIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const submit = (e) => {
    e.preventDefault();
    bookMutation.mutate({
      barberId: selectedBarber._id,
      serviceIds: selectedServiceIds,
      date: selectedDate,
      startTime: selectedTime,
      customerName,
      customerPhone,
      couponCode: couponCode || undefined,
      guestCode: !isAuthenticated && guestCode ? guestCode : undefined,
    });
  };

  if (success) {
    return (
      <div className="container" style={{ padding: '100px 24px', textAlign: 'center' }}>
        <h1 style={{ color: 'var(--accent)', fontSize: 36 }}>{t('booking.success')}</h1>
        <p style={{ marginTop: 12 }}>{t('booking.successBody')}</p>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: '50px 24px', maxWidth: 720 }}>
      <h1 style={{ color: 'var(--accent)', fontSize: 32 }}>{pageTitle}</h1>

      <AnimatePresence mode="wait">
        {step === STEPS.DATE && (
          <motion.div key="date" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ marginTop: 24 }}>
            <CalendarMonth
              monthDate={monthDate}
              onMonthChange={setMonthDate}
              selectedISO={selectedDate}
              onSelect={(iso) => {
                if (!openSet.has(iso)) return;
                setSelectedDate(iso);
                setSelectedTime(null);
                setStep(STEPS.SERVICES);
              }}
              minToday
              dayMeta={(iso) => ({ disabled: !openSet.has(iso), marker: openSet.has(iso) })}
            />
          </motion.div>
        )}

        {step === STEPS.SERVICES && (
          <motion.div key="services" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ marginTop: 24 }}>
            <button type="button" className="btn btn-ghost" onClick={() => setStep(STEPS.DATE)}>← {t('booking.back')}</button>
            <p style={{ fontWeight: 600, margin: '16px 0 8px' }}>{t('booking.services')}</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 8 }}>
              {services.map((s) => (
                <label
                  key={s._id}
                  className="checkbox-row"
                  style={{ border: '2px solid var(--mustard)', borderRadius: 8, padding: '8px 12px', justifyContent: 'space-between' }}
                >
                  <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input type="checkbox" checked={selectedServiceIds.includes(s._id)} onChange={() => toggleService(s._id)} />
                    {s.name} <span style={{ fontSize: 12, color: 'var(--brown-soft)' }}>({s.durationMinutes} min)</span>
                  </span>
                  <span style={{ color: 'var(--accent)', fontWeight: 700 }}>${s.price.toFixed(2)}</span>
                </label>
              ))}
            </div>
            <p style={{ textAlign: 'right', marginTop: 8 }}>{t('booking.total')}: <strong style={{ color: 'var(--accent)' }}>${total.toFixed(2)}</strong></p>
            <button
              type="button"
              className="btn btn-primary btn-block"
              disabled={selectedServiceIds.length === 0}
              onClick={() => setStep(STEPS.TIME)}
            >
              {t('booking.continue')}
            </button>
          </motion.div>
        )}

        {step === STEPS.TIME && (
          <motion.div key="time" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ marginTop: 24 }}>
            <button type="button" className="btn btn-ghost" onClick={() => setStep(STEPS.SERVICES)}>← {t('booking.back')}</button>
            {loadingSlots && <Spinner />}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(90px,1fr))', gap: 10, marginTop: 12 }}>
              {slotsData?.slots.map((s) => (
                <button
                  key={s.time}
                  type="button"
                  disabled={s.isFullyBooked}
                  className="btn"
                  style={{
                    background: selectedTime === s.time ? 'var(--accent)' : '#fff',
                    color: selectedTime === s.time ? '#fff9ec' : 'var(--brown)',
                    border: '2px solid var(--mustard)',
                    opacity: s.isFullyBooked ? 0.4 : 1,
                  }}
                  onClick={() => {
                    setSelectedTime(s.time);
                    setStep(STEPS.BARBER);
                  }}
                >
                  {s.time}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {step === STEPS.BARBER && (
          <motion.div key="barber" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ marginTop: 24 }}>
            <button type="button" className="btn btn-ghost" onClick={() => setStep(STEPS.TIME)}>← {t('booking.back')}</button>
            {loadingBarbers && <Spinner />}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))', gap: 14, marginTop: 12 }}>
              {barbersData?.map((b) => {
                const unavailable = b.isBooked || b.isOnHoliday;
                return (
                  <button
                    key={b._id}
                    type="button"
                    disabled={unavailable}
                    className="card"
                    style={{ opacity: unavailable ? 0.4 : 1, textAlign: 'center' }}
                    onClick={() => {
                      setSelectedBarber(b);
                      setStep(STEPS.DETAILS);
                    }}
                  >
                    <img src={b.photoUrl} alt={b.name} style={{ width: 70, height: 70, borderRadius: '50%', objectFit: 'cover', marginBottom: 8 }} />
                    <p style={{ fontWeight: 600, fontSize: 14 }}>{b.name}</p>
                    {b.isBooked && <p style={{ fontSize: 11, color: 'var(--danger)' }}>{t('booking.booked')}</p>}
                    {!b.isBooked && b.isOnHoliday && <p style={{ fontSize: 11, color: 'var(--danger)' }}>{t('booking.onHoliday')}</p>}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}

        {step === STEPS.DETAILS && (
          <motion.form key="details" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onSubmit={submit} style={{ marginTop: 24 }}>
            <button type="button" className="btn btn-ghost" onClick={() => setStep(STEPS.BARBER)}>← {t('booking.back')}</button>

            <p style={{ margin: '16px 0 8px' }}>
              {selectedDate} · {selectedTime} · {selectedBarber?.name}
            </p>
            <p style={{ textAlign: 'right' }}>{t('booking.total')}: <strong style={{ color: 'var(--accent)' }}>${total.toFixed(2)}</strong></p>

            <div className="field" style={{ marginTop: 16 }}>
              <label>{t('booking.name')}</label>
              <input className="input" required value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
            </div>
            <div className="field">
              <label>{t('booking.phone')}</label>
              <input className="input" required value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
            </div>

            {!isAuthenticated && (
              <div className="field">
                <label>{t('booking.guestCodeLabel')}</label>
                <input
                  className="input"
                  maxLength={5}
                  placeholder="12345"
                  value={guestCode}
                  onChange={(e) => setGuestCode(e.target.value.replace(/\D/g, ''))}
                />
                <p style={{ fontSize: 12, color: 'var(--brown-soft)', marginTop: 4 }}>{t('booking.guestCodeHint')}</p>
              </div>
            )}

            <div className="field">
              <label>{t('booking.coupon')}</label>
              <input className="input" value={couponCode} onChange={(e) => setCouponCode(e.target.value)} />
            </div>

            <ErrorBanner message={bookMutation.error?.message} />

            <button type="submit" className="btn btn-primary btn-block" disabled={bookMutation.isPending || selectedServiceIds.length === 0}>
              {bookMutation.isPending ? '...' : t('booking.confirm')}
            </button>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
