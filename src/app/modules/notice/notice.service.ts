

import { pool } from "../../../config/db";




export const createNoticeService = async (noticeData: {
  title: string;
  content: string;
  priority?: string;
  target_audience?: string;
  created_by?: string;
  expires_at?: string;
}) => {
  const { title, content, priority = 'medium', target_audience = 'all', created_by, expires_at } = noticeData;

  const query = `
    INSERT INTO notices (title, content, priority, target_audience, created_by, expires_at)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *;
  `;

  const values = [title, content, priority, target_audience, created_by, expires_at];
  const { rows } = await pool.query(query, values);
  return rows[0];
};

export const getAllNoticesService = async (
  page: number,
  limit: number,
  searchTerm?: string,
  date?: string // 'YYYY-MM-DD' ফরম্যাটে আসবে
) => {
  const offset = (page - 1) * limit;

  // ১. বেস কন্ডিশন (শুধুমাত্র একটিভ নোটিশ দেখাবে)
  let whereConditions = ["is_active = TRUE"];
  let values: any[] = [];
  let paramIndex = 1;

  // ২. টাইটেল দিয়ে সার্চ লজিক (ILIKE দিয়ে কেস-ইনসেনসিটিভ করা)
  if (searchTerm) {
    whereConditions.push(`title ILIKE $${paramIndex}`);
    values.push(`%${searchTerm}%`);
    paramIndex++;
  }

  // ৩. নির্দিষ্ট ডেট দিয়ে ফিল্টার লজಿಕ
  if (date) {
    whereConditions.push(`created_at::DATE = $${paramIndex}`);
    values.push(date);
    paramIndex++;
  }

  // কন্ডিশনগুলো জোড়া লাগানো
  const whereClause = `WHERE ${whereConditions.join(" AND ")}`;

  // ৪. মেইন ডাটা কুয়েরি
  const query = `
    SELECT 
      id,
      title,
      content,
      priority,
      target_audience,
      created_by,
      is_active,
      expires_at,
      created_at,
      updated_at
    FROM notices
    ${whereClause}
    ORDER BY created_at DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1};
  `;

  // 統計 ৫. টোটাল কাউন্ট কুয়েরি (পেজিনেশনের মেটা ডাটার জন্য)
  const countQuery = `
    SELECT COUNT(*) 
    FROM notices 
    ${whereClause}
  `;

  // LIMIT এবং OFFSET কে কুয়েরি ভ্যালু লিস্টে পুশ করা হলো
  const queryValues = [...values, limit, offset];

  // প্যারালাল কুয়েরি এক্সিকিউশন (ফাস্ট পারফরম্যান্স)
  const [result, countResult] = await Promise.all([
    pool.query(query, queryValues),
    pool.query(countQuery, values),
  ]);

  const totalData = parseInt(countResult.rows[0].count);
  const totalPages = Math.ceil(totalData / limit);

  // আপনার প্রজেক্টের হুবহু রেসপন্স মেটা স্ট্রাকচার
  return {
    meta: { 
      page, 
      limit, 
      totalData, 
      totalPages 
    },
    data: result.rows,
  };
};

export const getNoticeByIdService = async (id: string) => {
  // 🎯 SQL injection থেকে বাঁচার জন্য প্যারামিটারাইজড কুয়েরি ($1)
  const query = `
    SELECT 
      id,
      title,
      content,
      priority,
      target_audience,
      created_by,
      is_active,
      expires_at,
      created_at,
      updated_at
    FROM notices
    WHERE id = $1 AND is_active = TRUE;
  `;

  const { rows } = await pool.query(query, [id]);
  return rows[0]; // আইডি ইউনিক হওয়ায় একটি মাত্র অবজেক্ট রিটার্ন করবে (ডাটা না থাকলে undefined)
};