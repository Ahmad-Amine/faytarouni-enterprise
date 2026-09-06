import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { roleService } from '../../services/resourceService';
import { adminRoleService } from '../../services/adminService';
import Modal from '../../components/Modal';
import { Spinner, ErrorBanner } from '../../components/Feedback';

export default function Roles() {
  const queryClient = useQueryClient();
  const { data: roles, isLoading } = useQuery({ queryKey: ['admin', 'roles'], queryFn: () => roleService.list() });
  const { data: allPermissions } = useQuery({ queryKey: ['admin', 'permissions'], queryFn: adminRoleService.permissions });

  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', permissions: [] });
  const [error, setError] = useState('');

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin', 'roles'] });
  const createMutation = useMutation({ mutationFn: roleService.create, onSuccess: () => { invalidate(); setEditing(null); }, onError: (e) => setError(e.message) });
  const updateMutation = useMutation({ mutationFn: ({ id, payload }) => roleService.update(id, payload), onSuccess: () => { invalidate(); setEditing(null); }, onError: (e) => setError(e.message) });
  const removeMutation = useMutation({ mutationFn: roleService.remove, onSuccess: invalidate, onError: (e) => alert(e.message) });

  const openNew = () => { setForm({ name: '', description: '', permissions: [] }); setError(''); setEditing({}); };
  const openEdit = (r) => { setForm({ name: r.name, description: r.description || '', permissions: r.permissions || [] }); setError(''); setEditing(r); };

  const togglePermission = (p) =>
    setForm((f) => ({ ...f, permissions: f.permissions.includes(p) ? f.permissions.filter((x) => x !== p) : [...f.permissions, p] }));

  const submit = (e) => {
    e.preventDefault();
    if (editing._id) updateMutation.mutate({ id: editing._id, payload: form });
    else createMutation.mutate(form);
  };

  const roleList = roles?.data || [];

  return (
    <div>
      <div className="page-head">
        <h1>Roles & Permissions</h1>
        <button type="button" className="btn btn-primary" onClick={openNew}>+ Add Role</button>
      </div>
      {isLoading && <Spinner />}
      <div className="table-wrap">
        <table className="data-table">
          <thead><tr><th>Name</th><th>Permissions</th><th>Actions</th></tr></thead>
          <tbody>
            {roleList.map((r) => (
              <tr key={r._id}>
                <td style={{ fontWeight: 700, textTransform: 'capitalize' }}>{r.name} {r.isSystem && <span style={{ fontSize: 11, color: 'var(--brown-soft)' }}>(system)</span>}</td>
                <td style={{ fontSize: 12 }}>{r.permissions.length} granted</td>
                <td>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => openEdit(r)}>Edit</button>
                  {!r.isSystem && (
                    <button type="button" className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => removeMutation.mutate(r._id)}>Delete</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing?._id ? 'Edit Role' : 'Add Role'} width={560}>
        <form onSubmit={submit}>
          <ErrorBanner message={error} />
          <div className="field">
            <label>Name</label>
            <input className="input" required disabled={editing?.isSystem} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="field">
            <label>Description</label>
            <input className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="field">
            <label>Permissions</label>
            <div className="grid-stack-mobile" style={{ maxHeight: 260, overflowY: 'auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
              {(allPermissions || []).map((p) => (
                <label key={p} className="checkbox-row" style={{ fontSize: 12 }}>
                  <input type="checkbox" checked={form.permissions.includes(p)} onChange={() => togglePermission(p)} />
                  {p}
                </label>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
            <button type="button" className="btn btn-outline btn-block" onClick={() => setEditing(null)}>Cancel</button>
            <button type="submit" className="btn btn-primary btn-block">Save</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
