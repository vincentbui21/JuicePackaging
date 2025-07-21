SELECT * FROM Pallets;

RENAME TABLE Palletes TO Pallets;


ALTER TABLE Pallets
CHANGE COLUMN pallete_id pallet_id VARCHAR(36);


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
