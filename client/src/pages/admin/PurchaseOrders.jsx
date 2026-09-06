import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { purchaseOrderService, supplierService, productAdminService } from '../../services/resourceService';
import { adminInventoryService } from '../../services/adminService';
import Modal from '../../components/Modal';
import { Spinner, ErrorBanner } from '../../components/Feedback';

export default function PurchaseOrders() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['admin', 'purchase-orders'], queryFn: () => purchaseOrderService.list({ limit: 100 }) });
  const { data: suppliers } = useQuery({ queryKey: ['admin', 'suppliers', 'all'], queryFn: () => supplierService.list() });
  const { data: products } = useQuery({ queryKey: ['admin', 'products', 'all'], queryFn: () => productAdminService.list({ limit: 200 }) });

  const [creating, setCreating] = useState(false);
  const [supplier, setSupplier] = useState('');
  const [items, setItems] = useState([{ product: '', quantity: 1, unitCost: 0 }]);
  const [error, setError] = useState('');

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin', 'purchase-orders'] });
  const createMutation = useMutation({
    mutationFn: () => purchaseOrderService.create({ supplier, items }),
    onSuccess: () => { invalidate(); setCreating(false); setItems([{ product: '', quantity: 1, unitCost: 0 }]); setSupplier(''); },
    onError: (e) => setError(e.message),
  });
  const orderMutation = useMutation({ mutationFn: adminInventoryService.markOrdered, onSuccess: invalidate });
  const receiveMutation = useMutation({ mutationFn: adminInventoryService.receive, onSuccess: invalidate });
  const cancelMutation = useMutation({ mutationFn: adminInventoryService.cancelPO, onSuccess: invalidate });

  const pos = data?.data || [];
  const productList = products?.data || [];

  const updateItem = (i, patch) => setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));

  return (
    <div>
      <div className="page-head">
        <h1>Purchase Orders</h1>
        <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}>+ New Order</button>
      </div>

      {isLoading && <Spinner />}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {pos.map((po) => (
          <div key={po._id} className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontWeight: 700 }}>{po.supplier?.name}</p>
                <p style={{ fontSize: 13, color: 'var(--brown-soft)' }}>{po.items.length} item(s) · ${po.totalCost.toFixed(2)}</p>
              </div>
              <span className="badge badge-pending">{po.status}</span>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              {po.status === 'draft' && <button type="button" className="btn btn-outline btn-sm" onClick={() => orderMutation.mutate(po._id)}>Mark Ordered</button>}
              {po.status !== 'received' && po.status !== 'canceled' && (
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => receiveMutation.mutate(po._id)}>Receive Stock</button>
              )}
              {po.status !== 'received' && po.status !== 'canceled' && (
                <button type="button" className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => cancelMutation.mutate(po._id)}>Cancel</button>
              )}
            </div>
          </div>
        ))}
      </div>

      <Modal open={creating} onClose={() => setCreating(false)} title="New Purchase Order" width={560}>
        <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }}>
          <ErrorBanner message={error} />
          <div className="field">
            <label>Supplier</label>
            <select className="select" required value={supplier} onChange={(e) => setSupplier(e.target.value)}>
              <option value="">Select supplier...</option>
              {(suppliers?.data || []).map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
            </select>
          </div>
          {items.map((item, i) => (
            <div key={i} className="grid-stack-mobile" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 8, marginBottom: 8 }}>
              <select className="select" required value={item.product} onChange={(e) => updateItem(i, { product: e.target.value })}>
                <option value="">Product...</option>
                {productList.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
              </select>
              <input className="input" type="number" min="1" placeholder="Qty" value={item.quantity} onChange={(e) => updateItem(i, { quantity: Number(e.target.value) })} />
              <input className="input" type="number" step="0.01" placeholder="Unit cost" value={item.unitCost} onChange={(e) => updateItem(i, { unitCost: Number(e.target.value) })} />
            </div>
          ))}
          <button type="button" className="btn btn-outline btn-sm" onClick={() => setItems([...items, { product: '', quantity: 1, unitCost: 0 }])}>+ Add item</button>
          <button type="submit" className="btn btn-primary btn-block" style={{ marginTop: 16 }} disabled={createMutation.isPending}>Create Order</button>
        </form>
      </Modal>
    </div>
  );
}
