import { useMemo, useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import CalendarMonth from '../../components/CalendarMonth';
import { Spinner, ErrorBanner } from '../../components/Feedback';
import { bookingService, catalogService } from '../../services/publicService';
import { useAuth } from '../../hooks/useAuth';
import { useSiteSettings, useContentText } from '../../hooks/useSiteSettings';
import { COUNTRY_CODES, DEFAULT_COUNTRY_DIAL } from '../../data/countryCodes';
import { countryName, localizedBarberName, localizedServiceName } from '../../utils/localizeCatalog';
import { useTimeFormat } from '../../hooks/useTimeFormat';

const STEPS = { DATE: 1, SERVICES: 2, TIME: 3, BARBER: 4, DETAILS: 5 };

export default function Booking() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language === 'ar' ? 'ar' : 'en';
  const { data: settings } = useSiteSettings();
  const pageTitle = useContentText(settings, 'booking_page_title', t('booking.title'), lang);
  const { user } = useAuth();
  const formatTime = useTimeFormat();
  const [step, setStep] = useState(STEPS.DATE);
  const [monthDate, setMonthDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [selectedBarber, setSelectedBarber] = useState(null);
  const [selectedServiceIds, setSelectedServiceIds] = useState([]);
  const [customerName, setCustomerName] = useState(user?.name || '');
  const splitAccountPhone = (phone = '') => {
    const match = [...COUNTRY_CODES].sort((a, b) => b.dial.length - a.dial.length).find((c) => phone.startsWith(c.dial));
    const dial = match?.dial || DEFAULT_COUNTRY_DIAL;
    return { dial, local: phone.startsWith(dial) ? phone.slice(dial.length).replace(/\D/g, '') : phone.replace(/\D/g, '') };
  };
  const initialPhone = splitAccountPhone(user?.phone || '');
  const [countryDial, setCountryDial] = useState(initialPhone.dial);
  const [customerPhoneLocal, setCustomerPhoneLocal] = useState(initialPhone.local);
  const [couponCode, setCouponCode] = useState('');
  const [success, setSuccess] = useState(false);
  const queryClient = useQueryClient();
  const approvalStatus = user?.approvalStatus || 'approved';

  // A pending customer may have been approved since the session was loaded;
  // refresh the account so the booking form unlocks without a re-login.
  useEffect(() => {
    if (approvalStatus !== 'approved') queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
  }, [approvalStatus, queryClient]);

  useEffect(() => {
    const parsed = splitAccountPhone(user?.phone || '');
    setCountryDial(parsed.dial);
    setCustomerPhoneLocal(parsed.local);
    setCustomerName(user?.name || '');
  }, [user?.phone, user?.name]);

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
    queryKey: ['availability', 'day', selectedDate, totalDuration, selectedServiceIds],
    queryFn: () => bookingService.daySlots(selectedDate, totalDuration, selectedServiceIds),
    enabled: !!selectedDate && totalDuration > 0,
  });

  const { data: barbersData, isFetching: loadingBarbers } = useQuery({
    queryKey: ['availability', 'barbers', selectedDate, selectedTime, totalDuration, selectedServiceIds],
    queryFn: () => bookingService.availableBarbers(selectedDate, selectedTime, totalDuration, selectedServiceIds),
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
      customerPhone: `${countryDial}${customerPhoneLocal}`,
      couponCode: couponCode || undefined,
    });
  };

  if (approvalStatus !== 'approved') {
    const rejected = approvalStatus === 'rejected';
    return (
      <div className="container" style={{ padding: '100px 24px', textAlign: 'center', maxWidth: 620 }}>
        <h1 style={{ color: 'var(--accent)', fontSize: 30 }}>
          {rejected ? t('booking.rejectedTitle') : t('booking.pendingApprovalTitle')}
        </h1>
        <p style={{ marginTop: 12 }}>{rejected ? t('booking.rejectedBody') : t('booking.pendingApprovalBody')}</p>
      </div>
    );
  }

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
                    {localizedServiceName(s, lang)} <span style={{ fontSize: 12, color: 'var(--brown-soft)' }}>({s.durationMinutes} {t('common.minutesShort')})</span>
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
                  {formatTime(s.time)}
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
                const unavailable = b.isBooked || b.isOnHoliday || b.isOnBreak;
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
                    <img src={b.photoUrl} alt={localizedBarberName(b, lang)} style={{ width: 70, height: 70, borderRadius: '50%', objectFit: 'cover', marginBottom: 8 }} />
                    <p style={{ fontWeight: 600, fontSize: 14 }}>{localizedBarberName(b, lang)}</p>
                    {b.isBooked && <p style={{ fontSize: 11, color: 'var(--danger)' }}>{t('booking.booked')}</p>}
                    {!b.isBooked && b.isOnHoliday && <p style={{ fontSize: 11, color: 'var(--danger)' }}>{t('booking.onHoliday')}</p>}
                    {!b.isBooked && !b.isOnHoliday && b.isOnBreak && <p style={{ fontSize: 11, color: 'var(--danger)' }}>{t('booking.onBreak')}</p>}
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
              {selectedDate} · {formatTime(selectedTime)} · {localizedBarberName(selectedBarber, lang)}
            </p>
            <p style={{ textAlign: 'right' }}>{t('booking.total')}: <strong style={{ color: 'var(--accent)' }}>${total.toFixed(2)}</strong></p>

            <div className="field" style={{ marginTop: 16 }}>
              <label>{t('booking.name')}</label>
              <input className="input" required readOnly value={customerName} />
            </div>
            <div className="field">
              <label>{t('booking.phone')}</label>
              <div className="phone-field-row">
                <select className="select phone-code" value={countryDial} disabled aria-label={t('booking.countryCodeLocked')}>
                  {COUNTRY_CODES.filter((c, i, arr) => arr.findIndex((x) => x.dial === c.dial) === i).map((c) => (
                    <option key={c.dial} value={c.dial}>{countryName(c.code, c.name, lang)} ({c.dial})</option>
                  ))}
                </select>
                <input
                  className="input"
                  type="tel"
                  inputMode="numeric"
                  required
                  value={customerPhoneLocal}
                  onChange={(e) => setCustomerPhoneLocal(e.target.value.replace(/\D/g, ''))}
                />
              </div>
              <p className="field-help">{t('booking.countryCodeLocked')}</p>
            </div>

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
