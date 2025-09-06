# 🍏 Juice Processing & Packaging System

A **full-stack application** for managing juice processing and packaging operations.  
The system streamlines everything from customer entry to final pickup — with optional integrations for industrial printers and SMS notifications.

---

## 🛠 Tech Stack

- **Backend**: Node.js + Express  
- **Frontend**: React (with Vite)  
- **Database**: AWS RDS (PostgreSQL/MySQL)  
- **Notifications**: AWS SNS (SMS)  
- **Containerization**: Docker & Docker Compose  

---

## 📊 Features & Pages

### 1. Dashboard
- Displays production statistics, line productivity, and recent activity.

### 2. Customer Info Entry
- Record customer details and apple weight.  
- Auto-calculates juice quantity, pouch count, and price (based on city).  
- Optional notes for special cases.  
- Generates **crate QR codes** based on employee input.

### 3. Crate Management
- Employees scan crate QR codes once apples are ready.  
- Order status updates automatically.  
- Moves to *Juice Processing* once all crates are scanned.

### 4. Juice Processing
- Shows orders ready for juice extraction and pouch filling.  
- Generates **Box QR codes** and sends to printer.  
- Sends **Customer Name + Expiry Date** to the Videojet industrial printer.  
- Employees mark orders as *done* after processing, labeling, and packing.

### 5. Load Boxes → Pallet
- Each pallet has its own QR code (holds up to **4 boxes**).  
- Employees scan box QR codes, then assign them to pallets.  
- Pallets can be moved to storage, even in different cities.

### 6. Load Pallet → Shelf
- Each shelf has its own QR code (holds **1 pallet**).  
- Employees scan pallet → shelf.  
- System automatically sends an **SMS notification** to the customer when their order is shelved.

### 7. Pickup Coordination
- Search by **customer name** or **phone number**.  
- System shows which shelf contains the order.  
- Employees mark orders as *picked up* once collected.

### 8. Settings (Admin Only)
- Admin password required for every change.  
- Manage system-wide configuration securely.

---

## 🐳 Docker Setup

Clone the repository:

```bash
git clone https://github.com/yourusername/juice-packaging.git
cd juice-packaging
```
Build and start containers:

```bash
docker compose up --build
```
Access the apps:

```bash
Frontend (Vite) → http://localhost:5173
Backend (API) → http://localhost:5001
```
Stop containers:

```bash
docker compose down
```
⚙️ Environment Variables
Create a .env file inside the backend folder:

```env

# Database connection (AWS RDS)
host=
user=
password=
database=

# AWS SNS configuration
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
SNS_TOPIC_ARN=
AWS_REGION=
DEFAULT_SMS_COUNTRY_CODE=+358
```
AWS RDS → stores all system data.

AWS SNS → sends SMS notifications.

👉 You can replace AWS RDS with any local PostgreSQL/MySQL instance.
👉 If AWS SNS or the industrial printer aren’t available, the system still works — just without SMS and auto-printing.

---
## 🖥 Running Without Docker
- Open a terminal
```Backend
cd backend
npm install
npm run dev
```
- Open a new terminal
```Frontend
cd frontend
npm install
npm run dev
```
The app will start with hot reload enabled.

---
## ⚠️ Notes
The system is fully functional even without:

* Industrial printer → no auto-label printing
* AWS SNS → no SMS notifications

Alternative database setups are supported (local PostgreSQL/MySQL).

## 🗃️Database Setup

Before running the backend, make sure to create your database by following the schema defined in **Database/database_schema.sql**.
This ensures all tables and relationships are correctly set up for the system to function properly.
