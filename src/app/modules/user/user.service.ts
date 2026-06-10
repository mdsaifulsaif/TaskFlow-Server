// import bcrypt from "bcrypt";
// import jwt, { JwtPayload } from "jsonwebtoken";
// import { pool } from "../../../config/db";
// import { generateAccessToken, generateRefreshToken } from "../../../utils/jwt";
// import { ApiError } from "../../../errors/ApiError";
// import { config } from "../../../config";
// import { TJwtPayload } from "../../../types/auth.type";

// export const registerUser = async (
//   name: string,
//   email: string,
//   password: string,
// ) => {
//   const client = await pool.connect(); // Transaction
//   try {
//     await client.query("BEGIN"); // Start Transaction

//     const hashed = await bcrypt.hash(password, 10);

//     // 1. User table a data inserc
//     const userResult = await client.query(
//       "INSERT INTO users (name, email, password) VALUES ($1,$2,$3) RETURNING id, name, email, role",
//       [name, email, hashed],
//     );

//     const userId = userResult.rows[0].id;

//     // 2. Employee table update and sbaki data profile update a hobe
//     await client.query(
//       "INSERT INTO employees (user_id, base_salary) VALUES ($1, $2)",
//       [userId, 0], // salary defatult 0
//     );

//     await client.query("COMMIT"); // all data thik thakle save hobe
//     return userResult.rows[0];
//   } catch (error) {
//     await client.query("ROLLBACK"); // vull hole cancle
//     throw error;
//   } finally {
//     client.release();
//   }
// };





// export const loginUser = async (email: string, password: string) => {

//   // 🎯 ১. কুয়েরি আপডেট: e.office_id কেও সিলেক্ট করা হলো যাতে এটি এমপ্লয়ি টেবিল থেকে চলে আসে
//   const query = `
//     SELECT 
//       u.*, 
//       e.id as employee_id,
//       e.office_id as office_id -- 👈 এমপ্লয়ি টেবিল থেকে অফিস আইডি আনা হলো
//     FROM users u 
//     LEFT JOIN employees e ON u.id = e.user_id 
//     WHERE u.email = $1
//   `;
  
//   const result = await pool.query(query, [email]);
//   const user = result.rows[0];

//   if (!user) {
//     throw new ApiError(404, "এই ইমেইল দিয়ে কোনো ইউজার পাওয়া যায়নি।");
//   }

//   const isPasswordMatch = await bcrypt.compare(password, user.password);
//   if (!isPasswordMatch) {
//     throw new ApiError(401, "ভুল পাসওয়ার্ড, আবার চেষ্টা করুন।");
//   }

//   // 🎯 ২. পে-লোডে office_id পাস করা হচ্ছে (যা টোকেনের ভেতর মিডলওয়্যারে সরাসরি পাওয়া যাবে)
//   const jwtPayload: TJwtPayload = {
//     id: user.id,
//     email: user.email,
//     role: user.role,
//     employee_id: user.employee_id, 
//     office_id: user.office_id // 👈 এটি এখন ডাটাবেজ থেকে পাওয়া যাবে
//   };

//   const accessToken = generateAccessToken(jwtPayload);
//   const refreshToken = generateRefreshToken(jwtPayload);

//   return {
//     accessToken,
//     refreshToken,
//     user: {
//       id: user.id,
//       name: user.name,
//       email: user.email,
//       role: user.role,
//       employee_id: user.employee_id,
//       office_id: user.office_id // 👈 রেসপন্সেও ফ্রন্টএন্ডের জন্য পাঠানো হলো
//     }
//   };
// };



// export const refreshToken = async (token: string) => {
//   // token verify kora
//   let decoded;
//   try {
//     decoded = jwt.verify(
//       token,
//       config.jwt_refresh_secret as string,
//     ) as JwtPayload;
//   } catch (err) {
//     throw new ApiError(401, "Invalid Refresh Token!");
//   }

//   const { id, email } = decoded;

//   // user database a ache kina dekha
//   const userResult = await pool.query("SELECT * FROM users WHERE id = $1", [
//     id,
//   ]);
//   const user = userResult.rows[0];

//   if (!user) {
//     throw new ApiError(404, "User not found!");
//   }

//   // new access token crete 
//   const accessToken = jwt.sign(
//     { id: user.id, email: user.email, role: user.role }, 
//     config.jwt_access_secret as string, 
//     { expiresIn: config.jwt_access_expires_in as any }, 
//   );

//   return {
//     accessToken,
//   };
// };


import bcrypt from "bcrypt";
import jwt, { JwtPayload } from "jsonwebtoken";
import { pool } from "../../../config/db";
import { generateAccessToken, generateRefreshToken } from "../../../utils/jwt";
import { ApiError } from "../../../errors/ApiError";
import { config } from "../../../config";
import { TJwtPayload } from "../../../types/auth.type";

export const registerUser = async (
  name: string,
  email: string,
  password: string,
) => {
  const client = await pool.connect(); // Transaction Start
  try {
    await client.query("BEGIN"); 

    const hashed = await bcrypt.hash(password, 10);

    // ১. প্রথম রেজিস্টার্ড ইউজারকে অটোমেটিক 'admin' রোল দেওয়া সেফ (যদি ডাটাবেজ একদম ফাঁকা থাকে)
    const countResult = await client.query("SELECT COUNT(*) FROM users");
    const isFirstUser = parseInt(countResult.rows[0].count) === 0;
    const assignedRole = isFirstUser ? "admin" : "employee";

    // User table-এ ডাটা ইনসার্ট
    const userResult = await client.query(
      "INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role",
      [name, email, hashed, assignedRole],
    );

    const userId = userResult.rows[0].id;

    // ২. Employee table-এ ডাটা ইনসার্ট (base_salary কে স্ট্রিং বা ফ্লোট হিসেবে স্পষ্ট '0.00' দেওয়া সেফ)
    await client.query(
      "INSERT INTO employees (user_id, base_salary, office_id, department_id) VALUES ($1, $2, $3, $4)",
      [userId, 0.00, null, null], // নতুন রেজিস্ট্রেশনের সময় অফিস ও ডিপার্টমেন্ট null থাকবে
    );

    await client.query("COMMIT"); 
    return userResult.rows[0];
  } catch (error) {
    await client.query("ROLLBACK"); 
    throw error;
  } finally {
    client.release(); // ক্লায়েন্ট রিলিজ করা বাধ্যতামূলক
  }
};

export const loginUser = async (email: string, password: string) => {
  // 🎯 কুয়েরি আপডেট: e.office_id এবং e.id কে LEFT JOIN দিয়ে আনা হচ্ছে যাতে ফাঁকা ডাটাবেজেও লগইন হয়
  const query = `
    SELECT 
      u.*, 
      e.id as employee_id,
      e.office_id as office_id 
    FROM users u 
    LEFT JOIN employees e ON u.id = e.user_id 
    WHERE u.email = $1 AND u.is_active = true
  `;
  
  const result = await pool.query(query, [email]);
  const user = result.rows[0];

  if (!user) {
    throw new ApiError(404, "এই ইমেইল দিয়ে কোনো ইউজার পাওয়া যায়নি অথবা অ্যাকাউন্টটি নিষ্ক্রিয়।");
  }

  const isPasswordMatch = await bcrypt.compare(password, user.password);
  if (!isPasswordMatch) {
    throw new ApiError(401, "ভul পাসওয়ার্ড, আবার চেষ্টা করুন।");
  }

  // JWT পে-লোড তৈরি
  const jwtPayload: TJwtPayload = {
    id: user.id,
    email: user.email,
    role: user.role,
    employee_id: user.employee_id, 
    office_id: user.office_id 
  };

  const accessToken = generateAccessToken(jwtPayload);
  const refreshToken = generateRefreshToken(jwtPayload);

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      employee_id: user.employee_id,
      office_id: user.office_id 
    }
  };
};

export const refreshToken = async (token: string) => {
  let decoded;
  try {
    decoded = jwt.verify(
      token,
      config.jwt_refresh_secret as string,
    ) as JwtPayload;
  } catch (err) {
    throw new ApiError(401, "Invalid Refresh Token!");
  }

  const { id } = decoded;

  // 🎯 সবচেয়ে বড় ফিক্স: নতুন এক্সেস টোকেন বানানোর সময়ও LEFT JOIN দিয়ে office_id তুলে আনা হলো
  const query = `
    SELECT 
      u.id, u.name, u.email, u.role,
      e.id as employee_id,
      e.office_id as office_id
    FROM users u
    LEFT JOIN employees e ON u.id = e.user_id
    WHERE u.id = $1 AND u.is_active = true
  `;
  
  const userResult = await pool.query(query, [id]);
  const user = userResult.rows[0];

  if (!user) {
    throw new ApiError(404, "User not found or inactive!");
  }

  // 🎯 নতুন জেনারেট হওয়া অ্যাক্সেস টোকেনেও এখন সব আইডি সুরক্ষিত থাকবে
  const jwtPayload: TJwtPayload = {
    id: user.id,
    email: user.email,
    role: user.role,
    employee_id: user.employee_id,
    office_id: user.office_id
  };

  const accessToken = generateAccessToken(jwtPayload);

  return {
    accessToken,
  };
};