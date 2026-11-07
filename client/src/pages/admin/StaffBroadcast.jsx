import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { adminWhatsAppService } from '../../services/adminService';
import { roleService } from '../../services/resourceService';
import { Spinner, EmptyState, ErrorBanner } from '../../components/Feedback';
import { pushToast } from '../../store/slices/uiSlice';

const MAX_LENGTH = 900;

function BroadcastCard({ broadcast }) {
  const { t } = useTranslation();
  const { statuses = {}, recipientCount, failures = [], skipped = [] } = broadcast;
  const read = statuses.read || 0;
  const delivered = (statuses.delivered || 0) + read;
  const failed = statuses.failed || 0;
  const accepted = (statuses.sent || 0) + delivered;
  const pending = Math.max(0, recipientCount - accepted - failed);

  return (
    <div className="card">
      <p className="wa-text">{broadcast.message}</p>
      <p className="wa-hint" style={{ marginTop: 8 }}>
        {broadcast.senderName} · {new Date(broadcast.createdAt).toLocaleString()}
      </p>
      <p style={{ fontSize: 13, marginTop: 6 }}>
        {t('whatsapp.broadcastCounts', { recipients: recipientCount, delivered, read, failed })}
        {pending > 0 && ` · ${t('whatsapp.broadcastPending', { count: pending })}`}
      </p>
      {failures.map((failure, index) => (
        <p key={index} className="wa-error">{failure.name}: {failure.error}</p>
      ))}
      {skipped.map((person) => (
        <p key={person.user} className="wa-hint">{person.name}: {t(`whatsapp.skipped.${person.reason}`)}</p>
      ))}
    </div>
  );
}

export default function StaffBroadcast() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState('');
  const [roleIds, setRoleIds] = useState([]);

  const { data: status } = useQuery({
    queryKey: ['admin', 'whatsapp', 'status'],
    queryFn: adminWhatsAppService.status,
    retry: false,
  });
  const { data: rolesData } = useQuery({
    queryKey: ['admin', 'roles', 'broadcast'],
    queryFn: () => roleService.list({ limit: 100 }),
    retry: false,
  });
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'whatsapp', 'broadcasts'],
    queryFn: () => adminWhatsAppService.broadcasts({ limit: 20 }),
    refetchInterval: 15000,
  });

  const roles = (rolesData?.data || []).filter((role) => role.name !== 'customer');
  const broadcasts = data?.data || [];

  const mutation = useMutation({
    mutationFn: () => adminWhatsAppService.createBroadcast({
      message: message.trim(),
      ...(roleIds.length ? { roleIds } : {}),
    }),
    onSuccess: () => {
      setMessage('');
      setRoleIds([]);
      dispatch(pushToast(t('whatsapp.broadcastStarted')));
      queryClient.invalidateQueries({ queryKey: ['admin', 'whatsapp', 'broadcasts'] });
    },
  });

  const toggleRole = (id) => {
    setRoleIds((current) => (current.includes(id) ? current.filter((value) => value !== id) : [...current, id]));
  };

  const submit = (e) => {
    e.preventDefault();
    if (window.confirm(t('whatsapp.broadcastConfirm'))) mutation.mutate();
  };

  return (
    <div>
      <div className="page-head"><h1>{t('whatsapp.broadcastTitle')}</h1></div>
      {status?.connected === false && <p className="wa-notice">{t('whatsapp.notConnected')}</p>}

      <form className="card" onSubmit={submit} style={{ marginBottom: 20 }}>
        <ErrorBanner message={mutation.error?.message} />
        <div className="field">
          <label>{t('whatsapp.broadcastMessage')}</label>
          <textarea
            className="textarea"
            rows={4}
            maxLength={MAX_LENGTH}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <p className="wa-hint">{t('whatsapp.broadcastFormatHint')} ({message.length}/{MAX_LENGTH})</p>
        </div>
        {roles.length > 0 && (
          <div className="field">
            <label>{t('whatsapp.broadcastRoles')}</label>
            <div className="wa-role-options">
              {roles.map((role) => (
                <label key={role._id} className="wa-checkbox">
                  <input type="checkbox" checked={roleIds.includes(role._id)} onChange={() => toggleRole(role._id)} />
                  <span>{role.name}</span>
                </label>
              ))}
            </div>
            <p className="wa-hint">{t('whatsapp.broadcastRolesHint')}</p>
          </div>
        )}
        <button type="submit" className="btn btn-primary" disabled={mutation.isPending || !message.trim()}>
          {mutation.isPending ? t('whatsapp.sending') : t('whatsapp.broadcastSend')}
        </button>
      </form>

      <h2 style={{ fontSize: 18, marginBottom: 12 }}>{t('whatsapp.broadcastHistory')}</h2>
      {isLoading && <Spinner />}
      {!isLoading && broadcasts.length === 0 && <EmptyState>{t('whatsapp.broadcastEmpty')}</EmptyState>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {broadcasts.map((broadcast) => <BroadcastCard key={broadcast._id} broadcast={broadcast} />)}
      </div>
    </div>
  );
}
