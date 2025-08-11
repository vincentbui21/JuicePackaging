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
