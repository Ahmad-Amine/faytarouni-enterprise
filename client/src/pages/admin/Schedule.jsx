import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminScheduleService } from '../../services/adminService';
import { Spinner } from '../../components/Feedback';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function Schedule() {
  const queryClient = useQueryClient();
  const { data: hours, isLoading } = useQuery({ queryKey: ['admin', 'schedule', 'hours'], queryFn: () => adminScheduleService.hours() });
  const { data: holidays } = useQuery({ queryKey: ['admin', 'schedule', 'holidays'], queryFn: () => adminScheduleService.holidays() });

  const [holidayForm, setHolidayForm] = useState({ date: '', reason: '' });
  const [breakDrafts, setBreakDrafts] = useState({});

  const upsertMutation = useMutation({
    mutationFn: adminScheduleService.upsertHours,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'schedule', 'hours'] }),
  });

  const addHolidayMutation = useMutation({
    mutationFn: adminScheduleService.addHoliday,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'schedule', 'holidays'] });
      setHolidayForm({ date: '', reason: '' });
    },
  });

  const removeHolidayMutation = useMutation({
    mutationFn: adminScheduleService.removeHoliday,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'schedule', 'holidays'] }),
  });

  const dayMap = new Map((hours || []).map((h) => [h.dayOfWeek, h]));

  const updateDay = (dayOfWeek, patch) => {
    const current = dayMap.get(dayOfWeek) || {
      dayOfWeek,
      isOpen: true,
      openTime: '09:00',
      closeTime: '19:00',
      slotIntervalMinutes: 30,
      breaks: [],
    };
    upsertMutation.mutate({ ...current, ...patch, dayOfWeek });
  };

  const getDraft = (dayOfWeek) => breakDrafts[dayOfWeek] || { start: '13:00', end: '14:00' };

  const addBreak = (dayOfWeek) => {
    const draft = getDraft(dayOfWeek);
    const current = dayMap.get(dayOfWeek);
    updateDay(dayOfWeek, { breaks: [...(current?.breaks || []), draft] });
  };

  const removeBreak = (dayOfWeek, index) => {
    const current = dayMap.get(dayOfWeek);
    updateDay(dayOfWeek, { breaks: (current?.breaks || []).filter((_, i) => i !== index) });
  };

  if (isLoading) return <Spinner />;

  return (
    <div>
      <div className="page-head"><h1>Schedule</h1></div>

      <div className="card" style={{ marginBottom: 24 }}>
        <h3 style={{ marginBottom: 14 }}>Business Hours</h3>
        {DAY_NAMES.map((name, i) => {
          const d = dayMap.get(i) || { isOpen: false, openTime: '09:00', closeTime: '19:00', slotIntervalMinutes: 30, breaks: [] };
          const base = { isOpen: d.isOpen, openTime: d.openTime, closeTime: d.closeTime, slotIntervalMinutes: d.slotIntervalMinutes || 30 };
          const draft = getDraft(i);
          return (
            <div key={i} className="schedule-day" style={{ borderTop: i > 0 ? '1px solid #ecdfc2' : 'none' }}>
              <div className="schedule-main-row">
                <label className="checkbox-row" style={{ width: 130 }}>
                  <input type="checkbox" checked={d.isOpen} onChange={(e) => updateDay(i, { ...base, isOpen: e.target.checked })} />
                  {name}
                </label>
                <input className="input" type="time" value={d.openTime} disabled={!d.isOpen} style={{ width: 120 }} onChange={(e) => updateDay(i, { ...base, openTime: e.target.value })} />
                <span>to</span>
                <input className="input" type="time" value={d.closeTime} disabled={!d.isOpen} style={{ width: 120 }} onChange={(e) => updateDay(i, { ...base, closeTime: e.target.value })} />
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                  Slot interval
                  <select
                    className="select"
                    disabled={!d.isOpen}
                    style={{ width: 110 }}
                    value={d.slotIntervalMinutes || 30}
                    onChange={(e) => updateDay(i, { ...base, slotIntervalMinutes: Number(e.target.value) })}
                  >
                    {[10, 15, 20, 30, 45, 60].map((mins) => (
                      <option key={mins} value={mins}>{mins} min</option>
                    ))}
                  </select>
                </label>
              </div>

              {d.isOpen && (
                <div className="schedule-break-row">
                  <span style={{ fontSize: 12, color: 'var(--brown-soft)' }}>Breaks:</span>
                  {(d.breaks || []).map((b, idx) => (
                    <span
                      key={`${b.start}-${b.end}-${idx}`}
                      className="badge"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                    >
                      {b.start}–{b.end}
                      <button
                        type="button"
                        onClick={() => removeBreak(i, idx)}
                        aria-label={`Remove break ${b.start}-${b.end}`}
                        style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--danger)', fontWeight: 700, lineHeight: 1, padding: 0 }}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  {(d.breaks || []).length === 0 && (
                    <span style={{ fontSize: 12, color: 'var(--brown-soft)', fontStyle: 'italic' }}>None</span>
                  )}
                  <input
                    className="input"
                    type="time"
                    style={{ width: 110 }}
                    value={draft.start}
                    onChange={(e) => setBreakDrafts((prev) => ({ ...prev, [i]: { ...draft, start: e.target.value } }))}
                  />
                  <span>to</span>
                  <input
                    className="input"
                    type="time"
                    style={{ width: 110 }}
                    value={draft.end}
                    onChange={(e) => setBreakDrafts((prev) => ({ ...prev, [i]: { ...draft, end: e.target.value } }))}
                  />
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => addBreak(i)}>+ Add break</button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 14 }}>Holidays</h3>
        <form
          style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}
          onSubmit={(e) => {
            e.preventDefault();
            addHolidayMutation.mutate(holidayForm);
          }}
        >
          <input className="input" type="date" required value={holidayForm.date} onChange={(e) => setHolidayForm({ ...holidayForm, date: e.target.value })} style={{ width: 160 }} />
          <input className="input" placeholder="Reason" value={holidayForm.reason} onChange={(e) => setHolidayForm({ ...holidayForm, reason: e.target.value })} style={{ flex: 1 }} />
          <button type="submit" className="btn btn-primary btn-sm">Add</button>
        </form>
        {holidays?.map((h) => (
          <div key={h._id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderTop: '1px solid #ecdfc2' }}>
            <span>{new Date(h.date).toLocaleDateString(undefined, { timeZone: 'UTC' })} — {h.reason}</span>
            <button type="button" className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => removeHolidayMutation.mutate(h._id)}>Remove</button>
          </div>
        ))}
      </div>
    </div>
  );
}
