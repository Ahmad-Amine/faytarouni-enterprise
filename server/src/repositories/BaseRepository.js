const { parseListQuery, buildMeta } = require('../utils/queryHelper');

class BaseRepository {
  constructor(model) {
    this.model = model;
  }

  async create(data) {
    return this.model.create(data);
  }

  async findById(id, { populate } = {}) {
    let query = this.model.findById(id);
    if (populate) query = query.populate(populate);
    return query.exec();
  }

  async findOne(filter, { populate } = {}) {
    let query = this.model.findOne(filter);
    if (populate) query = query.populate(populate);
    return query.exec();
  }

  async find(filter = {}, { populate, sort } = {}) {
    let query = this.model.find(filter);
    if (populate) query = query.populate(populate);
    if (sort) query = query.sort(sort);
    return query.exec();
  }

  async updateById(id, data) {
    return this.model.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  }

  async deleteById(id) {
    return this.model.findByIdAndDelete(id);
  }

  async count(filter = {}) {
    return this.model.countDocuments(filter);
  }

  async paginate(baseFilter = {}, reqQuery = {}, options = {}) {
    const { searchableFields = [], defaultSort = '-createdAt', populate, maxLimit } = options;
    const { page, limit, skip, sort, searchFilter } = parseListQuery(reqQuery, {
      searchableFields,
      defaultSort,
      maxLimit,
    });

    const filter = { ...baseFilter, ...searchFilter };

    let query = this.model.find(filter).sort(sort).skip(skip).limit(limit);
    if (populate) query = query.populate(populate);

    const [items, total] = await Promise.all([query.exec(), this.model.countDocuments(filter)]);

    return { items, meta: buildMeta({ page, limit, total }) };
  }
}

module.exports = BaseRepository;
