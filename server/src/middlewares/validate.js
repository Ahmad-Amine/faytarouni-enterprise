const ApiError = require('../utils/ApiError');

function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse({
      body: req.body,
      query: req.query,
      params: req.params,
    });

    if (!result.success) {
      const first = result.error.issues[0];
      const field = first.path.slice(1).join('.');
      return next(ApiError.badRequest(`${field ? `${field}: ` : ''}${first.message}`, result.error.issues));
    }

    if (result.data.body) req.body = result.data.body;
    if (result.data.query) req.query = result.data.query;
    if (result.data.params) req.params = result.data.params;
    next();
  };
}

module.exports = validate;
