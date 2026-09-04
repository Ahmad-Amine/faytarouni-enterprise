import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminSettingsService } from '../../services/adminService';
import { Spinner } from '../../components/Feedback';

const CONTENT_KEYS = [
  { key: 'brand_name', label: 'Brand name (used if no logo image is set)' },
  { key: 'hero_title', label: 'Home — hero title' },
  { key: 'hero_subtitle', label: 'Home — hero subtitle' },
  { key: 'hero_cta_primary', label: 'Home — primary button text' },
  { key: 'hero_cta_secondary', label: 'Home — secondary button text' },
  { key: 'barbers_section_title', label: 'Home/Barbers page — section title' },
  { key: 'services_section_title', label: 'Home — services section title' },
  { key: 'booking_page_title', label: 'Booking page — title' },
  { key: 'shop_page_title', label: 'Shop page — title' },
  { key: 'footer_tagline', label: 'Footer — tagline' },
];

const CONTACT_TYPES = ['whatsapp', 'instagram', 'facebook', 'tiktok', 'phone', 'email', 'other'];

export default function Settings() {
  const queryClient = useQueryClient();
  const { data: settings, isLoading } = useQuery({ queryKey: ['admin', 'settings'], queryFn: adminSettingsService.get });

  const [rules, setRules] = useState(null);
  const [textForm, setTextForm] = useState({ key: '', en: '', ar: '' });
  const [contacts, setContacts] = useState(null);
  const [newContact, setNewContact] = useState({ type: 'whatsapp', label: '', value: '' });

  const rulesMutation = useMutation({
    mutationFn: adminSettingsService.updateRules,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'settings'] }),
  });
  const textMutation = useMutation({
    mutationFn: adminSettingsService.updateText,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'settings'] });
      queryClient.invalidateQueries({ queryKey: ['settings', 'public'] });
    },
  });
  const contactsMutation = useMutation({
    mutationFn: (payload) => adminSettingsService.updateContacts?.(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'settings'] });
      queryClient.invalidateQueries({ queryKey: ['settings', 'public'] });
    },
  });

  if (isLoading) return <Spinner />;

  const r = rules || {
    businessName: settings.businessName,
    logoUrl: settings.logoUrl,
    currency: settings.currency,
    loyaltyAppointmentThreshold: settings.loyaltyAppointmentThreshold,
    whatsappAdminNumber: settings.whatsappAdminNumber,
    primaryColor: settings.theme?.primaryColor,
  };
  const contactList = contacts || settings.contacts || [];

  const loadKey = (key) => {
    const existing = settings.texts?.[key];
    setTextForm({ key, en: existing?.en || '', ar: existing?.ar || '' });
  };

  const addContact = () => {
    if (!newContact.value) return;
    setContacts([...contactList, newContact]);
    setNewContact({ type: 'whatsapp', label: '', value: '' });
  };
  const removeContact = (idx) => setContacts(contactList.filter((_, i) => i !== idx));

  return (
    <div>
      <div className="page-head"><h1>Settings</h1></div>
      <div className="grid-stack-mobile" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <div>
          <div className="card" style={{ marginBottom: 20 }}>
            <h3 style={{ marginBottom: 14 }}>Business & Branding</h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                rulesMutation.mutate(r);
              }}
            >
              <div className="field"><label>Business name</label><input className="input" value={r.businessName} onChange={(e) => setRules({ ...r, businessName: e.target.value })} /></div>
              <div className="field">
                <label>Logo image URL</label>
                <input className="input" placeholder="https://..." value={r.logoUrl || ''} onChange={(e) => setRules({ ...r, logoUrl: e.target.value })} />
                <p style={{ fontSize: 12, color: 'var(--brown-soft)', marginTop: 4 }}>Leave blank to show the business name as text instead.</p>
              </div>
              <div className="field"><label>Currency</label><input className="input" value={r.currency} onChange={(e) => setRules({ ...r, currency: e.target.value })} /></div>
              <div className="field"><label>Loyalty threshold (appointments)</label><input className="input" type="number" value={r.loyaltyAppointmentThreshold} onChange={(e) => setRules({ ...r, loyaltyAppointmentThreshold: Number(e.target.value) })} /></div>
              <div className="field"><label>Admin WhatsApp number</label><input className="input" value={r.whatsappAdminNumber} onChange={(e) => setRules({ ...r, whatsappAdminNumber: e.target.value })} /></div>
              <div className="field"><label>Accent color</label><input className="input" type="color" value={r.primaryColor} onChange={(e) => setRules({ ...r, primaryColor: e.target.value })} style={{ height: 44 }} /></div>
              <button type="submit" className="btn btn-primary btn-block" disabled={rulesMutation.isPending}>Save</button>
            </form>
          </div>

          <div className="card">
            <h3 style={{ marginBottom: 6 }}>Footer Contacts</h3>
            <p style={{ fontSize: 12, color: 'var(--brown-soft)', marginBottom: 14 }}>WhatsApp, Instagram, and any other links shown in the site footer.</p>
            {contactList.map((c, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '6px 0', borderTop: i > 0 ? '1px solid #ecdfc2' : 'none' }}>
                <span className="badge badge-confirmed">{c.type}</span>
                <span style={{ flex: 1, fontSize: 13 }}>{c.label || c.value}</span>
                <button type="button" className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => removeContact(i)}>Remove</button>
              </div>
            ))}
            <div className="grid-stack-mobile" style={{ display: 'grid', gridTemplateColumns: '110px 1fr 1fr', gap: 8, marginTop: 12 }}>
              <select className="select" value={newContact.type} onChange={(e) => setNewContact({ ...newContact, type: e.target.value })}>
                {CONTACT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <input className="input" placeholder="Label (optional)" value={newContact.label} onChange={(e) => setNewContact({ ...newContact, label: e.target.value })} />
              <input
                className="input"
                placeholder={newContact.type === 'whatsapp' || newContact.type === 'phone' ? 'Phone number' : 'URL or value'}
                value={newContact.value}
                onChange={(e) => setNewContact({ ...newContact, value: e.target.value })}
              />
            </div>
            <button type="button" className="btn btn-outline btn-sm" style={{ marginTop: 10 }} onClick={addContact}>+ Add contact</button>
            <button
              type="button"
              className="btn btn-primary btn-block"
              style={{ marginTop: 14 }}
              disabled={contactsMutation.isPending}
              onClick={() => contactsMutation.mutate({ contacts: contactList })}
            >
              Save Contacts
            </button>
          </div>
        </div>

        <div>
          <div className="card">
            <h3 style={{ marginBottom: 6 }}>Page Content</h3>
            <p style={{ fontSize: 12, color: 'var(--brown-soft)', marginBottom: 12 }}>
              Edit any text shown on the public site, in both languages. Click a field below to load it.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
              {CONTENT_KEYS.map((k) => (
                <button key={k.key} type="button" className="btn btn-outline btn-sm" onClick={() => loadKey(k.key)}>
                  {k.label}
                </button>
              ))}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                textMutation.mutate(textForm);
              }}
            >
              <div className="field"><label>Key</label><input className="input" required value={textForm.key} onChange={(e) => setTextForm({ ...textForm, key: e.target.value })} /></div>
              <div className="field"><label>English</label><textarea className="textarea" rows={2} value={textForm.en} onChange={(e) => setTextForm({ ...textForm, en: e.target.value })} /></div>
              <div className="field"><label>Arabic</label><textarea className="textarea" rows={2} dir="rtl" value={textForm.ar} onChange={(e) => setTextForm({ ...textForm, ar: e.target.value })} /></div>
              <button type="submit" className="btn btn-primary btn-block" disabled={textMutation.isPending}>Save Text</button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
