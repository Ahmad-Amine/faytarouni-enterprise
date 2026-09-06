import AdminCrudPage from '../../components/AdminCrudPage';
import { couponService } from '../../services/resourceService';

export default function Coupons() {
  return (
    <AdminCrudPage
      title="Coupon"
      queryKey={['admin', 'coupons']}
      service={couponService}
      columns={[
        { key: 'code', label: 'Code' },
        { key: 'type', label: 'Type' },
        { key: 'value', label: 'Value' },
        { key: 'usedCount', label: 'Used' },
        { key: 'isActive', label: 'Active', render: (r) => (r.isActive ? 'Yes' : 'No') },
      ]}
      fields={[
        { name: 'code', label: 'Code', required: true },
        {
          name: 'type',
          label: 'Type',
          type: 'select',
          required: true,
          options: [
            { value: 'percentage', label: 'Percentage' },
            { value: 'fixed', label: 'Fixed amount' },
          ],
        },
        { name: 'value', label: 'Value', type: 'number', required: true },
        { name: 'minSpend', label: 'Minimum spend', type: 'number' },
        { name: 'usageLimit', label: 'Usage limit (blank = unlimited)', type: 'number' },
        { name: 'expiresAt', label: 'Expires at', type: 'date' },
        { name: 'isActive', label: 'Active', type: 'checkbox' },
      ]}
    />
  );
}
