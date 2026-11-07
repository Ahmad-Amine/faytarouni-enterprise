import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { adminWhatsAppService } from '../../services/adminService';
import { whatsappTemplateService } from '../../services/resourceService';
import { Spinner, EmptyState, ErrorBanner } from '../../components/Feedback';
import { templatePlaceholders } from '../../utils/whatsapp';

const PAGE_SIZE = 50;
const AUTO_FILLED_VARS = ['name', 'businessName'];
const ATTACHMENT_TYPES = 'image/jpeg,image/png,audio/aac,audio/mp4,audio/mpeg,audio/amr,audio/ogg,video/mp4,video/3gpp,application/pdf,text/plain,.doc,.docx,.xls,.xlsx,.ppt,.pptx';
const STATUS_TICKS = { queued: '🕓', sent: '✓', delivered: '✓✓', read: '✓✓', failed: '⚠' };

function formatStamp(value) {
  return value ? new Date(value).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : '';
}

function ConversationList({ selectedId, onSelect }) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'whatsapp', 'conversations', search],
    queryFn: () => adminWhatsAppService.conversations({ limit: 50, ...(search ? { search } : {}) }),
    refetchInterval: 30000,
  });
  const conversations = (data?.data || []).filter((c) => c.lastMessageAt || c._id === selectedId);

  return (
    <div className="wa-list">
      <input
        className="input"
        placeholder={t('whatsapp.searchPlaceholder')}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      {isLoading && <Spinner />}
      {!isLoading && conversations.length === 0 && <EmptyState>{t('whatsapp.noConversations')}</EmptyState>}
      {conversations.map((c) => (
        <button
          type="button"
          key={c._id}
          className={`wa-list-item${c._id === selectedId ? ' active' : ''}`}
          onClick={() => onSelect(c._id)}
        >
          <span className="wa-list-row">
            <strong>{c.displayName}</strong>
            {c.unreadCount > 0 && <span className="wa-unread">{c.unreadCount}</span>}
          </span>
          <span className="wa-list-preview">{c.lastMessagePreview || (c.lastMessageType !== 'text' ? t(`whatsapp.type.${c.lastMessageType}`, t('whatsapp.type.other')) : '')}</span>
        </button>
      ))}
    </div>
  );
}

function MessageMedia({ message }) {
  const { t } = useTranslation();
  const url = adminWhatsAppService.mediaUrl(message._id);
  if (!message.media?.id) {
    return message.text ? null : <em>{t(`whatsapp.type.${message.type}`, t('whatsapp.type.other'))}</em>;
  }
  if (message.type === 'image' || message.type === 'sticker') {
    return <a href={url} target="_blank" rel="noreferrer"><img className="wa-media" src={url} alt={t('whatsapp.type.image')} loading="lazy" /></a>;
  }
  if (message.type === 'video') return <video className="wa-media" src={url} controls preload="none" />;
  if (message.type === 'audio') return <audio src={url} controls preload="none" />;
  return <a href={url} className="wa-file">📄 {message.media.filename || t('whatsapp.type.document')}</a>;
}

function MessageBubble({ message }) {
  const { t } = useTranslation();
  const outbound = message.direction === 'outbound';
  return (
    <div className={`wa-message ${outbound ? 'outbound' : 'inbound'}`}>
      <div className={`wa-bubble${message.status === 'failed' ? ' failed' : ''}`}>
        {message.broadcast && <span className="wa-tag">{t('whatsapp.broadcastTag')}</span>}
        {message.event && <span className="wa-tag">{t('whatsapp.automaticTag')}</span>}
        <MessageMedia message={message} />
        {message.text && <p className="wa-text">{message.text}</p>}
        {message.status === 'failed' && <p className="wa-error">{message.errorMessage || t('whatsapp.sendFailed')}</p>}
        <span className="wa-meta">
          {outbound && message.sentBy?.name && <span>{message.sentBy.name} · </span>}
          {formatStamp(message.messageAt)}
          {outbound && (
            <span className={`wa-tick${message.status === 'read' ? ' read' : ''}`} title={t(`whatsapp.status.${message.status}`)}>
              {' '}{STATUS_TICKS[message.status]}
            </span>
          )}
        </span>
      </div>
    </div>
  );
}

function TemplatePicker({ conversationId, onSent }) {
  const { t } = useTranslation();
  const [templateId, setTemplateId] = useState('');
  const [vars, setVars] = useState({});
  const { data } = useQuery({
    queryKey: ['admin', 'whatsapp-templates', 'approved'],
    queryFn: () => whatsappTemplateService.list({ limit: 100 }),
  });
  const templates = (data?.data || []).filter((template) => template.metaName);
  const selected = templates.find((template) => template._id === templateId);
  const manualVars = selected ? templatePlaceholders(selected.body).filter((name) => !AUTO_FILLED_VARS.includes(name)) : [];

  const mutation = useMutation({
    mutationFn: () => adminWhatsAppService.sendTemplate(conversationId, { templateId, vars }),
    onSuccess: () => { setTemplateId(''); onSent(); },
  });

  if (templates.length === 0) return <p className="wa-hint">{t('whatsapp.noApprovedTemplates')}</p>;

  return (
    <div className="wa-template">
      <ErrorBanner message={mutation.error?.message} />
      <select className="select" value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
        <option value="">{t('whatsapp.chooseTemplate')}</option>
        {templates.map((template) => <option key={template._id} value={template._id}>{template.name}</option>)}
      </select>
      {selected && <p className="wa-hint">{selected.body}</p>}
      {manualVars.map((name) => (
        <input
          key={name}
          className="input"
          placeholder={name}
          value={vars[name] || ''}
          onChange={(e) => setVars({ ...vars, [name]: e.target.value })}
        />
      ))}
      <button
        type="button"
        className="btn btn-primary btn-sm"
        disabled={!selected || mutation.isPending || manualVars.some((name) => !vars[name]?.trim())}
        onClick={() => mutation.mutate()}
      >
        {mutation.isPending ? t('whatsapp.sending') : t('whatsapp.sendTemplate')}
      </button>
    </div>
  );
}

function Composer({ conversation, onSent }) {
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const [file, setFile] = useState(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const fileInput = useRef(null);

  const mutation = useMutation({
    mutationFn: () => (
      file
        ? adminWhatsAppService.sendMedia(conversation._id, file, text.trim())
        : adminWhatsAppService.sendText(conversation._id, text.trim())
    ),
    onSuccess: () => {
      setText('');
      setFile(null);
      if (fileInput.current) fileInput.current.value = '';
      onSent();
    },
  });

  const submit = (e) => {
    e.preventDefault();
    if (file || text.trim()) mutation.mutate();
  };

  const templatesVisible = showTemplates || !conversation.windowOpen;

  return (
    <div className="wa-composer">
      <ErrorBanner message={mutation.error?.message} />
      {!conversation.windowOpen && <p className="wa-notice">{t('whatsapp.windowClosed')}</p>}
      {conversation.optedOut && <p className="wa-notice">{t('whatsapp.optedOut')}</p>}
      {templatesVisible && !conversation.optedOut && (
        <TemplatePicker conversationId={conversation._id} onSent={onSent} />
      )}
      {conversation.windowOpen && (
        <form onSubmit={submit}>
          {file && (
            <p className="wa-hint">
              📎 {file.name}{' '}
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setFile(null); fileInput.current.value = ''; }}>
                {t('whatsapp.removeFile')}
              </button>
            </p>
          )}
          <textarea
            className="textarea"
            rows={2}
            maxLength={file ? 1024 : 4096}
            placeholder={file ? t('whatsapp.captionPlaceholder') : t('whatsapp.messagePlaceholder')}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) submit(e); }}
          />
          <div className="wa-composer-actions">
            <input ref={fileInput} type="file" hidden accept={ATTACHMENT_TYPES} onChange={(e) => setFile(e.target.files[0] || null)} />
            <button type="button" className="btn btn-outline btn-sm" onClick={() => fileInput.current.click()}>📎 {t('whatsapp.attach')}</button>
            {!conversation.optedOut && (
              <button type="button" className="btn btn-outline btn-sm" onClick={() => setShowTemplates((open) => !open)}>
                {t('whatsapp.templates')}
              </button>
            )}
            <button type="submit" className="btn btn-primary btn-sm" disabled={mutation.isPending || (!file && !text.trim())}>
              {mutation.isPending ? t('whatsapp.sending') : t('whatsapp.send')}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function Thread({ conversationId, onBack }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [limit, setLimit] = useState(PAGE_SIZE);
  const bottomRef = useRef(null);

  const { data: conversation, isError, error } = useQuery({
    queryKey: ['admin', 'whatsapp', 'conversation', conversationId],
    queryFn: () => adminWhatsAppService.conversation(conversationId),
    refetchInterval: 30000,
  });
  const { data: messagesData, isLoading } = useQuery({
    queryKey: ['admin', 'whatsapp', 'messages', conversationId, limit],
    queryFn: () => adminWhatsAppService.messages(conversationId, { limit }),
    refetchInterval: 30000,
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['admin', 'whatsapp'] });
  const messages = [...(messagesData?.data || [])].reverse();
  const newestId = messages[messages.length - 1]?._id;
  const unreadCount = conversation?.unreadCount || 0;

  useEffect(() => {
    if (unreadCount > 0) adminWhatsAppService.markRead(conversationId).then(refresh).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, unreadCount]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'nearest' });
  }, [newestId]);

  if (isError) return <div className="wa-thread"><ErrorBanner message={error.message} /></div>;
  if (!conversation) return <div className="wa-thread"><Spinner /></div>;

  return (
    <div className="wa-thread">
      <div className="wa-thread-head">
        <button type="button" className="btn btn-ghost btn-sm wa-back" onClick={onBack}>{t('whatsapp.back')}</button>
        <div>
          <strong>{conversation.displayName}</strong>
          <p className="wa-hint" dir="ltr">+{conversation.waId}</p>
        </div>
      </div>
      <div className="wa-messages">
        {(messagesData?.meta?.total || 0) > limit && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setLimit((value) => Math.min(value + PAGE_SIZE, 200))} disabled={limit >= 200}>
            {t('whatsapp.loadOlder')}
          </button>
        )}
        {isLoading && <Spinner />}
        {!isLoading && messages.length === 0 && <EmptyState>{t('whatsapp.noMessages')}</EmptyState>}
        {messages.map((message) => <MessageBubble key={message._id} message={message} />)}
        <div ref={bottomRef} />
      </div>
      <Composer key={conversationId} conversation={conversation} onSent={refresh} />
    </div>
  );
}

export default function WhatsAppInbox() {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const selectedId = params.get('c');
  const { data: status } = useQuery({
    queryKey: ['admin', 'whatsapp', 'status'],
    queryFn: adminWhatsAppService.status,
  });

  return (
    <div>
      <div className="page-head"><h1>{t('whatsapp.inboxTitle')}</h1></div>
      {status?.connected === false && <p className="wa-notice">{t('whatsapp.notConnected')}</p>}
      <div className={`wa-inbox card${selectedId ? ' has-selection' : ''}`}>
        <ConversationList selectedId={selectedId} onSelect={(id) => setParams({ c: id })} />
        {selectedId
          ? <Thread key={selectedId} conversationId={selectedId} onBack={() => setParams({})} />
          : <div className="wa-thread wa-thread-empty"><EmptyState>{t('whatsapp.selectConversation')}</EmptyState></div>}
      </div>
    </div>
  );
}
