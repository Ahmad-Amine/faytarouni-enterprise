import { useState } from 'react';
import { usePermission } from '../../hooks/usePermission';
import { PERMISSIONS } from '../../utils/permissions';
import Categories from './Categories';
import Services from './Services';

const TABS = [
  { key: 'categories', label: 'Categories', permission: PERMISSIONS.CATEGORIES_MANAGE, Component: Categories },
  { key: 'services', label: 'Services', permission: PERMISSIONS.SERVICES_MANAGE, Component: Services },
];

export default function Catalog() {
  const canCategories = usePermission(PERMISSIONS.CATEGORIES_MANAGE);
  const canServices = usePermission(PERMISSIONS.SERVICES_MANAGE);
  const visibleTabs = TABS.filter((t) => (t.key === 'categories' ? canCategories : canServices));
  const [tab, setTab] = useState(visibleTabs[0]?.key);

  const active = visibleTabs.find((t) => t.key === tab) || visibleTabs[0];

  return (
    <div>
      <div className="page-head"><h1>Categories & Services</h1></div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {visibleTabs.map((t) => (
          <button
            key={t.key}
            type="button"
            className={t.key === active?.key ? 'btn btn-primary btn-sm' : 'btn btn-outline btn-sm'}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>
      {active && <active.Component />}
    </div>
  );
}
