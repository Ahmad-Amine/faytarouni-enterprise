import AdminCrudPage from '../../components/AdminCrudPage';
import { locationService } from '../../services/resourceService';

export default function Locations() {
  return (
    <AdminCrudPage
      title="Location"
      queryKey={['admin', 'locations']}
      service={locationService}
      columns={[
        { key: 'name', label: 'Name' },
        { key: 'address', label: 'Address' },
        { key: 'phone', label: 'Phone' },
        { key: 'isActive', label: 'Active', render: (r) => (r.isActive ? 'Yes' : 'No') },
      ]}
      fields={[
        { name: 'name', label: 'Name', required: true },
        { name: 'address', label: 'Address', type: 'textarea' },
        { name: 'phone', label: 'Phone' },
        { name: 'timezone', label: 'Timezone' },
        { name: 'isActive', label: 'Active', type: 'checkbox' },
      ]}
    />
  );
}
