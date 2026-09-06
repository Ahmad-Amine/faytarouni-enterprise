import AdminCrudPage from '../../components/AdminCrudPage';
import { categoryService } from '../../services/resourceService';

export default function Categories() {
  return (
    <AdminCrudPage
      title="Category"
      queryKey={['admin', 'categories']}
      service={categoryService}
      columns={[
        { key: 'name', label: 'Name' },
        { key: 'description', label: 'Description' },
        { key: 'isActive', label: 'Active', render: (r) => (r.isActive ? 'Yes' : 'No') },
      ]}
      fields={[
        { name: 'name', label: 'Name', required: true },
        { name: 'description', label: 'Description', type: 'textarea' },
        { name: 'isActive', label: 'Active', type: 'checkbox' },
      ]}
    />
  );
}
