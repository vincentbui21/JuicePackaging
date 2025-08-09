SELECT * FROM Pallets;

RENAME TABLE Pallets TO Shelves;


ALTER TABLE Shelves
CHANGE COLUMN pallet_id shelf_id VARCHAR(36);


ALTER TABLE Pallets
ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP;

CREATE TABLE Cities (
  city_id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE
);

ALTER TABLE Boxes
CHANGE COLUMN pallete_id pallet_id VARCHAR(36);


SELECT * FROM Customers WHERE name LIKE '%Sami%';

SELECT * FROM Orders WHERE customer_id = (
  SELECT customer_id FROM Customers WHERE name LIKE '%Sami%'
);

SELECT 
  o.order_id,



  o.status,
  o.customer_id,
  o.created_at,
  c.name,
  c.phone,
  c.city
FROM Orders o
JOIN Customers c ON o.customer_id = c.customer_id
WHERE c.name LIKE '%Sami%' OR c.phone LIKE '%Sami%';


CREATE TABLE Pallets (
    pallet_id VARCHAR(255) PRIMARY KEY,
    location VARCHAR(255),
    created_at DATE DEFAULT CURRENT_DATE,
    status ENUM('available','full','shipped') DEFAULT 'available',
    capacity INT DEFAULT 8,
    holding INT DEFAULT 0
);

ALTER TABLE Boxes
ADD COLUMN shelf_id VARCHAR(255);


ALTER TABLE Pallets ADD COLUMN shelf_id TEXT;

ALTER TABLE Shelves
  ADD COLUMN shelf_name VARCHAR(64) NOT NULL AFTER location;

SET @loc := NULL; 
SET @n := 0;

UPDATE Shelves s
JOIN (
  SELECT shelf_id, location,
         (@n := IF(@loc = location, @n + 1, 1)) AS seq,
         (@loc := location) AS dummy
  FROM Shelves
  ORDER BY location, created_at
) x ON x.shelf_id = s.shelf_id
SET s.shelf_name = CONCAT('Shelf ', x.seq);

SELECT shelf_id, location, shelf_name FROM Shelves;
