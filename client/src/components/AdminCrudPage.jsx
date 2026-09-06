import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDispatch } from 'react-redux';
import Modal from './Modal';
import { Spinner, EmptyState, ErrorBanner } from './Feedback';
import { pushToast } from '../store/slices/uiSlice';

function defaultFormState(fields) {
  const state = {};
  fields.forEach((f) => {
    state[f.name] = f.type === 'checkbox' ? false : '';
  });
  return state;
}

export default function AdminCrudPage({ title, queryKey, service, columns, fields, searchable = true }) {
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [error, setError] = useState('');
  const queryClient = useQueryClient();
  const dispatch = useDispatch();

  const { data, isLoading, isError, error: queryError } = useQuery({
    queryKey: [queryKey, search],
    queryFn: () => service.list(search ? { search } : {}),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: [queryKey] });

  const createMutation = useMutation({
    mutationFn: service.create,
    onSuccess: () => {
      invalidate();
      setEditing(null);
      dispatch(pushToast(`${title} created.`));
    },
    onError: (e) => setError(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => service.update(id, payload),
    onSuccess: () => {
      invalidate();
      setEditing(null);
      dispatch(pushToast(`${title} updated.`));
    },
    onError: (e) => setError(e.message),
  });

  const removeMutation = useMutation({
    mutationFn: service.remove,
    onSuccess: () => {
      invalidate();
      dispatch(pushToast(`${title} deleted.`));
    },
    onError: (e) => dispatch(pushToast(e.message, 'error')),
  });

  const openNew = () => {
    setForm(defaultFormState(fields));
    setError('');
    setEditing({});
  };

  const openEdit = (row) => {
    const next = {};
    fields.forEach((f) => {
      next[f.name] = row[f.name] ?? (f.type === 'checkbox' ? false : '');
    });
    setForm(next);
    setError('');
    setEditing(row);
  };

  const submit = (e) => {
    e.preventDefault();
    const payload = { ...form };
    fields.forEach((f) => {
      if (f.type === 'number') payload[f.name] = payload[f.name] === '' ? undefined : Number(payload[f.name]);
    });
    if (editing._id) updateMutation.mutate({ id: editing._id, payload });
    else createMutation.mutate(payload);
  };

  const rows = data?.data || [];
  const saving = createMutation.isPending || updateMutation.isPending;

  return (
    <div>
      <div className="page-head">
        <h1>{title}</h1>
        <div style={{ display: 'flex', gap: 10 }}>
          {searchable && (
            <input
              className="input"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: 200 }}
            />
          )}
          <button type="button" className="btn btn-primary" onClick={openNew}>
            + Add {title}
          </button>
        </div>
      </div>

      {isLoading && <Spinner />}
      {isError && <ErrorBanner message={queryError.message} />}
      {!isLoading && !isError && rows.length === 0 && <EmptyState>No {title.toLowerCase()} yet.</EmptyState>}

      {!isLoading && rows.length > 0 && (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                {columns.map((c) => (
                  <th key={c.key}>{c.label}</th>
                ))}
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row._id}>
                  {columns.map((c) => (
                    <td key={c.key}>{c.render ? c.render(row) : String(row[c.key] ?? '')}</td>
                  ))}
                  <td style={{ display: 'flex', gap: 8 }}>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => openEdit(row)}>
                      Edit
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      style={{ color: 'var(--danger)' }}
                      onClick={() => window.confirm(`Delete this ${title.toLowerCase()}?`) && removeMutation.mutate(row._id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing?._id ? `Edit ${title}` : `Add ${title}`}>
        <form onSubmit={submit}>
          <ErrorBanner message={error} />
          {fields.map((f) => (
            <div className="field" key={f.name}>
              {f.type !== 'checkbox' && <label>{f.label}</label>}
              {f.type === 'textarea' ? (
                <textarea
                  className="textarea"
                  rows={3}
                  value={form[f.name] ?? ''}
                  required={f.required}
                  onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}
                />
              ) : f.type === 'checkbox' ? (
                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={!!form[f.name]}
                    onChange={(e) => setForm({ ...form, [f.name]: e.target.checked })}
                  />
                  {f.label}
                </label>
              ) : f.type === 'select' ? (
                <select
                  className="select"
                  value={form[f.name] ?? ''}
                  required={f.required}
                  onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}
                >
                  <option value="">Select...</option>
                  {f.options?.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  className="input"
                  type={f.type || 'text'}
                  value={form[f.name] ?? ''}
                  required={f.required}
                  onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}
                />
              )}
            </div>
          ))}
          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <button type="button" className="btn btn-outline btn-block" onClick={() => setEditing(null)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary btn-block" disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
