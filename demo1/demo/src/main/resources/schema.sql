-- ========================
-- Supplier
-- ========================
CREATE TABLE Supplier (
    supplier_id VARCHAR(20) PRIMARY KEY,
    supplier_name VARCHAR(100) NOT NULL,
    address VARCHAR(200),
    phone VARCHAR(20),
    email VARCHAR(100) UNIQUE
);

-- ========================
-- Product
-- ========================
CREATE TABLE Product (
    product_id VARCHAR(20) PRIMARY KEY,
    product_name VARCHAR(100) NOT NULL,
    description TEXT,
    unit VARCHAR(50),
    price_per_unit DECIMAL(10,2) CHECK (price_per_unit > 0),
    quantity INT DEFAULT 0 CHECK (quantity >= 0),
    supplier_id VARCHAR(20) REFERENCES Supplier(supplier_id),
    image_url VARCHAR(255)
);

-- ========================
-- Customer
-- ========================
CREATE TABLE Customer (
    customer_id VARCHAR(20) PRIMARY KEY,
    customer_name VARCHAR(100) NOT NULL,
    address VARCHAR(200),
    phone VARCHAR(20),
    email VARCHAR(100) UNIQUE
);

-- ========================
-- Staff
-- ========================
CREATE TABLE Staff (
    staff_id VARCHAR(20) PRIMARY KEY,
    staff_name VARCHAR(100) NOT NULL,
    role VARCHAR(50) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(100) UNIQUE,
    password VARCHAR(100) NOT NULL,
    active BOOLEAN DEFAULT TRUE
);

-- ========================
-- "Order" (ใช้ Double Quote เพราะ Order เป็น Reserved Word)
-- ========================
CREATE TABLE "Order" (
    order_id VARCHAR(20) PRIMARY KEY,
    order_date DATE NOT NULL,
    total_amount DECIMAL(12,2) DEFAULT 0 CHECK (total_amount >= 0),
    status VARCHAR(50) DEFAULT 'Pending',
    customer_id VARCHAR(20) REFERENCES Customer(customer_id),
    staff_id VARCHAR(20) REFERENCES Staff(staff_id) -- แก้ไข: ลบ comma ที่เกินมา
);
-- ========================
-- OrderItem
-- ========================
CREATE TABLE OrderItem (
    order_item_id VARCHAR(20) PRIMARY KEY,
    order_id VARCHAR(20) REFERENCES "Order"(order_id),
    product_id VARCHAR(20) REFERENCES Product(product_id),
    quantity INT NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10,2) NOT NULL,
    line_total DECIMAL(12,2) NOT NULL,
    fulfilled_qty INT DEFAULT 0,
    remaining_qty INT GENERATED ALWAYS AS (quantity - fulfilled_qty) STORED
);

-- ========================
-- Request
-- ========================
CREATE TABLE Request (
    request_id VARCHAR(20) PRIMARY KEY,
    request_date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'Awaiting Approval',
    order_id VARCHAR(20) REFERENCES "Order"(order_id),
    customer_id VARCHAR(20) REFERENCES Customer(customer_id),
    staff_id VARCHAR(20) REFERENCES Staff(staff_id),
    description TEXT,
    approved_by VARCHAR(20) REFERENCES Staff(staff_id),
    approved_date TIMESTAMP
);

-- ========================
-- RequestItem
-- ========================
CREATE TABLE RequestItem (
    request_item_id VARCHAR(20) PRIMARY KEY,
    request_id VARCHAR(20) REFERENCES Request(request_id),
    product_id VARCHAR(20) REFERENCES Product(product_id),
    quantity INT NOT NULL CHECK (quantity > 0),
    fulfilled_qty INT DEFAULT 0,
    remaining_qty INT GENERATED ALWAYS AS (quantity - fulfilled_qty) STORED
);

-- ========================
-- StockTransaction
-- ========================
CREATE TABLE StockTransaction (
    transaction_id VARCHAR(20) PRIMARY KEY,
    transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    type VARCHAR(10) CHECK (type IN ('IN','OUT','ADJUST')),
    product_id VARCHAR(20) REFERENCES Product(product_id) NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    staff_id VARCHAR(20) REFERENCES Staff(staff_id) NOT NULL,
    description TEXT
);