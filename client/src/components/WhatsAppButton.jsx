import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Modal from './Modal';
import { Spinner } from './Feedback';
import { whatsappTemplateService } from '../services/resourceService';
import { interpolateTemplate, openWhatsAppPopup } from '../utils/whatsapp';

export default function WhatsAppButton(
  { phone, vars = {}, fallbackMessage = '', label = 'WhatsApp', className = 'btn btn-secondary btn-sm', style }
) {
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [message, setMessage] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'whatsapp-templates', 'picker'],
    queryFn: () => whatsappTemplateService.list({ limit: 100 }),
    enabled: open,
  });
  const templates = data?.data || [];

  const openPicker = () => {
    setSelectedId(null);
    setMessage(fallbackMessage);
    setOpen(true);
  };

  const pickTemplate = (template) => {
    setSelectedId(template._id);
    setMessage(interpolateTemplate(template.body, vars));
  };

  const send = () => {
    openWhatsAppPopup(phone, message);
    setOpen(false);
  };

  return (
    <>
      <button type="button" className={className} style={style} onClick={openPicker}>
        {label}
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Send WhatsApp Message" width={520}>
        {isLoading && <Spinner />}

        {!isLoading && templates.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <p style={{ fontSize: 12, color: 'var(--brown-soft)', marginBottom: 8 }}>Choose a template</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 180, overflowY: 'auto' }}>
              {templates.map((t) => (
                <button
                  type="button"
                  key={t._id}
                  onClick={() => pickTemplate(t)}
                  className="btn btn-outline btn-sm"
                  style={{
                    justifyContent: 'flex-start',
                    textAlign: 'left',
                    borderColor: selectedId === t._id ? 'var(--accent)' : undefined,
                    background: selectedId === t._id ? 'rgba(193,83,27,0.08)' : undefined,
                  }}
                >
                  {t.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {!isLoading && templates.length === 0 && (
          <p style={{ fontSize: 13, color: 'var(--brown-soft)', marginBottom: 14 }}>
            No WhatsApp templates yet — add one from the WhatsApp Templates page, or just write a message below.
          </p>
        )}

        <div className="field">
          <label>Message</label>
          <textarea
            className="textarea"
            rows={5}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
          <button type="button" className="btn btn-outline btn-block" onClick={() => setOpen(false)}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary btn-block" disabled={!message.trim()} onClick={send}>
            Send via WhatsApp
          </button>
        </div>
      </Modal>
    </>
  );
}
