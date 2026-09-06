const { z } = require('zod');
const { objectId } = require('./common');

const productSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1, 'Name is required.'),
    sku: z.string().trim().min(1, 'SKU is required.'),
    description: z.string().optional(),
    imageUrl: z.string().optional(),
    category: z.string().optional(),
    price: z.number().min(0),
    cost: z.number().min(0).optional(),
    stock: z.number().min(0),
    lowStockThreshold: z.number().min(0).optional(),
    supplier: objectId.optional().nullable(),
    isActive: z.boolean().optional(),
  }),
});

const supplierSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1, 'Name is required.'),
    contactName: z.string().optional(),
    email: z.string().email().optional().or(z.literal('')),
    phone: z.string().optional(),
    address: z.string().optional(),
    isActive: z.boolean().optional(),
  }),
});

const purchaseOrderSchema = z.object({
  body: z.object({
    supplier: objectId,
    items: z
      .array(
        z.object({
          product: objectId,
          quantity: z.number().min(1),
          unitCost: z.number().min(0),
        })
      )
      .min(1, 'At least one item is required.'),
    notes: z.string().optional(),
  }),
});

const productSaleSchema = z.object({
  body: z.object({
    productId: objectId,
    quantity: z.number().min(1, 'Quantity must be at least 1.'),
    customerName: z.string().optional(),
    customerPhone: z.string().optional(),
    customerId: objectId.optional().nullable(),
  }),
});

module.exports = { productSchema, supplierSchema, purchaseOrderSchema, productSaleSchema };
