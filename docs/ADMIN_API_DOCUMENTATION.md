# Admin Dashboard and Reports API Documentation

## Overview
This document outlines the Admin Dashboard and Reports API endpoints for the Ahi Jewellery backend. All endpoints require admin authentication.

## Base URL
```
http://localhost:5001/api/v1/admin
```

## Authentication
All endpoints require:
- Authentication token in Authorization header
- Admin role (`ADMIN`) in user profile

## Dashboard Endpoints

### GET /dashboard/stats
Returns comprehensive dashboard statistics.

**Response:**
```json
{
  "success": true,
  "data": {
    "totalRevenue": 125000.50,
    "totalOrders": 450,
    "totalUsers": 320,
    "totalProducts": 85,
    "revenueToday": 2500.00,
    "ordersToday": 12,
    "newUsersToday": 3,
    "lowStockCount": 8,
    "totalReturnsAmount": 1500.00,
    "totalReturnsCount": 5,
    "returnsTodayAmount": 0,
    "returnsTodayCount": 0,
    "outOfStockCount": 2
  }
}
```

### GET /dashboard/recent-orders
Returns the latest 10 orders with user information.

**Response:**
```json
{
  "success": true,
  "count": 10,
  "data": [
    {
      "id": "order_id",
      "orderNumber": "AHI-2024-00001",
      "status": "DELIVERED",
      "total": 2500.00,
      "createdAt": "2024-01-15T10:30:00.000Z",
      "user": {
        "name": "John Doe",
        "email": "john@example.com"
      }
    }
  ]
}
```

### GET /dashboard/top-products
Returns top 5 best-selling products based on quantity sold.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "product_id",
      "title": "Gold Necklace",
      "price": 15000.00,
      "images": [
        { "url": "image_url" }
      ],
      "totalSold": 25
    }
  ]
}
```

## Reports Endpoints

### GET /reports/sales
Returns sales report with optional date filtering and grouping.

**Query Parameters:**
- `dateFrom` (optional): Start date (YYYY-MM-DD)
- `dateTo` (optional): End date (YYYY-MM-DD)
- `groupBy` (optional): Group by `day`, `week`, or `month`
- `format` (optional): Set to `csv` for CSV export

**Examples:**
```
GET /reports/sales
GET /reports/sales?dateFrom=2024-01-01&dateTo=2024-01-31
GET /reports/sales?groupBy=day&dateFrom=2024-01-01&dateTo=2024-01-07
GET /reports/sales?format=csv
```

**Grouped Response:**
```json
{
  "success": true,
  "groupBy": "day",
  "count": 7,
  "data": [
    {
      "period": "2024-01-01",
      "orderCount": 15,
      "revenue": 12500.00,
      "totalDiscount": 500.00
    }
  ]
}
```

**Detailed Response:**
```json
{
  "success": true,
  "totalRevenue": 125000.50,
  "count": 450,
  "data": [
    {
      "id": "order_id",
      "orderNumber": "AHI-2024-00001",
      "total": 2500.00,
      "discount": 100.00,
      "status": "DELIVERED",
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

### GET /reports/inventory
Returns comprehensive inventory report with stock levels.

**Query Parameters:**
- `format` (optional): Set to `csv` for CSV export

**Response:**
```json
{
  "success": true,
  "count": 150,
  "data": [
    {
      "sku": "GN-001-RED-M",
      "productName": "Gold Necklace",
      "brand": "Ahi Jewels",
      "category": "Necklaces",
      "variantName": "Size",
      "variantValue": "Medium",
      "stock": 3,
      "alertLevel": 5,
      "status": "Low Stock"
    }
  ]
}
```

### GET /reports/customers
Returns customer report with registration statistics.

**Query Parameters:**
- `dateFrom` (optional): Start date (YYYY-MM-DD)
- `dateTo` (optional): End date (YYYY-MM-DD)
- `format` (optional): Set to `csv` for CSV export

**Response:**
```json
{
  "success": true,
  "verifiedCount": 280,
  "count": 320,
  "data": [
    {
      "id": "user_id",
      "name": "John Doe",
      "email": "john@example.com",
      "isVerified": true,
      "isBlocked": false,
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

### GET /reports/returns
Returns comprehensive returns/refunds report.

**Query Parameters:**
- `dateFrom` (optional): Start date (YYYY-MM-DD)
- `dateTo` (optional): End date (YYYY-MM-DD)
- `format` (optional): Set to `csv` for CSV export

**Response:**
```json
{
  "success": true,
  "count": 5,
  "totalRefundAmount": 1500.00,
  "data": [
    {
      "refundId": "refund_id",
      "razorpayRefundId": "rzp_refund_123",
      "orderNumber": "AHI-2024-00001",
      "customerName": "John Doe",
      "customerEmail": "john@example.com",
      "amount": 500.00,
      "reason": "Product damaged",
      "status": "PROCESSED",
      "paymentStatus": "REFUNDED",
      "razorpayPaymentId": "rzp_pay_123",
      "itemsCount": 2,
      "totalOrderValue": 2500.00,
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

## CSV Export
All report endpoints support CSV export by adding `?format=csv` to the query parameters. The response will be a downloadable CSV file with appropriate headers.

## Error Handling
All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "Error message",
  "stack": "Error stack trace (development only)"
}
```

## Common Error Codes
- **401**: Authentication required
- **403**: Admin access required
- **404**: Endpoint not found
- **500**: Internal server error

## Technical Details
- Built with Express.js and Prisma ORM
- Uses PostgreSQL database
- All aggregations use Prisma built-in functions (`$count`, `$sum`, `groupBy`)
- No raw SQL queries used
- CSV export handled by `json2csv` library

## Testing
The server is running on `http://localhost:5001`. Use the provided test script `test-admin-apis.js` to verify endpoint connectivity.

Note: All endpoints require admin authentication for actual data access.
