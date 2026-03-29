# Admin Settings and Audit Log API Documentation

## Overview
This document outlines the Admin Settings and Audit Log API endpoints for the Ahi Jewellery backend. All endpoints require admin authentication.

## Base URL
```
http://localhost:5001/api/v1/admin
```

## Authentication
All endpoints require:
- Authentication token in Authorization header
- Admin role (`ADMIN`) in user profile

## Database Models

### Setting Model
```typescript
interface Setting {
  id: string;
  key: string;        // Unique setting identifier
  value: string;      // Setting value (stored as text)
  group: string;      // Group for organizing settings
  createdAt: Date;
  updatedAt: Date;
}
```

### AuditLog Model
```typescript
interface AuditLog {
  id: string;
  userId?: string;    // User who performed the action
  action: string;     // Action type (CREATE, UPDATE, DELETE, etc.)
  entity: string;     // Entity type (User, Product, Setting, etc.)
  entityId?: string;  // ID of the affected entity
  oldValue?: string;   // Previous value (for updates)
  newValue?: string;  // New value
  ipAddress?: string; // IP address of the request
  userAgent?: string; // Browser/user agent
  createdAt: Date;
}
```

## Settings Endpoints

### GET /settings
Returns all settings grouped by their group.

**Response:**
```json
{
  "success": true,
  "data": {
    "general": [
      {
        "key": "site_name",
        "value": "Ahi Jewellery",
        "createdAt": "2024-01-15T10:30:00.000Z",
        "updatedAt": "2024-01-15T10:30:00.000Z"
      }
    ],
    "security": [
      {
        "key": "maintenance_mode",
        "value": "false",
        "createdAt": "2024-01-15T10:30:00.000Z",
        "updatedAt": "2024-01-15T10:30:00.000Z"
      }
    ]
  },
  "totalGroups": 2,
  "totalSettings": 2
}
```

### PUT /settings
Updates one or multiple settings. Creates new settings if they don't exist.

**Request Body:**
```json
{
  "site_name": "Ahi Jewellery",
  "maintenance_mode": "false",
  "max_upload_size": "5242880",
  "email_notifications": "true"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Settings updated successfully",
  "data": [
    {
      "id": "setting_id",
      "key": "site_name",
      "value": "Ahi Jewellery",
      "group": "general",
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T11:00:00.000Z"
    }
  ],
  "updatedCount": 4
}
```

**Audit Logs Created:**
Each setting update creates an audit log entry:
- `action`: "CREATE" for new settings, "UPDATE" for existing ones
- `entity`: "Setting"
- `entityId`: The setting's ID
- `oldValue`: Previous value (null for new settings)
- `newValue`: New value

## Audit Log Endpoints

### GET /audit-logs
Returns paginated audit logs with optional filtering.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `userId` (optional): Filter by user ID
- `entity` (optional): Filter by entity type
- `dateFrom` (optional): Filter by start date (YYYY-MM-DD)
- `dateTo` (optional): Filter by end date (YYYY-MM-DD)
- `sortBy` (optional): Sort field (default: "createdAt")
- `sortOrder` (optional): Sort order "asc" or "desc" (default: "desc")

**Examples:**
```
GET /audit-logs
GET /audit-logs?page=2&limit=10
GET /audit-logs?userId=user_id
GET /audit-logs?entity=User&dateFrom=2024-01-01
GET /audit-logs?dateFrom=2024-01-01&dateTo=2024-01-31&sortBy=createdAt&sortOrder=asc
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "audit_log_id",
      "userId": "user_id",
      "action": "UPDATE",
      "entity": "Setting",
      "entityId": "setting_id",
      "oldValue": "old_value",
      "newValue": "new_value",
      "ipAddress": "127.0.0.1",
      "userAgent": "Mozilla/5.0...",
      "createdAt": "2024-01-15T11:00:00.000Z",
      "user": {
        "id": "user_id",
        "name": "Admin User",
        "email": "admin@example.com"
      }
    }
  ],
  "meta": {
    "totalCount": 150,
    "currentPage": 1,
    "totalPages": 8,
    "limit": 20,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

## Audit Logging Utility

### logAudit Function
```typescript
import { logAudit } from "../utils/auditLogger";

await logAudit(
  req,           // Express request object
  "UPDATE",      // Action type
  "Product",     // Entity type
  "product_id",  // Entity ID (optional)
  "old_value",   // Previous value (optional)
  "new_value"    // New value (optional)
);
```

**Automatically Captured:**
- User ID from `req.user.id`
- IP address from `req.ip` or connection remote address
- User agent from request headers

**Error Handling:**
- Audit logging errors are logged to console but don't break main functionality
- Failed audit logs won't cause API requests to fail

## Common Use Cases

### 1. Site Configuration
```json
PUT /admin/settings
{
  "site_name": "Ahi Jewellery",
  "site_description": "Fine Jewellery Store",
  "contact_email": "contact@ahijewellery.com",
  "phone_number": "+1234567890"
}
```

### 2. Feature Toggles
```json
PUT /admin/settings
{
  "maintenance_mode": "false",
  "new_user_registration": "true",
  "guest_checkout": "true",
  "product_reviews": "true"
}
```

### 3. Security Settings
```json
PUT /admin/settings
{
  "session_timeout": "3600",
  "max_login_attempts": "5",
  "password_min_length": "8",
  "two_factor_auth": "false"
}
```

### 4. Monitoring User Activity
```bash
# Get all admin actions in the last 7 days
GET /admin/audit-logs?dateFrom=2024-01-08&entity=User

# Get specific user's activity
GET /admin/audit-logs?userId=user_id&limit=50

# Get all setting changes
GET /admin/audit-logs?entity=Setting&sortBy=createdAt&sortOrder=desc
```

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
- **400**: Bad request (invalid settings data)
- **401**: Authentication required
- **403**: Admin access required
- **404**: Endpoint not found
- **500**: Internal server error

## Technical Details
- Built with Express.js and Prisma ORM
- Uses PostgreSQL database
- Settings stored as key-value pairs with grouping
- Audit logs capture all CRUD operations
- Automatic IP address and user agent tracking
- Pagination support for audit logs
- Comprehensive filtering and sorting options

## Testing
The server is running on `http://localhost:5001`. Use the provided test script `test-settings-audit-apis.js` to verify endpoint connectivity.

Note: All endpoints require admin authentication for actual data access.
