import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminStaffService } from '../../services/adminService';
import { roleService, barberAdminService } from '../../services/resourceService';
import { catalogService } from '../../services/publicService';
import Modal from '../../components/Modal';
import { Spinner, ErrorBanner } from '../../components/Feedback';

const emptyBarberForm = { photoUrl: '', bio: '', specialties: '', serviceIds: [], isActive: true, holidays: [] };

export default function Staff() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['admin', 'staff'], queryFn: () => adminStaffService.list({ limit: 100 }) });
  const { data: roles } = useQuery({ queryKey: ['admin', 'roles'], queryFn: () => roleService.list() });
  const { data: services = [] } = useQuery({ queryKey: ['services'], queryFn: () => catalogService.services() });

  const staff = data?.data || [];
  const roleList = roles?.data || [];

  const invalidateStaff = () => queryClient.invalidateQueries({ queryKey: ['admin', 'staff'] });

  const assignMutation = useMutation({
    mutationFn: ({ id, roleId }) => adminStaffService.assignRole(id, roleId),
    onSuccess: invalidateStaff,
  });

  const [addOpen, setAddOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [pickRoleId, setPickRoleId] = useState('');

  const searchMutation = useMutation({
    mutationFn: (q) => adminStaffService.searchUsers(q),
    onSuccess: (res) => setSearchResults(res.data || []),
  });

  const openAdd = () => {
    setSearchInput('');
    setSearchResults([]);
    setPickRoleId(roleList.find((r) => r.name !== 'customer')?._id || '');
    searchMutation.reset();
    setAddOpen(true);
  };

  const runSearch = (e) => {
    e.preventDefault();
    if (searchInput.trim()) searchMutation.mutate(searchInput.trim());
  };

  const addAsStaff = async (user) => {
    if (!pickRoleId) return;
    await assignMutation.mutateAsync({ id: user._id, roleId: pickRoleId });
    setAddOpen(false);
  };

  const [editing, setEditing] = useState(null);
  const [editRoleId, setEditRoleId] = useState('');
  const [barberForm, setBarberForm] = useState(emptyBarberForm);
  const [barberId, setBarberId] = useState(null);
  const [barberChecked, setBarberChecked] = useState(false);
  const [barberLoading, setBarberLoading] = useState(false);
  const [newHoliday, setNewHoliday] = useState('');
  const [error, setError] = useState('');

  const editRole = roleList.find((r) => r._id === editRoleId);
  const isBarberRole = editRole?.name === 'barber';

  const openEdit = (s) => {
    setEditing(s);
    setEditRoleId(s.role?._id || '');
    setBarberForm(emptyBarberForm);
    setBarberId(null);
    setBarberChecked(false);
    setError('');
  };

  useEffect(() => {
    if (!editing || !isBarberRole || barberChecked) return;
    let cancelled = false;
    setBarberLoading(true);
    adminStaffService
      .getBarberProfile(editing._id)
      .then((b) => {
        if (cancelled || !b) return;
        setBarberId(b._id);
        setBarberForm({
          photoUrl: b.photoUrl || '',
          bio: b.bio || '',
          specialties: (b.specialties || []).join(', '),
          serviceIds: (b.services || []).map((sv) => sv._id || sv),
          isActive: b.isActive,
          holidays: (b.holidays || []).map((d) => new Date(d).toISOString().slice(0, 10)),
        });
      })
      .finally(() => {
        if (cancelled) return;
        setBarberLoading(false);
        setBarberChecked(true);
      });
    return () => {
      cancelled = true;
    };
  }, [editing, isBarberRole, barberChecked]);

  const toggleService = (id) =>
    setBarberForm((f) => ({ ...f, serviceIds: f.serviceIds.includes(id) ? f.serviceIds.filter((x) => x !== id) : [...f.serviceIds, id] }));

  const addHoliday = () => {
    if (!newHoliday || barberForm.holidays.includes(newHoliday)) return;
    setBarberForm((f) => ({ ...f, holidays: [...f.holidays, newHoliday].sort() }));
    setNewHoliday('');
  };
  const removeHoliday = (d) => setBarberForm((f) => ({ ...f, holidays: f.holidays.filter((h) => h !== d) }));

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editRoleId && editRoleId !== editing.role?._id) {
        await adminStaffService.assignRole(editing._id, editRoleId);
      }
      if (isBarberRole) {
        const payload = {
          name: editing.name,
          user: editing._id,
          photoUrl: barberForm.photoUrl,
          bio: barberForm.bio,
          specialties: barberForm.specialties.split(',').map((s) => s.trim()).filter(Boolean),
          services: barberForm.serviceIds,
          isActive: barberForm.isActive,
          holidays: barberForm.holidays,
        };
        if (barberId) await barberAdminService.update(barberId, payload);
        else await barberAdminService.create(payload);
      }
    },
    onSuccess: () => {
      invalidateStaff();
      queryClient.invalidateQueries({ queryKey: ['admin', 'barbers'] });
      setEditing(null);
    },
    onError: (e) => setError(e.message),
  });

  return (
    <div>
      <div className="page-head">
        <h1>Staff</h1>
        <button type="button" className="btn btn-primary" onClick={openAdd}>+ Add Staff</button>
      </div>
      {isLoading && <Spinner />}
      {!isLoading && (
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Actions</th></tr></thead>
            <tbody>
              {staff.map((s) => (
                <tr key={s._id}>
                  <td>{s.name}</td>
                  <td>{s.email}</td>
                  <td>{s.role?.name}</td>
                  <td><button type="button" className="btn btn-ghost btn-sm" onClick={() => openEdit(s)}>Edit</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}


      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add Staff">
        <form onSubmit={runSearch}>
          <ErrorBanner message={searchMutation.error?.message} />
          <div className="field">
            <label>Search by name, email, or phone</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input className="input" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} style={{ flex: 1 }} />
              <button type="submit" className="btn btn-primary btn-sm" disabled={searchMutation.isPending}>Search</button>
            </div>
          </div>
        </form>

        {searchMutation.isPending && <Spinner />}

        {searchResults.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <div className="field">
              <label>Assign role</label>
              <select className="select" value={pickRoleId} onChange={(e) => setPickRoleId(e.target.value)}>
                {roleList.map((r) => <option key={r._id} value={r._id}>{r.name}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
              {searchResults.map((u) => (
                <div key={u._id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 10 }}>
                  <div>
                    <p style={{ fontWeight: 700 }}>{u.name}</p>
                    <p style={{ fontSize: 12, color: 'var(--brown-soft)' }}>{u.email} · currently {u.role?.name}</p>
                  </div>
                  <button type="button" className="btn btn-outline btn-sm" disabled={assignMutation.isPending} onClick={() => addAsStaff(u)}>
                    Add as staff
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {searchMutation.isSuccess && searchResults.length === 0 && (
          <p style={{ fontSize: 13, color: 'var(--brown-soft)', marginTop: 8 }}>No matching registered users found.</p>
        )}
      </Modal>


      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing ? `Edit ${editing.name}` : ''} width={560}>
        {editing && (
          <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(); }}>
            <ErrorBanner message={error} />
            <div className="field">
              <label>Role</label>
              <select className="select" value={editRoleId} onChange={(e) => setEditRoleId(e.target.value)}>
                {roleList.map((r) => <option key={r._id} value={r._id}>{r.name}</option>)}
              </select>
            </div>

            {isBarberRole && (
              <div style={{ borderTop: '1px solid #ecdfc2', marginTop: 12, paddingTop: 12 }}>
                <p style={{ fontSize: 12, color: 'var(--brown-soft)', marginBottom: 10 }}>
                  Barber profile — shown on the public site.
                </p>
                {barberLoading ? <Spinner /> : (
                  <>
                    <div className="field"><label>Photo URL</label><input className="input" value={barberForm.photoUrl} onChange={(e) => setBarberForm({ ...barberForm, photoUrl: e.target.value })} /></div>
                    <div className="field"><label>Bio</label><textarea className="textarea" rows={3} value={barberForm.bio} onChange={(e) => setBarberForm({ ...barberForm, bio: e.target.value })} /></div>
                    <div className="field"><label>Specialties (comma separated)</label><input className="input" value={barberForm.specialties} onChange={(e) => setBarberForm({ ...barberForm, specialties: e.target.value })} /></div>
                    <div className="field">
                      <label>Services performed</label>
                      {services.map((s) => (
                        <label key={s._id} className="checkbox-row" style={{ marginBottom: 4 }}>
                          <input type="checkbox" checked={barberForm.serviceIds.includes(s._id)} onChange={() => toggleService(s._id)} />
                          {s.name}
                        </label>
                      ))}
                    </div>
                    <div className="field">
                      <label>Holiday / leave dates</label>
                      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                        <input className="input" type="date" value={newHoliday} onChange={(e) => setNewHoliday(e.target.value)} />
                        <button type="button" className="btn btn-outline btn-sm" onClick={addHoliday}>Add</button>
                      </div>
                      {barberForm.holidays.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {barberForm.holidays.map((d) => (
                            <span key={d} className="badge badge-pending" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              {d}
                              <button type="button" onClick={() => removeHoliday(d)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, color: 'var(--danger)' }}>×</button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <label className="checkbox-row" style={{ marginBottom: 16 }}>
                      <input type="checkbox" checked={barberForm.isActive} onChange={(e) => setBarberForm({ ...barberForm, isActive: e.target.checked })} /> Active (bookable)
                    </label>
                  </>
                )}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <button type="button" className="btn btn-outline btn-block" onClick={() => setEditing(null)}>Cancel</button>
              <button type="submit" className="btn btn-primary btn-block" disabled={saveMutation.isPending}>Save</button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
