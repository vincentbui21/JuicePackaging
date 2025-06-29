DROP TABLE IF EXISTS Pallets, PalletCrateMapping, Crates, Boxes, Orders, Customers;
DROP TABLE IF EXISTS Palletes, Crates, Boxes, Orders, Customers;DROP TABLE IF EXISTS Palletes, Crates, Boxes, Orders, Customers;DROP TABLE IF EXISTS Pallets, PalletCrateMapping, Crates, Boxes, Orders, Customers;
DROP TABLE IF EXISTS Pallets, PalletCrateMapping, Crates, Boxes, Orders, Customers;

CREATE TABLE Customers (
    customer_id VARCHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    phone VARCHAR(50),
    email VARCHAR(255),
    city TEXT,
    PRIMARY KEY (customer_id)
);

CREATE TABLE Orders (
    order_id VARCHAR(36) NOT NULL,
    customer_id VARCHAR(36) NOT NULL,
    status VARCHAR(50),
    weight_kg DECIMAL(10,2),
    crate_count INT(11),
    total_cost DECIMAL(10,2),
    notes TEXT,
    created_at DATE,
    PRIMARY KEY (order_id),
    UNIQUE KEY unique_customer_id (customer_id),
    FOREIGN KEY (customer_id) REFERENCES Customers(customer_id)
);

CREATE TABLE Boxes (
    box_id VARCHAR(36) NOT NULL,
    customer_id VARCHAR(36),
    city TEXT,
    pallete_id VARCHAR(36),
    box_qr_code VARCHAR(255),
    PRIMARY KEY (box_id),
    UNIQUE (box_qr_code),
    KEY (customer_id),
    KEY (pallete_id),
    FOREIGN KEY (customer_id) REFERENCES Customers(customer_id)
);

CREATE TABLE Crates (
    crate_id VARCHAR(36) NOT NULL,
    customer_id VARCHAR(36),
    status VARCHAR(50),
    updated_at DATE,
    crate_order VARCHAR(10),
    PRIMARY KEY (crate_id),
    KEY (customer_id),
    FOREIGN KEY (customer_id) REFERENCES Customers(customer_id)
);

CREATE TABLE Palletes (
    pallete_id VARCHAR(36) NOT NULL,
    location VARCHAR(255),
    pallete_qr_code VARCHAR(255),
    status VARCHAR(50),
    PRIMARY KEY (pallete_id),
    UNIQUE (pallete_qr_code)
);
