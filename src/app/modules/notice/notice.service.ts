import { pool } from "../../../config/db";

const createNoticeDB = async (data: any, userId: string) => {
  const { title, content, priority, target_audience, expires_at } = data;

  const query = `
    INSERT INTO notices (title, content, priority, target_audience, expires_at, created_by)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *;
  `;

  const result = await pool.query(query, [
    title,
    content,
    priority || "medium",
    target_audience || "all",
    expires_at,
    userId,
  ]);

  return result.rows[0];
};

const getAllNoticesDB = async (role: string, queryObj: any) => {
  const page = Number(queryObj.page) || 1;
  const limit = Number(queryObj.limit) || 10;
  const skip = (page - 1) * limit;


  let filterQuery = `WHERE is_active = true AND (expires_at IS NULL OR expires_at >= CURRENT_DATE)`;

  if (role === "employee") {
    filterQuery += ` AND (target_audience = 'all' OR target_audience = 'employee')`;
  }

 
  const dataQuery = `
    SELECT * FROM notices 
    ${filterQuery}
    ORDER BY created_at DESC 
    LIMIT $1 OFFSET $2
  `;


  const countQuery = `SELECT COUNT(*) FROM notices ${filterQuery}`;

  const [result, totalCount] = await Promise.all([
    pool.query(dataQuery, [limit, skip]),
    pool.query(countQuery),
  ]);


  const total = parseInt(totalCount.rows[0].count);

  return {
    meta: {
      page,
      limit,
      totalData: total, // total এর বদলে totalData
      totalPages: Math.ceil(total / limit), // totalPage এর বদলে totalPages
    },
    data: result.rows,
  };
};

export const NoticeService = {
  createNoticeDB,
  getAllNoticesDB,
};
