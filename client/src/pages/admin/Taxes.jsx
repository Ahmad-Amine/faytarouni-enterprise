import AdminCrudPage from '../../components/AdminCrudPage';
import { taxService } from '../../services/resourceService';

export default function Taxes() {
  return (
    <AdminCrudPage
      title="Tax"
      queryKey={['admin', 'taxes']}
      service={taxService}
      columns={[
        { key: 'name', label: 'Name' },
        { key: 'rate', label: 'Rate', render: (r) => `${r.rate}%` },
        { key: 'isActive', label: 'Active', render: (r) => (r.isActive ? 'Yes' : 'No') },
      ]}
      fields={[
        { name: 'name', label: 'Name', required: true },
        { name: 'rate', label: 'Rate (%)', type: 'number', required: true },
        { name: 'appliesToServices', label: 'Applies to services', type: 'checkbox' },
        { name: 'appliesToProducts', label: 'Applies to products', type: 'checkbox' },
        { name: 'isActive', label: 'Active', type: 'checkbox' },
      ]}
    />
  );
}
