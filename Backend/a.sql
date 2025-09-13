SELECT 
  o.order_id, o.status, o.customer_id, o.created_at,
  c.name, c.phone, c.city,
  (SELECT COUNT(*) FROM Boxes b2 WHERE b2.customer_id = o.customer_id) AS box_count,
  COALESCE(
    (
      SELECT s.shelf_name
      FROM Boxes b
      JOIN Pallets p ON b.pallet_id = p.pallet_id
      JOIN Shelves s ON p.shelf_id = s.shelf_id
      WHERE b.customer_id = o.customer_id
      LIMIT 1
    ),
    (
      SELECT s2.shelf_name
      FROM Boxes b
      JOIN Shelves s2 ON b.shelf_id = s2.shelf_id
      WHERE b.customer_id = o.customer_id
      LIMIT 1
    )
  ) AS shelf_name,
  COALESCE(
    (
      SELECT s.location
      FROM Boxes b
      JOIN Pallets p ON b.pallet_id = p.pallet_id
      JOIN Shelves s ON p.shelf_id = s.shelf_id
      WHERE b.customer_id = o.customer_id
      LIMIT 1
    ),
    (
      SELECT s2.location
      FROM Boxes b
      JOIN Shelves s2 ON b.shelf_id = s2.shelf_id
      WHERE b.customer_id = o.customer_id
      LIMIT 1
    )
  ) AS shelf_location
FROM Orders o
JOIN Customers c ON o.customer_id = c.customer_id
WHERE c.name LIKE ? OR c.phone LIKE ?
ORDER BY o.created_at DESC;



CREATE TABLE IF NOT EXISTS SmsStatus (
  customer_id CHAR(36) NOT NULL,
  sent_count INT NOT NULL DEFAULT 0,
  last_status ENUM('sent','skipped','not_sent') NOT NULL DEFAULT 'not_sent',
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (customer_id),
  CONSTRAINT fk_sms_customer
    FOREIGN KEY (customer_id) REFERENCES Customers(customer_id)
    ON DELETE CASCADE
);