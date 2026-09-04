import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { adminReportService } from '../../services/adminService';
import { Spinner } from '../../components/Feedback';

const PIE_COLORS = ['#e0a527', '#2e7060', '#8a8a8a', '#a3261e', '#c1531b', '#4a2e1e'];

export default function Dashboard() {
  const { data, isLoading } = useQuery({ queryKey: ['admin', 'dashboard'], queryFn: adminReportService.dashboard });
  const { data: servicesRevenue, isLoading: loadingServicesRevenue } = useQuery({
    queryKey: ['admin', 'reports', 'revenue', 12],
    queryFn: () => adminReportService.revenue(12),
  });
  const { data: productsRevenue, isLoading: loadingProductsRevenue } = useQuery({
    queryKey: ['admin', 'reports', 'product-revenue', 12],
    queryFn: () => adminReportService.productRevenue(12),
  });
  const { data: totalRevenue, isLoading: loadingTotalRevenue } = useQuery({
    queryKey: ['admin', 'reports', 'total-revenue', 12],
    queryFn: () => adminReportService.totalRevenue(12),
  });

  if (isLoading || !data) return <Spinner />;

  const statusData = data.statusBreakdown.map((s) => ({ name: s._id, value: s.count }));

  return (
    <div>
      <div className="page-head"><h1>Dashboard</h1></div>

      <div className="kpi-grid">
        <div className="kpi-card"><div className="label">Today's Appointments</div><div className="value">{data.todayAppointmentsCount}</div></div>
        <div className="kpi-card"><div className="label">Total Customers</div><div className="value">{data.totalCustomers}</div></div>
        <div className="kpi-card"><div className="label">Active Products</div><div className="value">{data.totalProducts}</div></div>
        <div className="kpi-card"><div className="label">Customer Retention</div><div className="value">{data.retention.retentionRate}%</div></div>
      </div>

      <div className="kpi-grid" style={{ marginTop: 12 }}>
        <div className="kpi-card"><div className="label">Services Revenue</div><div className="value">${data.totalServicesRevenue.toFixed(2)}</div></div>
        <div className="kpi-card"><div className="label">Products Revenue</div><div className="value">${data.totalProductsRevenue.toFixed(2)}</div></div>
        <div className="kpi-card"><div className="label">Grand Total</div><div className="value">${data.grandTotal.toFixed(2)}</div></div>
      </div>

      <div className="grid-stack-mobile" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20 }}>
        <div className="card">
          <h3 style={{ marginBottom: 16 }}>Services Revenue</h3>
          {loadingServicesRevenue ? <Spinner /> : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={servicesRevenue}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ecdfc2" />
                <XAxis dataKey="_id" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Bar dataKey="total" name="Revenue" fill="#c1531b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card">
          <h3 style={{ marginBottom: 16 }}>Products Revenue</h3>
          {loadingProductsRevenue ? <Spinner /> : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={productsRevenue}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ecdfc2" />
                <XAxis dataKey="_id" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Bar dataKey="total" name="Revenue" fill="#2e7060" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card">
          <h3 style={{ marginBottom: 16 }}>Total Revenue</h3>
          {loadingTotalRevenue ? <Spinner /> : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={totalRevenue}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ecdfc2" />
                <XAxis dataKey="_id" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Bar dataKey="total" name="Revenue" fill="#e0a527" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="grid-stack-mobile" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop: 20 }}>
        <div className="card">
          <h3 style={{ marginBottom: 16 }}>Appointment Status</h3>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2}>
                {statusData.map((entry, i) => <Cell key={entry.name} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {data.recentProductSales.length > 0 && (
          <div className="card">
            <h3 style={{ marginBottom: 12 }}>Recent Product Sales</h3>
            {data.recentProductSales.map((s) => (
              <div key={s._id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderTop: '1px solid #ecdfc2' }}>
                <span>{s.productName} × {s.quantity}</span>
                <strong style={{ color: 'var(--accent)' }}>${s.total.toFixed(2)}</strong>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid-stack-mobile" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop: 20 }}>
        <div className="card">
          <h3 style={{ marginBottom: 12 }}>Best Selling Services</h3>
          {data.popularServices.map((s) => (
            <div key={s._id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderTop: '1px solid #ecdfc2' }}>
              <span>{s._id} ({s.bookings})</span>
              <strong style={{ color: 'var(--accent)' }}>${s.revenue.toFixed(2)}</strong>
            </div>
          ))}
        </div>
        <div className="card">
          <h3 style={{ marginBottom: 12 }}>Employee Performance</h3>
          {data.barberPerformance.map((b) => (
            <div key={b.name} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderTop: '1px solid #ecdfc2' }}>
              <span>{b.name} ({b.completed} done)</span>
              <strong style={{ color: 'var(--accent)' }}>${b.revenue.toFixed(2)}</strong>
            </div>
          ))}
        </div>
      </div>

      {data.lowStockProducts.length > 0 && (
        <div className="card" style={{ marginTop: 20, borderColor: 'var(--danger)' }}>
          <h3 style={{ marginBottom: 12, color: 'var(--danger)' }}>Low Stock Alerts</h3>
          {data.lowStockProducts.map((p) => (
            <div key={p._id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
              <span>{p.name}</span>
              <span>{p.stock} left</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
