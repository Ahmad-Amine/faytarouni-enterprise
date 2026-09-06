function parseListQuery(
  query,
  { searchableFields = [], defaultSort = '-createdAt', maxLimit = 100 } = {}
) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(maxLimit, Math.max(1, parseInt(query.limit, 10) || 20));
  const skip = (page - 1) * limit;

  const sort = query.sort ? String(query.sort).split(',').join(' ') : defaultSort;

  let searchFilter = {};
  if (query.search && searchableFields.length > 0) {
    const re = new RegExp(String(query.search).trim(), 'i');
    searchFilter = { $or: searchableFields.map((field) => ({ [field]: re })) };
  }

  return { page, limit, skip, sort, searchFilter };
}

function buildMeta({ page, limit, total }) {
  return {
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

module.exports = { parseListQuery, buildMeta };
