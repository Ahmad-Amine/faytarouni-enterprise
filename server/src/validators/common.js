const { z } = require('zod');

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id.');

const paginationQuery = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  sort: z.string().optional(),
  search: z.string().optional(),
});

const idParam = z.object({ id: objectId });

module.exports = { objectId, paginationQuery, idParam };
