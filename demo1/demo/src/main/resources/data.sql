INSERT INTO Staff (
    staff_id,
    staff_name,
    role,
    phone,
    email,
    password,
    active
) VALUES (
    'S001',
    'Admin User',
    'ADMIN',
    '0812345678',
    'admin@company.com',
    '$2a$12$m35th/PxlqKOi9DIm2iQy.JQB505yI9lA/GVlUErAy82KWaKNcovK',
    TRUE
) ON CONFLICT (staff_id) DO NOTHING; -- เพิ่ม ON CONFLICT เผื่อรันซ้ำ
