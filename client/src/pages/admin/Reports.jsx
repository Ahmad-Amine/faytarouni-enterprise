import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { adminReportService } from '../../services/adminService';
import { Spinner } from '../../components/Feedback';

export default function Reports() {
  const { data: revenue, isLoading: loadingRevenue } = useQuery({ queryKey: ['admin', 'reports', 'revenue'], queryFn: () => adminReportService.revenue(12) });
  const { data: productRevenue, isLoading: loadingProductRevenue } = useQuery({ queryKey: ['admin', 'reports', 'product-revenue'], queryFn: () => adminReportService.productRevenue(12) });
  const { data: totalRevenue, isLoading: loadingTotalRevenue } = useQuery({ queryKey: ['admin', 'reports', 'total-revenue'], queryFn: () => adminReportService.totalRevenue(12) });
  const { data: inventory, isLoading: loadingInventory } = useQuery({ queryKey: ['admin', 'reports', 'inventory'], queryFn: adminReportService.inventory });

  return (
    <div>
      <div className="page-head"><h1>Revenue & Analytics</h1></div>

      <div className="grid-stack-mobile" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20, marginBottom: 24 }}>
        <div className="card">
          <h3 style={{ marginBottom: 16 }}>Services Revenue</h3>
          {loadingRevenue ? <Spinner /> : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={revenue}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ecdfc2" />
                <XAxis dataKey="_id" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Bar dataKey="total" fill="#c1531b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card">
          <h3 style={{ marginBottom: 16 }}>Products Revenue</h3>
          {loadingProductRevenue ? <Spinner /> : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={productRevenue}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ecdfc2" />
                <XAxis dataKey="_id" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Bar dataKey="total" fill="#2e7060" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card">
          <h3 style={{ marginBottom: 16 }}>Total Revenue</h3>
          {loadingTotalRevenue ? <Spinner /> : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={totalRevenue}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ecdfc2" />
                <XAxis dataKey="_id" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Bar dataKey="total" fill="#e0a527" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
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
