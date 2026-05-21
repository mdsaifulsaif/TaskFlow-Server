DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('admin', 'hr', 'employee');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'leave_status') THEN
        CREATE TYPE leave_status AS ENUM ('pending', 'approved', 'rejected');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'attendance_status') THEN
        CREATE TYPE attendance_status AS ENUM ('present', 'absent', 'late', 'on_leave');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'leave_status') THEN
        CREATE TYPE leave_status AS ENUM ('pending', 'approved', 'rejected');
    END IF;
END $$;



CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role user_role DEFAULT 'employee',
    refresh_token TEXT, 
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS departments ( 
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL
);


CREATE TABLE IF NOT EXISTS employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    department_id UUID REFERENCES departments(id),
    designation VARCHAR(100),
    phone VARCHAR(20),
    base_salary DECIMAL(12, 2) NOT NULL,
    join_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS attendance (
    id BIGSERIAL PRIMARY KEY,
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    office_id INTEGER REFERENCES offices(id),
    date DATE DEFAULT CURRENT_DATE,
    check_in TIME,
    check_out TIME,
    status attendance_status DEFAULT 'present',
    UNIQUE(employee_id, date) 
);

CREATE TABLE IF NOT EXISTS leave_requests (
    id BIGSERIAL PRIMARY KEY,
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    leave_type VARCHAR(50) NOT NULL, 
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason TEXT,
    status leave_status DEFAULT 'pending',
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(employee_id, start_date)
);

CREATE TABLE IF NOT EXISTS payroll (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES employees(id),
    month VARCHAR(20), 
    bonus DECIMAL(10, 2) DEFAULT 0,
    deduction DECIMAL(10, 2) DEFAULT 0,
    total_payable DECIMAL(12, 2) NOT NULL,
    is_paid BOOLEAN DEFAULT false,
    paid_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS offices (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    radius_meters INTEGER DEFAULT 100, 
    start_time TIME DEFAULT '09:00:00',
    end_time TIME DEFAULT '17:00:00',
    is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS notices (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    priority VARCHAR(20) DEFAULT 'medium', 
    target_audience VARCHAR(50) DEFAULT 'all',
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT true,
    expires_at DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- -- প্রথমে পুরনো কনস্ট্রেইন্ট ডিলিট করো
-- ALTER TABLE attendance DROP CONSTRAINT attendance_employee_id_fkey;

-- -- নতুন করে CASCADE সহ অ্যাড করো
-- ALTER TABLE attendance 
-- ADD CONSTRAINT attendance_employee_id_fkey 
-- FOREIGN KEY (employee_id) 
-- REFERENCES employees(id) 
-- ON DELETE CASCADE;




-- DROP TABLE IF EXISTS employees;
-- DROP TABLE IF EXISTS attendance;
-- DROP TABLE IF EXISTS leave_requests;

--  UPDATE leave_requests
-- SET status = 'approved'
-- WHERE id = 2;

-- ALTER TABLE employees 
-- ADD COLUMN office_id INTEGER REFERENCES offices(id);


-- ALTER TABLE offices 
-- ADD COLUMN max_late_minutes INTEGER DEFAULT 120, -- Default 2 ghonta
-- ADD COLUMN max_absent_minutes INTEGER DEFAULT 240; -- Default 4 ghonta


-- ALTER TYPE attendance_status ADD VALUE IF NOT EXISTS 'half_day';

-- INSERT INTO attendance (employee_id, date, status, office_id) VALUES 
-- ('11e7525b-5a93-488a-9f18-808facc491a0', '2026-05-15', 'absent', 1),
-- ('11e7525b-5a93-488a-9f18-808facc491a0', '2026-05-16', 'absent', 1),
-- ('11e7525b-5a93-488a-9f18-808facc491a0', '2026-05-17', 'absent', 1)
-- ON CONFLICT DO NOTHING;



-- for paryroll
-- INSERT INTO users (id, name, email, password, role) VALUES
-- ('11111111-1111-1111-1111-111111111111', 'Zayan Ahmed', 'zayan@gmail.com', 'hashedpassword', 'employee'),
-- ('22222222-2222-2222-2222-222222222222', 'Tasnim Rahman', 'tasnim@gmail.com', 'hashedpassword', 'employee'),
-- ('33333333-3333-3333-3333-333333333333', 'Arif Hasan', 'arif@gmail.com', 'hashedpassword', 'employee')
-- ON CONFLICT DO NOTHING;


-- INSERT INTO employees (id, user_id, designation, base_salary, join_date) VALUES
-- ('11111111-2222-3333-4444-555555555555', '11111111-1111-1111-1111-111111111111', 'Frontend Developer', 30000.00, '2026-01-01'),
-- ('22222222-3333-4444-5555-666666666666', '22222222-2222-2222-2222-222222222222', 'UI/UX Designer', 45000.00, '2026-01-01'),
-- ('33333333-4444-5555-6666-777777777777', '33333333-3333-3333-3333-333333333333', 'SQA Engineer', 60000.00, '2026-01-01')
-- ON CONFLICT DO NOTHING;


-- INSERT INTO attendance (employee_id, date, status) VALUES
-- -- Tasnim Rahman -> ২ দিন সম্পূর্ণ absent
-- ('22222222-3333-4444-5555-666666666666', '2026-05-10', 'absent'),
-- ('22222222-3333-4444-5555-666666666666', '2026-05-11', 'absent'),

-- -- Arif Hasan -> ১ দিন absent + ২ দিন half_day
-- ('33333333-4444-5555-6666-777777777777', '2026-05-12', 'absent'),
-- ('33333333-4444-5555-6666-777777777777', '2026-05-13', 'half_day'),
-- ('33333333-4444-5555-6666-777777777777', '2026-05-14', 'half_day')
-- ON CONFLICT DO NOTHING;

-- TRUNCATE TABLE payroll RESTART IDENTITY;


-- ALTER TYPE attendance_status ADD VALUE IF NOT EXISTS 'half_day';