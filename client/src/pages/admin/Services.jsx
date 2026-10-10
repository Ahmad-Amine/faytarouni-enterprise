import { useQuery } from '@tanstack/react-query';
import AdminCrudPage from '../../components/AdminCrudPage';
import { serviceAdminService, categoryService } from '../../services/resourceService';

export default function Services() {
  const { data: categories } = useQuery({ queryKey: ['admin', 'categories', 'all'], queryFn: () => categoryService.list() });
  const categoryOptions = (categories?.data || []).map((c) => ({ value: c._id, label: c.name }));

  return (
    <AdminCrudPage
      title="Service"
      queryKey={['admin', 'services']}
      service={serviceAdminService}
      columns={[
        { key: 'name', label: 'Name' },
        { key: 'nameAr', label: 'Arabic name', render: (r) => <span dir="rtl">{r.nameAr || '—'}</span> },
        { key: 'price', label: 'Price', render: (r) => `$${r.price.toFixed(2)}` },
        { key: 'durationMinutes', label: 'Duration', render: (r) => `${r.durationMinutes} min` },
        { key: 'isActive', label: 'Active', render: (r) => (r.isActive ? 'Yes' : 'No') },
      ]}
      fields={[
        { name: 'name', label: 'Name (English)', required: true },
        { name: 'nameAr', label: 'الاسم (Arabic name)', dir: 'rtl' },
        { name: 'category', label: 'Category', type: 'select', options: categoryOptions },
        { name: 'description', label: 'Description (English)', type: 'textarea' },
        { name: 'descriptionAr', label: 'الوصف (Arabic description)', type: 'textarea', dir: 'rtl' },
        { name: 'imageUrl', label: 'Image URL' },
        { name: 'price', label: 'Price', type: 'number', required: true },
        { name: 'durationMinutes', label: 'Duration (minutes)', type: 'number', required: true },
        { name: 'isVip', label: 'VIP service', type: 'checkbox' },
        { name: 'isActive', label: 'Active', type: 'checkbox' },
      ]}
    />
  );
}
