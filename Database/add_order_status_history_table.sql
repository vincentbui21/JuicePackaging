-- Create order_status_history table to track status changes over time
CREATE TABLE IF NOT EXISTS order_status_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id VARCHAR(255) NOT NULL,
    customer_id VARCHAR(36) NOT NULL,
    status VARCHAR(50) NOT NULL,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (customer_id) REFERENCES Customers(customer_id) ON DELETE CASCADE,
    INDEX idx_customer_id (customer_id),
    INDEX idx_order_id (order_id),
    INDEX idx_changed_at (changed_at)
);

-- Insert initial status records for existing customers
INSERT INTO order_status_history (order_id, customer_id, status, changed_at)
SELECT order_id, customer_id, status, created_at
FROM Orders
WHERE order_id IS NOT NULL AND status IS NOT NULL;
