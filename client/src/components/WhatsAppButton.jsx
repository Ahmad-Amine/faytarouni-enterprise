import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import Modal from './Modal';
import { ErrorBanner, Spinner } from './Feedback';
import { adminWhatsAppService } from '../services/adminService';
import { whatsappTemplateService } from '../services/resourceService';
import { usePermission } from '../hooks/usePermission';
import { pushToast } from '../store/slices/uiSlice';
import { PERMISSIONS } from '../utils/permissions';
import { interpolateTemplate, openWhatsAppPopup } from '../utils/whatsapp';

export default function WhatsAppButton(
  { phone, vars = {}, fallbackMessage = '', label = 'WhatsApp', className = 'btn btn-secondary btn-sm', style, appointmentId }
) {
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [message, setMessage] = useState('');
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const canUseInbox = usePermission(PERMISSIONS.WHATSAPP_INBOX);
  const canSend = usePermission(PERMISSIONS.WHATSAPP_SEND);

  const { data: status } = useQuery({
    queryKey: ['admin', 'whatsapp', 'status'],
    queryFn: adminWhatsAppService.status,
    staleTime: 60000,
  });
  const connected = Boolean(status?.connected);
  const sendsThroughServer = connected && !canUseInbox && canSend && Boolean(appointmentId);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'whatsapp-templates', 'picker'],
    queryFn: () => whatsappTemplateService.list({ limit: 100 }),
    enabled: open,
  });
  // Only templates approved by Meta can go through the API.
  const templates = (data?.data || []).filter((t) => !connected || t.metaName);

  // With the API connected every message goes through the server so it is
  // recorded and replies reach the inbox. The wa.me-style popup is only the
  // fallback for before WhatsApp is connected.
  const openInbox = async () => {
    try {
      const conversation = await adminWhatsAppService.open({ phone, name: vars.name });
      navigate(`/admin/whatsapp?c=${conversation._id}`, { state: { vars } });
    } catch (err) {
      dispatch(pushToast(err.message, 'error'));
    }
  };

  const openPicker = () => {
    if (connected && canUseInbox) {
      openInbox();
      return;
    }
    setError('');
    setSelectedId(null);
    setMessage(fallbackMessage);
    setOpen(true);
  };

  const pickTemplate = (template) => {
    setSelectedId(template._id);
    setMessage(interpolateTemplate(template.body, vars));
  };

  const sendThroughServer = async () => {
    setSending(true);
    setError('');
    try {
      const sent = await adminWhatsAppService.sendForAppointment(
        appointmentId,
        selectedId ? { templateId: selectedId, vars } : { text: message.trim() }
      );
      if (sent.status === 'failed') {
        setError(sent.errorMessage || 'This message was not delivered.');
        return;
      }
      dispatch(pushToast('WhatsApp message sent.'));
      setOpen(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  const send = () => {
    if (sendsThroughServer) {
      sendThroughServer();
      return;
    }
    openWhatsAppPopup(phone, message);
    setOpen(false);
  };

  if (connected && !canUseInbox && !sendsThroughServer) return null;

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

        <ErrorBanner message={error} />

        <div className="field">
          <label>Message</label>
          <textarea
            className="textarea"
            rows={5}
            value={message}
            readOnly={sendsThroughServer && Boolean(selectedId)}
            onChange={(e) => setMessage(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
          <button type="button" className="btn btn-outline btn-block" onClick={() => setOpen(false)}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary btn-block" disabled={!message.trim() || sending} onClick={send}>
            {sending ? 'Sending...' : 'Send via WhatsApp'}
          </button>
        </div>
      </Modal>
    </>
  );
}
