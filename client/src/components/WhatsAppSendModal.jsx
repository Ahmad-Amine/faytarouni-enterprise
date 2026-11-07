import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import Modal from './Modal';
import { ErrorBanner, Spinner } from './Feedback';
import { adminWhatsAppService } from '../services/adminService';
import { whatsappTemplateService } from '../services/resourceService';
import { usePermission } from '../hooks/usePermission';
import { pushToast } from '../store/slices/uiSlice';
import { PERMISSIONS } from '../utils/permissions';
import { interpolateTemplate, openWhatsAppPopup } from '../utils/whatsapp';

export function useWhatsAppAccess(appointmentId) {
  const canUseInbox = usePermission(PERMISSIONS.WHATSAPP_INBOX);
  const canSend = usePermission(PERMISSIONS.WHATSAPP_SEND);
  const { data: status } = useQuery({
    queryKey: ['admin', 'whatsapp', 'status'],
    queryFn: adminWhatsAppService.status,
    staleTime: 60000,
  });
  const connected = Boolean(status?.connected);
  const usesAppointmentRoute = canSend && Boolean(appointmentId);
  return {
    connected,
    usesAppointmentRoute,
    // Once connected every message goes through the API, so it is recorded and
    // replies reach the inbox. The popup only covers the time before that.
    canSendThroughApi: connected && (usesAppointmentRoute || canUseInbox),
  };
}

export default function WhatsAppSendModal({ open, onClose, phone, vars = {}, initialMessage = '', appointmentId, title }) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const queryClient = useQueryClient();
  const { connected, usesAppointmentRoute, canSendThroughApi } = useWhatsAppAccess(appointmentId);
  const [selectedId, setSelectedId] = useState(null);
  const [message, setMessage] = useState(initialMessage);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSelectedId(null);
    setMessage(initialMessage);
    setError('');
  }, [open, initialMessage]);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'whatsapp-templates', 'picker'],
    queryFn: () => whatsappTemplateService.list({ limit: 100 }),
    enabled: open,
  });
  // The API can only send templates Meta has approved.
  const templates = (data?.data || []).filter((template) => !connected || template.metaName);

  const pickTemplate = (template) => {
    if (selectedId === template._id) {
      setSelectedId(null);
      setMessage(initialMessage);
      return;
    }
    setSelectedId(template._id);
    setMessage(interpolateTemplate(template.body, vars));
  };

  const sendThroughApi = async () => {
    const payload = selectedId ? { templateId: selectedId, vars } : { text: message.trim() };
    if (usesAppointmentRoute) return adminWhatsAppService.sendForAppointment(appointmentId, payload);

    const conversation = await adminWhatsAppService.open({ phone, name: vars.name });
    return selectedId
      ? adminWhatsAppService.sendTemplate(conversation._id, payload)
      : adminWhatsAppService.sendText(conversation._id, payload.text);
  };

  const send = async () => {
    if (!canSendThroughApi) {
      openWhatsAppPopup(phone, message);
      onClose();
      return;
    }

    setSending(true);
    setError('');
    try {
      const sent = await sendThroughApi();
      queryClient.invalidateQueries({ queryKey: ['admin', 'whatsapp'] });
      if (sent.status === 'failed') {
        setError(sent.errorMessage || t('whatsapp.sendFailed'));
        return;
      }
      dispatch(pushToast(t('whatsapp.messageSent')));
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={title || t('whatsapp.sendTitle')} width={520}>
      {isLoading && <Spinner />}

      {!isLoading && templates.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <p className="wa-hint" style={{ marginBottom: 8 }}>{t('whatsapp.chooseTemplate')}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 180, overflowY: 'auto' }}>
            {templates.map((template) => (
              <button
                type="button"
                key={template._id}
                onClick={() => pickTemplate(template)}
                className="btn btn-outline btn-sm"
                style={{
                  justifyContent: 'flex-start',
                  textAlign: 'start',
                  borderColor: selectedId === template._id ? 'var(--accent)' : undefined,
                  background: selectedId === template._id ? 'rgba(193,83,27,0.08)' : undefined,
                }}
              >
                {template.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <ErrorBanner message={error} />

      <div className="field">
        <label>{t('whatsapp.messageLabel')}</label>
        <textarea
          className="textarea"
          rows={5}
          maxLength={4096}
          value={message}
          readOnly={canSendThroughApi && Boolean(selectedId)}
          onChange={(e) => setMessage(e.target.value)}
        />
        {canSendThroughApi && !selectedId && <p className="wa-hint">{t('whatsapp.freeTextHint')}</p>}
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
        <button type="button" className="btn btn-outline btn-block" onClick={onClose}>{t('whatsapp.cancel')}</button>
        <button type="button" className="btn btn-primary btn-block" disabled={!message.trim() || sending} onClick={send}>
          {sending ? t('whatsapp.sending') : t('whatsapp.sendViaWhatsApp')}
        </button>
      </div>
    </Modal>
  );
}
