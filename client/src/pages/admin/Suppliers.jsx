import AdminCrudPage from '../../components/AdminCrudPage';
import { supplierService } from '../../services/resourceService';

export default function Suppliers() {
  return (
    <AdminCrudPage
      title="Supplier"
      queryKey={['admin', 'suppliers']}
      service={supplierService}
      columns={[
        { key: 'name', label: 'Name' },
        { key: 'contactName', label: 'Contact' },
        { key: 'email', label: 'Email' },
        { key: 'phone', label: 'Phone' },
      ]}
      fields={[
        { name: 'name', label: 'Name', required: true },
        { name: 'contactName', label: 'Contact name' },
        { name: 'email', label: 'Email' },
        { name: 'phone', label: 'Phone' },
        { name: 'address', label: 'Address', type: 'textarea' },
        { name: 'isActive', label: 'Active', type: 'checkbox' },
      ]}
    />
  );
}
