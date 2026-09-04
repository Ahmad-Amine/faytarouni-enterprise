import AdminCrudPage from '../../components/AdminCrudPage';
import { whatsappTemplateService } from '../../services/resourceService';

export default function WhatsAppTemplates() {
  return (
    <AdminCrudPage
      title="WhatsApp Template"
      queryKey={['admin', 'whatsapp-templates']}
      service={whatsappTemplateService}
      columns={[
        { key: 'name', label: 'Name' },
        { key: 'body', label: 'Message' },
        { key: 'description', label: 'Used for' },
      ]}
      fields={[
        { name: 'name', label: 'Name (e.g. Appointment Reminder)', required: true },
        {
          name: 'body',
          label: 'Message (use {{name}}, {{code}}, {{date}}, {{time}}, {{barberName}}, {{businessName}} placeholders)',
          type: 'textarea',
          required: true,
        },
        { name: 'description', label: 'Description' },
      ]}
    />
  );
}
