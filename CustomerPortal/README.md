# Customer Portal

Customer-facing portal for Oy Mehustaja AB juice packaging system.

## Features

- **Book Reservations**: Customers can book juice orders
- **Track Orders**: Customers can track their order status

## Running the Application

```bash
# Install dependencies
npm install

# Run development server (port 5174)
npm run dev

# Build for production
npm run build
```

## Domain Configuration

This app is configured to run on `customer.mehustaja.fi` on port 5174.

## API Integration

The customer portal connects to the same backend as the main system app.

### Environment Variables

Create `CustomerPortal/.env` to point to the backend API:

```bash
VITE_API_BASE_URL=http://localhost:5001
```

Use the production API when deployed, for example:

```bash
VITE_API_BASE_URL=https://api.mehustaja.fi
```
