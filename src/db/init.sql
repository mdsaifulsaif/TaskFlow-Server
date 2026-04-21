-- টেবিল ড্রপ করা (ডেভেলপমেন্টের সুবিধার্থে)
DROP TABLE IF EXISTS users;

-- ইউজার টেবিল তৈরি
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    refresh_token TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);