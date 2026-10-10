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
        { key: 'nameAr', label: 'Arabic name', render: (r) => <span dir="rtl">{r.nameAr || '—'}</span> },
        { key: 'description', label: 'Description' },
        { key: 'isActive', label: 'Active', render: (r) => (r.isActive ? 'Yes' : 'No') },
      ]}
      fields={[
        { name: 'name', label: 'Name (English)', required: true },
        { name: 'nameAr', label: 'الاسم (Arabic name)', dir: 'rtl' },
        { name: 'description', label: 'Description (English)', type: 'textarea' },
        { name: 'descriptionAr', label: 'الوصف (Arabic description)', type: 'textarea', dir: 'rtl' },
        { name: 'isActive', label: 'Active', type: 'checkbox' },
      ]}
    />
  );
}
