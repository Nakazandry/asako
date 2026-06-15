const getPagination = (query) => {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 10, 1), 100);
  const offset = (page - 1) * limit;
  return { page, limit, offset };
};

const paginated = (rows, total, page, limit) => ({
  data: rows,
  meta: {
    total: Number(total),
    page,
    limit,
    pages: Math.ceil(Number(total) / limit) || 1,
  },
});

module.exports = { getPagination, paginated };
