START TRANSACTION;
UPDATE Boxes
SET box_id = REPLACE(box_id, 'CRATE_', 'BOX_')
WHERE box_id LIKE 'CRATE_%';
COMMIT;

UPDATE Pallets p
LEFT JOIN (
  SELECT pallet_id, COUNT(*) AS cnt
  FROM Boxes
  WHERE pallet_id IS NOT NULL
  GROUP BY pallet_id
) b ON b.pallet_id = p.pallet_id
SET p.holding = IFNULL(b.cnt, 0),
    p.status  = CASE
                  WHEN IFNULL(b.cnt,0) >= p.capacity THEN 'full'
                  ELSE 'available'
                END;

SELECT *FROM Orders;

ALTER TABLE Orders
  ADD COLUMN boxes_count INT NOT NULL DEFAULT 0 AFTER crate_count;


  
SELECT  *
FROM Orders;

SELECT box_id FROM Boxes WHERE box_id LIKE 'BOX_%' ORDER BY box_id LIMIT 20;

SHOW CREATE TABLE Boxes;

SELECT box_id
FROM Boxes
WHERE box_id REGEXP '^BOX_[0-9a-fA-F-]{36}_$';


ALTER TABLE Boxes
  MODIFY COLUMN box_id VARCHAR(64) NOT NULL;

  DELETE FROM Boxes
WHERE box_id REGEXP '^BOX_[0-9a-fA-F-]{36}_$';

ALTER TABLE Boxes DROP FOREIGN KEY Boxes_ibfk_2;



ALTER TABLE Boxes
  ADD CONSTRAINT fk_boxes_pallet
  FOREIGN KEY (pallet_id)
  REFERENCES Pallets(pallet_id)
  ON UPDATE CASCADE
  ON DELETE SET NULL;

  ALTER TABLE Pallets
  MODIFY COLUMN status ENUM('available','loading','full','shipped') DEFAULT 'available';


ALTER TABLE Customers
  ADD COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE Customers
  ADD INDEX idx_customers_created_at (created_at);

  UPDATE Customers c
LEFT JOIN (
  SELECT customer_id, MIN(created_at) AS first_order_at
  FROM Orders
  GROUP BY customer_id
) o USING (customer_id)
SET c.created_at = COALESCE(o.first_order_at, c.created_at);

ALTER TABLE Crates
  CHANGE COLUMN updated_at created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;

  ALTER TABLE Crates
  ADD INDEX idx_crates_created_at (created_at);

  START TRANSACTION;

UPDATE Crates
SET created_at = 
  CASE
    WHEN updated_at IS NULL THEN NULL
    ELSE CAST(updated_at AS DATETIME)
  END;

ALTER TABLE Crates
  DROP COLUMN updated_at;

ALTER TABLE Crates
  MODIFY created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;

COMMIT;

ALTER TABLE Orders
  ADD COLUMN ready_at DATETIME NULL DEFAULT NULL,
  ADD INDEX idx_orders_ready_at (ready_at);


ALTER TABLE Orders  ADD INDEX idx_orders_status (status),
                    ADD INDEX idx_orders_ready_at (ready_at);
ALTER TABLE Boxes   ADD INDEX idx_boxes_pallet_id (pallet_id),
                    ADD INDEX idx_boxes_box_id (box_id);


SHOW INDEX FROM `Orders`;
SHOW INDEX FROM `Boxes`;

ALTER TABLE Boxes
  ADD INDEX idx_boxes_shelf_id (shelf_id);