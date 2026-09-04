import { useMemo } from 'react';

export function toISODate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function CalendarMonth({ monthDate, onMonthChange, selectedISO, onSelect, dayMeta = () => ({}), minToday = false }) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();

  const weeks = useMemo(() => {
    const firstOfMonth = new Date(year, month, 1);
    const startOffset = firstOfMonth.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < startOffset; i += 1) cells.push(null);
    for (let d = 1; d <= daysInMonth; d += 1) cells.push(new Date(year, month, d));
    while (cells.length % 7 !== 0) cells.push(null);
    const result = [];
    for (let i = 0; i < cells.length; i += 7) result.push(cells.slice(i, i + 7));
    return result;
  }, [year, month]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayISO = toISODate(today);
  const monthLabel = monthDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <button type="button" className="btn btn-icon btn-outline" onClick={() => onMonthChange(new Date(year, month - 1, 1))}>‹</button>
        <strong>{monthLabel}</strong>
        <button type="button" className="btn btn-icon btn-outline" onClick={() => onMonthChange(new Date(year, month + 1, 1))}>›</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4, textAlign: 'center', fontSize: 12, color: 'var(--brown-soft)', marginBottom: 4 }}>
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <div key={i}>{d}</div>)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4 }}>
        {weeks.flat().map((d, i) => {
          if (!d) return <div key={i} />;
          const iso = toISODate(d);
          const meta = dayMeta(iso) || {};
          const isPast = minToday && d < today;
          const isSelected = selectedISO === iso;
          const isToday = iso === todayISO;
          const disabled = isPast || meta.disabled;
          return (
            <button
              key={iso}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(iso)}
              style={{
                aspectRatio: '1',
                borderRadius: 8,
                border: isToday && !isSelected ? '2px solid var(--teal-deep, #2e7060)' : '2px solid transparent',
                boxSizing: 'border-box',
                fontWeight: 600,
                background: isSelected
                  ? 'var(--accent)'
                  : meta.marker
                  ? meta.markerVariant === 'danger'
                    ? 'rgba(163,38,30,0.85)'
                    : 'rgba(224,165,39,0.25)'
                  : isToday
                  ? 'rgba(46,112,96,0.16)'
                  : 'transparent',
                color: isSelected || (meta.marker && meta.markerVariant === 'danger') ? '#fff9ec' : disabled ? '#c9b98f' : 'var(--brown)',
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.5 : 1,
              }}
            >
              {d.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
