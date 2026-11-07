import AdminCrudPage from '../../components/AdminCrudPage';
import { whatsappTemplateService } from '../../services/resourceService';

const EVENT_OPTIONS = [
  { value: 'appointment_confirmed', label: 'Appointment accepted' },
  { value: 'appointment_rejected', label: 'Appointment rejected' },
  { value: 'appointment_canceled', label: 'Appointment canceled by the shop' },
  { value: 'appointment_rescheduled', label: 'Appointment rescheduled by the shop' },
  { value: 'appointment_reminder', label: 'Reminder the day before' },
  { value: 'account_approved', label: 'Account approved' },
  { value: 'account_rejected', label: 'Account not approved' },
];

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
        { key: 'metaName', label: 'Meta template' },
        { key: 'event', label: 'Sends automatically', render: (row) => EVENT_OPTIONS.find((o) => o.value === row.event)?.label || 'Manual only' },
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
        { name: 'metaName', label: 'Approved Meta template name (needed to send outside the 24-hour window)' },
        { name: 'metaLanguage', label: 'Meta template language (e.g. en, ar)' },
        { name: 'event', label: 'Send automatically when (leave empty for manual only)', type: 'select', options: EVENT_OPTIONS },
      ]}
    />
  );
}
