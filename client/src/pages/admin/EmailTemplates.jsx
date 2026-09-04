import AdminCrudPage from '../../components/AdminCrudPage';
import { emailTemplateService } from '../../services/resourceService';

export default function EmailTemplates() {
  return (
    <AdminCrudPage
      title="Email Template"
      queryKey={['admin', 'email-templates']}
      service={emailTemplateService}
      columns={[
        { key: 'key', label: 'Key' },
        { key: 'subject', label: 'Subject' },
        { key: 'description', label: 'Used for' },
      ]}
      fields={[
        { name: 'key', label: 'Key (e.g. email_verification)', required: true },
        { name: 'subject', label: 'Subject', required: true },
        { name: 'bodyHtml', label: 'Body (HTML, use {{variable}} placeholders)', type: 'textarea', required: true },
        { name: 'description', label: 'Description' },
      ]}
    />
  );
}
