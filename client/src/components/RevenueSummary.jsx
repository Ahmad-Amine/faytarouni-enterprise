import { useQuery } from '@tanstack/react-query';
import { adminReportService } from '../services/adminService';
import { Spinner } from './Feedback';

const PERIODS = [
  { key: 'today', label: 'Today' },
  { key: 'month', label: 'This Month' },
  { key: 'year', label: 'This Year' },
];

// Revenue (services + products) for the current day, month and year.
export default function RevenueSummary() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'reports', 'revenue-summary'],
    queryFn: adminReportService.revenueSummary,
  });

  if (isLoading) return <Spinner />;
  if (!data) return null;

  return (
    <div className="kpi-grid">
      {PERIODS.map(({ key, label }) => (
        <div key={key} className="kpi-card">
          <div className="label">{label} Revenue</div>
          <div className="value">${data[key].total.toFixed(2)}</div>
          <div className="label" style={{ fontSize: 12, marginTop: 6 }}>
            Services ${data[key].services.toFixed(2)} · Products ${data[key].products.toFixed(2)}
          </div>
        </div>
      ))}
    </div>
  );
}
