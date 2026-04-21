import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});


pool.connect()
  .then((client) => {
    console.log(" Database connected successfully");
    client.release(); // important
  })
  .catch((err) => {
    console.error("Database connection error:", err.message);
  });