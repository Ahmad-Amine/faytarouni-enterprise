import api from './apiClient';

export function createResourceService(resourcePath) {
  const base = `/admin/${resourcePath}`;
  return {
    list: (params) => api.get(base, { params }).then((r) => r.data),
    getOne: (id) => api.get(`${base}/${id}`).then((r) => r.data.data),
    create: (payload) => api.post(base, payload).then((r) => r.data.data),
    update: (id, payload) => api.patch(`${base}/${id}`, payload).then((r) => r.data.data),
    remove: (id) => api.delete(`${base}/${id}`).then((r) => r.data),
  };
}

export const categoryService = createResourceService('categories');
export const serviceAdminService = createResourceService('services');
export const barberAdminService = createResourceService('barbers');
export const productAdminService = createResourceService('products');
export const supplierService = createResourceService('suppliers');
export const purchaseOrderService = createResourceService('purchase-orders');
export const couponService = createResourceService('coupons');
export const taxService = createResourceService('taxes');
export const locationService = createResourceService('locations');
export const roleService = createResourceService('roles');
export const emailTemplateService = createResourceService('email-templates');
export const whatsappTemplateService = createResourceService('whatsapp-templates');
