const { z } = require('zod');

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id.');
const idParams = z.object({ id: objectId });

const openConversationSchema = z.object({
  body: z.object({
    phone: z.string().trim().min(1, 'Phone number is required.').max(25),
    name: z.string().trim().max(120).optional(),
  }),
});

const sendTextSchema = z.object({
  params: idParams,
  body: z.object({ text: z.string().trim().min(1, 'Message is required.').max(4096) }),
});

const sendTemplateSchema = z.object({
  params: idParams,
  body: z.object({
    templateId: objectId,
    vars: z.record(z.string().max(500)).optional(),
  }),
});

const sendMediaSchema = z.object({
  params: idParams,
  query: z.object({
    filename: z.string().trim().min(1).max(200),
    caption: z.string().trim().max(1024).optional(),
  }),
});

const sendAppointmentMessageSchema = z.object({
  params: idParams,
  body: z.object({
    text: z.string().trim().min(1).max(4096).optional(),
    templateId: objectId.optional(),
    vars: z.record(z.string().max(500)).optional(),
  }).refine((body) => Boolean(body.text) !== Boolean(body.templateId), 'Send either a message or a template.'),
});

const staffBroadcastSchema = z.object({
  body: z.object({
    message: z.string().trim().min(1, 'Message is required.').max(900),
    roleIds: z.array(objectId).max(50).optional(),
  }),
});

module.exports = {
  openConversationSchema,
  sendTextSchema,
  sendTemplateSchema,
  sendMediaSchema,
  sendAppointmentMessageSchema,
  staffBroadcastSchema,
};
