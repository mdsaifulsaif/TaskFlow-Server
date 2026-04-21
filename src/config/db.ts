// import { Pool } from "pg";
// import dotenv from "dotenv";

// dotenv.config();

// export const pool = new Pool({
//   connectionString: process.env.DATABASE_URL,
//   max: 10,
//   idleTimeoutMillis: 30000,
//   connectionTimeoutMillis: 5000,
// });


// pool.connect()
//   .then((client) => {
//     console.log(" Database connected successfully");
//     client.release(); // important
//   })
//   .catch((err) => {
//     console.error("Database connection error:", err.message);
//   });




import { Pool } from "pg";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config();

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

export const initDB = async () => {
  try {
    const client = await pool.connect();
    console.log("🐘 Database connected successfully");
    const sqlFilePath = path.join(__dirname, "../db/init.sql");
    
    const initSql = fs.readFileSync(sqlFilePath, "utf8");

    await client.query(initSql);
    console.log(" Database initialized with init.sql");

    client.release();
  } catch (err: any) {
    console.error(" Database initialization error:", err.message);
    process.exit(1); 
  }
};