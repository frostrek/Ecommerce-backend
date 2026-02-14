# 📬 Postman API Testing Guide

**Base URL**: `http://localhost:5000/api`  
**Content-Type**: `application/json` for all requests

> Set up a Postman **Environment** with variable `base_url` = `http://localhost:5000/api`

---

## 1. 🔐 Auth (Start Here)

### 1.1 Register
```
POST {{base_url}}/auth/register
Body:
{
  "full_name": "Test User",
  "email": "test@example.com",
  "password": "Test@1234",
  "phone": "+919876543210",
  "date_of_birth": "1995-06-15"
}
```
✅ Save `access_token` and `customer_id` from response to environment variables.

### 1.2 Login
```
POST {{base_url}}/auth/login
Body:
{
  "email": "test@example.com",
  "password": "Test@1234"
}
```
✅ Save `access_token` to env. Set **Authorization** header: `Bearer {{access_token}}` for all protected requests.

### 1.3 Get Profile
```
GET {{base_url}}/auth/me
Headers: Authorization: Bearer {{access_token}}
```

### 1.4 Change Password
```
PUT {{base_url}}/auth/change-password
Headers: Authorization: Bearer {{access_token}}
Body:
{
  "current_password": "Test@1234",
  "new_password": "NewPass@5678"
}
```

### 1.5 Refresh Token
```
POST {{base_url}}/auth/refresh-token
```
(cookies auto-sent, or pass `refresh_token` in body)

### 1.6 Logout
```
POST {{base_url}}/auth/logout
```

---

## 2. 📁 Categories

### 2.1 Create Category (parent)
```
POST {{base_url}}/categories
Body:
{
  "name": "Wines",
  "slug": "wines",
  "description": "All wine products"
}
```
✅ Save `category_id`

### 2.2 Create Sub-category
```
POST {{base_url}}/categories
Body:
{
  "name": "Red Wines",
  "slug": "red-wines",
  "description": "Red wine collection",
  "parent_id": "{{category_id}}"
}
```

### 2.3 Get All (flat)
```
GET {{base_url}}/categories
```

### 2.4 Get Tree (nested)
```
GET {{base_url}}/categories?tree=true
```

### 2.5 Get by Slug
```
GET {{base_url}}/categories/slug/wines
```

### 2.6 Get Category Products
```
GET {{base_url}}/categories/{{category_id}}/products?status=published
```

---

## 3. 🛍️ Products

### 3.1 Create Product
```
POST {{base_url}}/products
Body:
{
  "sku": "WINE-001",
  "product_name": "Cabernet Sauvignon 2020",
  "brand": "Château Margaux",
  "category": "Red Wine",
  "sub_category": "Cabernet",
  "description": "Full-bodied red wine with notes of blackcurrant",
  "unit_of_measure": "bottle",
  "price": 2499.00
}
```
✅ Save `product_id`

### 3.2 Get All Products (with filters)
```
GET {{base_url}}/products?status=published&brand=Château&sort=price_asc&limit=20
```
Supported sort: `newest`, `oldest`, `name_asc`, `name_desc`, `price_asc`, `price_desc`

### 3.3 Search
```
GET {{base_url}}/products/search?q=cabernet
```

### 3.4 Get Product Details
```
GET {{base_url}}/products/{{product_id}}/details
```

### 3.5 Upload Product Image ⭐
```
POST {{base_url}}/products/{{product_id}}/images
Body:
{
  "image": "data:image/jpeg;base64,/9j/4AAQSkZJRg...",
  "file_name": "front-view.jpg",
  "asset_type": "image",
  "is_primary": true,
  "sort_order": 1
}
```
> **Tip**: In Postman, convert any image to base64 using online tools or the script:
> `let b64 = require('fs').readFileSync('image.jpg').toString('base64');`

### 3.6 Get Product Images
```
GET {{base_url}}/products/{{product_id}}/images
```

### 3.7 Set Primary Image
```
PATCH {{base_url}}/products/{{product_id}}/images/{{asset_id}}/primary
```

### 3.8 Delete Product Image
```
DELETE {{base_url}}/products/{{product_id}}/images/{{asset_id}}
```

---

## 4. 🛒 Cart → Checkout Flow

### 4.1 Create Cart
```
POST {{base_url}}/cart
Body:
{
  "customer_id": "{{customer_id}}"
}
```
✅ Save `cart_id`

### 4.2 Add Item to Cart
```
POST {{base_url}}/cart/{{cart_id}}/items
Body:
{
  "variant_id": "{{variant_id}}",
  "quantity": 2
}
```

### 4.3 Get Cart
```
GET {{base_url}}/cart/{{cart_id}}
```

### 4.4 Checkout
```
POST {{base_url}}/orders/checkout
Body:
{
  "cart_id": "{{cart_id}}",
  "customer_id": "{{customer_id}}",
  "shipping_address_id": "{{address_id}}",
  "payment_method": "cod"
}
```
✅ Save `order_id`

### 4.5 Direct Checkout ⭐ (No Cart Required)
```
POST {{base_url}}/orders/direct
Body:
{
  "customer_id": "{{customer_id}}",
  "items": [
    { "product_id": "{{product_id}}", "quantity": 2, "unit_price": 2499 }
  ],
  "shipping_address": {
    "address_line1": "123 Wine Street",
    "city": "Mumbai",
    "state": "Maharashtra",
    "pincode": "400001"
  },
  "payment_method": "cod",
  "order_notes": "Please deliver in the evening"
}
```
> **Frontend teams**: Use this instead of `/checkout`. Accepts `product_id` directly, no backend cart needed.

### 4.6 Get Order Details
```
GET {{base_url}}/orders/{{order_id}}
```

---

## 5. 👤 Customer Profile

### 5.1 Update Profile
```
PATCH {{base_url}}/customers/{{customer_id}}
Body:
{
  "full_name": "Updated Name",
  "phone": "+919876543210"
}
```

### 5.2 Upload Profile Image ⭐
```
PUT {{base_url}}/customers/{{customer_id}}/profile-image
Body:
{
  "image": "data:image/png;base64,iVBORw0KGgo..."
}
```

### 5.3 Get Profile Image
```
GET {{base_url}}/customers/{{customer_id}}/profile-image
```

### 5.4 Remove Profile Image
```
DELETE {{base_url}}/customers/{{customer_id}}/profile-image
```

### 5.5 Verify Age
```
POST {{base_url}}/customers/{{customer_id}}/verify-age
Body:
{
  "date_of_birth": "1995-06-15"
}
```

### 5.6 Add Address
```
POST {{base_url}}/customers/{{customer_id}}/addresses
Body:
{
  "address_line1": "123 Wine Street",
  "address_line2": "Apt 4B",
  "city": "Mumbai",
  "state": "Maharashtra",
  "pincode": "400001",
  "is_default": true
}
```

---

## 6. ❤️ Wishlist (Auth Required)

### 6.1 Add to Wishlist
```
POST {{base_url}}/wishlist
Headers: Authorization: Bearer {{access_token}}
Body:
{
  "product_id": "{{product_id}}"
}
```

### 6.2 Get Wishlist
```
GET {{base_url}}/wishlist
Headers: Authorization: Bearer {{access_token}}
```

### 6.3 Check if in Wishlist
```
GET {{base_url}}/wishlist/check/{{product_id}}
Headers: Authorization: Bearer {{access_token}}
```

### 6.4 Remove from Wishlist
```
DELETE {{base_url}}/wishlist/{{product_id}}
Headers: Authorization: Bearer {{access_token}}
```

---

## 7. ⭐ Reviews (Auth for write, Public for read)

### 7.1 Submit Review (Auth)
```
POST {{base_url}}/reviews
Headers: Authorization: Bearer {{access_token}}
Body:
{
  "product_id": "{{product_id}}",
  "rating": 5,
  "title": "Excellent wine!",
  "body": "Rich flavor with smooth finish. Highly recommended."
}
```

### 7.2 Get Product Reviews (Public)
```
GET {{base_url}}/reviews/product/{{product_id}}?sort=recent&limit=10
```
Sort options: `recent`, `helpful`, `highest`, `lowest`

### 7.3 Rating Summary (Public)
```
GET {{base_url}}/reviews/product/{{product_id}}/summary
```

### 7.4 Mark Helpful (Public)
```
POST {{base_url}}/reviews/{{review_id}}/helpful
```

---

## 🔧 Quick Testing Script (Postman Pre-request)

Paste this in your Collection's **Pre-request Script** to auto-set the auth header:

```javascript
if (pm.environment.get("access_token")) {
    pm.request.headers.add({
        key: "Authorization",
        value: "Bearer " + pm.environment.get("access_token")
    });
}
```

## 📋 Recommended Test Order
1. Register → Login → Save tokens
2. Create Category → Create Product → Upload Image
3. Add to Cart → Checkout → View Order
4. Add to Wishlist → Write Review → Get Reviews
5. Update Profile → Upload Profile Image
6. Change Password → Re-login
