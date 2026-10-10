import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { adminReportService } from '../../services/adminService';
import { Spinner } from '../../components/Feedback';
import RevenueSummary from '../../components/RevenueSummary';

const PERIODS = [
  { key: 'day', label: 'Daily', hint: 'Last 30 days' },
  { key: 'month', label: 'Monthly', hint: 'Last 12 months' },
  { key: 'year', label: 'Yearly', hint: 'Last 5 years' },
];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Bucket keys come back as YYYY-MM-DD / YYYY-MM / YYYY.
function formatBucket(key, period) {
  if (period === 'day') {
    const [, m, d] = key.split('-');
    return `${MONTHS[Number(m) - 1]} ${Number(d)}`;
  }
  if (period === 'month') {
    const [y, m] = key.split('-');
    return `${MONTHS[Number(m) - 1]} ${y.slice(2)}`;
  }
  return key;
}

function RevenueChart({ title, data, isLoading, color, period }) {
  const sum = (data || []).reduce((acc, row) => acc + row.total, 0);
  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16, gap: 8 }}>
        <h3>{title}</h3>
        {!isLoading && <strong style={{ color: 'var(--accent)' }}>${sum.toFixed(2)}</strong>}
      </div>
      {isLoading ? <Spinner /> : (
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ecdfc2" />
            <XAxis dataKey="_id" fontSize={11} tickFormatter={(k) => formatBucket(k, period)} minTickGap={8} />
            <YAxis fontSize={12} />
            <Tooltip labelFormatter={(k) => formatBucket(k, period)} formatter={(v) => [`$${Number(v).toFixed(2)}`, 'Revenue']} />
            <Bar dataKey="total" fill={color} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

export default function Reports() {
  const [period, setPeriod] = useState('month');
  const active = PERIODS.find((p) => p.key === period);

  const { data: revenue, isLoading: loadingRevenue } = useQuery({
    queryKey: ['admin', 'reports', 'revenue', period],
    queryFn: () => adminReportService.revenue(period),
  });
  const { data: productRevenue, isLoading: loadingProductRevenue } = useQuery({
    queryKey: ['admin', 'reports', 'product-revenue', period],
    queryFn: () => adminReportService.productRevenue(period),
  });
  const { data: totalRevenue, isLoading: loadingTotalRevenue } = useQuery({
    queryKey: ['admin', 'reports', 'total-revenue', period],
    queryFn: () => adminReportService.totalRevenue(period),
  });
  const { data: inventory, isLoading: loadingInventory } = useQuery({ queryKey: ['admin', 'reports', 'inventory'], queryFn: adminReportService.inventory });

  return (
    <div>
      <div className="page-head"><h1>Revenue & Analytics</h1></div>

      <div style={{ marginBottom: 24 }}>
        <RevenueSummary />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {PERIODS.map((p) => (
          <button
            key={p.key}
            type="button"
            className={`btn btn-sm ${period === p.key ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setPeriod(p.key)}
          >
            {p.label}
          </button>
        ))}
        <span style={{ fontSize: 12, color: 'var(--brown-soft)' }}>{active.hint}</span>
      </div>

      <div className="grid-stack-mobile" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20, marginBottom: 24 }}>
        <RevenueChart title="Services Revenue" data={revenue} isLoading={loadingRevenue} color="#c1531b" period={period} />
        <RevenueChart title="Products Revenue" data={productRevenue} isLoading={loadingProductRevenue} color="#2e7060" period={period} />
        <RevenueChart title="Total Revenue" data={totalRevenue} isLoading={loadingTotalRevenue} color="#e0a527" period={period} />
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 16 }}>Inventory Overview</h3>
        {loadingInventory ? <Spinner /> : inventory && (
          <div className="kpi-grid">
            <div className="kpi-card"><div className="label">Total Products</div><div className="value">{inventory.totalProducts}</div></div>
            <div className="kpi-card"><div className="label">Stock Value</div><div className="value">${inventory.totalStockValue.toFixed(0)}</div></div>
            <div className="kpi-card"><div className="label">Low Stock Items</div><div className="value">{inventory.lowStockCount}</div></div>
            <div className="kpi-card"><div className="label">Open Purchase Orders</div><div className="value">{inventory.openPurchaseOrders}</div></div>
          </div>
        )}
      </div>
    </div>
  );
}
