import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productAdminService, supplierService } from '../../services/resourceService';
import { adminInventoryService, adminProductSaleService } from '../../services/adminService';
import Modal from '../../components/Modal';
import { Spinner, ErrorBanner } from '../../components/Feedback';

const empty = { name: '', sku: '', description: '', imageUrl: '', category: 'general', price: '', cost: '', stock: '', lowStockThreshold: 5, supplier: '', isActive: true };
const emptySale = { quantity: 1, customerName: '', customerPhone: '' };

export default function Products() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['admin', 'products'], queryFn: () => productAdminService.list({ limit: 100 }) });
  const { data: suppliers } = useQuery({ queryKey: ['admin', 'suppliers', 'all'], queryFn: () => supplierService.list() });

  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);
  const [error, setError] = useState('');

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
    queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
  };
  const createMutation = useMutation({ mutationFn: productAdminService.create, onSuccess: () => { invalidate(); setEditing(null); }, onError: (e) => setError(e.message) });
  const updateMutation = useMutation({ mutationFn: ({ id, payload }) => productAdminService.update(id, payload), onSuccess: () => { invalidate(); setEditing(null); }, onError: (e) => setError(e.message) });
  const removeMutation = useMutation({ mutationFn: productAdminService.remove, onSuccess: invalidate });
  const adjustMutation = useMutation({ mutationFn: ({ id, delta }) => adminInventoryService.adjustStock(id, delta), onSuccess: invalidate });

  const openNew = () => { setForm(empty); setError(''); setEditing({}); };
  const openEdit = (p) => {
    setForm({ ...empty, ...p, supplier: p.supplier?._id || p.supplier || '' });
    setError('');
    setEditing(p);
  };

  const [selling, setSelling] = useState(null);
  const [saleForm, setSaleForm] = useState(emptySale);
  const [saleError, setSaleError] = useState('');

  const saleMutation = useMutation({
    mutationFn: (payload) => adminProductSaleService.create(payload),
    onSuccess: () => { invalidate(); setSelling(null); },
    onError: (e) => setSaleError(e.message),
  });

  const openSell = (p) => {
    setSelling(p);
    setSaleForm(emptySale);
    setSaleError('');
  };

  const submitSale = (e) => {
    e.preventDefault();
    saleMutation.mutate({
      productId: selling._id,
      quantity: Number(saleForm.quantity),
      customerName: saleForm.customerName,
      customerPhone: saleForm.customerPhone,
    });
  };

  const submit = (e) => {
    e.preventDefault();
    const payload = { ...form, price: Number(form.price), cost: Number(form.cost || 0), stock: Number(form.stock), lowStockThreshold: Number(form.lowStockThreshold), supplier: form.supplier || null };
    if (editing._id) updateMutation.mutate({ id: editing._id, payload });
    else createMutation.mutate(payload);
  };

  const products = data?.data || [];

  return (
    <div>
      <div className="page-head">
        <h1>Products</h1>
        <button type="button" className="btn btn-primary" onClick={openNew}>+ Add Product</button>
      </div>
      {isLoading && <Spinner />}
      <div className="table-wrap">
        <table className="data-table">
          <thead><tr><th>Name</th><th>SKU</th><th>Price</th><th>Stock</th><th>Actions</th></tr></thead>
          <tbody>
            {products.map((p) => (
              <tr key={p._id}>
                <td>{p.name}</td>
                <td>{p.sku}</td>
                <td>${p.price.toFixed(2)}</td>
                <td>
                  <span style={{ color: p.stock <= p.lowStockThreshold ? 'var(--danger)' : 'inherit', fontWeight: 700 }}>{p.stock}</span>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => adjustMutation.mutate({ id: p._id, delta: 1 })}>+1</button>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => adjustMutation.mutate({ id: p._id, delta: -1 })}>-1</button>
                </td>
                <td>
                  <button type="button" className="btn btn-outline btn-sm" disabled={p.stock <= 0} onClick={() => openSell(p)}>Sell</button>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => openEdit(p)}>Edit</button>
                  <button type="button" className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => window.confirm('Delete this product?') && removeMutation.mutate(p._id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing?._id ? 'Edit Product' : 'Add Product'}>
        <form onSubmit={submit}>
          <ErrorBanner message={error} />
          <div className="field"><label>Name</label><input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div className="field"><label>SKU</label><input className="input" required value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} /></div>
          <div className="field"><label>Image URL</label><input className="input" value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} /></div>
          <div className="field"><label>Description</label><textarea className="textarea" rows={3} placeholder="Shown to customers in the shop" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div className="grid-stack-mobile" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="field"><label>Price</label><input className="input" type="number" step="0.01" required value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></div>
            <div className="field"><label>Cost</label><input className="input" type="number" step="0.01" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} /></div>
            <div className="field"><label>Stock</label><input className="input" type="number" required value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} /></div>
            <div className="field"><label>Low stock threshold</label><input className="input" type="number" value={form.lowStockThreshold} onChange={(e) => setForm({ ...form, lowStockThreshold: e.target.value })} /></div>
          </div>
          <div className="field">
            <label>Supplier</label>
            <select className="select" value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })}>
              <option value="">None</option>
              {(suppliers?.data || []).map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
            </select>
          </div>
          <label className="checkbox-row" style={{ marginBottom: 16 }}>
            <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} /> Active
          </label>
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" className="btn btn-outline btn-block" onClick={() => setEditing(null)}>Cancel</button>
            <button type="submit" className="btn btn-primary btn-block">Save</button>
          </div>
        </form>
      </Modal>

      <Modal open={!!selling} onClose={() => setSelling(null)} title={selling ? `Sell ${selling.name}` : ''}>
        {selling && (
          <form onSubmit={submitSale}>
            <ErrorBanner message={saleError} />
            <p style={{ fontSize: 13, color: 'var(--brown-soft)', marginBottom: 10 }}>
              ${selling.price.toFixed(2)} each · {selling.stock} in stock
            </p>
            <div className="field">
              <label>Quantity</label>
              <input
                className="input"
                type="number"
                min={1}
                max={selling.stock}
                required
                value={saleForm.quantity}
                onChange={(e) => setSaleForm({ ...saleForm, quantity: e.target.value })}
              />
            </div>
            <div className="field"><label>Customer name (optional)</label><input className="input" value={saleForm.customerName} onChange={(e) => setSaleForm({ ...saleForm, customerName: e.target.value })} /></div>
            <div className="field"><label>Customer phone (optional)</label><input className="input" value={saleForm.customerPhone} onChange={(e) => setSaleForm({ ...saleForm, customerPhone: e.target.value })} /></div>
            <p style={{ fontWeight: 700, marginBottom: 12 }}>
              Total: ${(selling.price * Number(saleForm.quantity || 0)).toFixed(2)}
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" className="btn btn-outline btn-block" onClick={() => setSelling(null)}>Cancel</button>
              <button type="submit" className="btn btn-primary btn-block" disabled={saleMutation.isPending}>Record Sale</button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
