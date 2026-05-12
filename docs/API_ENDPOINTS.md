# API Endpoints

All endpoints are implemented as Next.js App Router route handlers under `src/app/api/*`.
They are REST-style and return JSON shaped as `{ data }` on success or `{ error }` on failure.

Base URL during development: `http://localhost:3000/api`

## Products

### `GET /api/products`
List products. Optional query parameters:

| Param      | Type   | Description                                            |
| ---------- | ------ | ------------------------------------------------------ |
| `category` | string | Category slug (`electronics`, `phones`, …) or `all`    |
| `q`        | string | Case-insensitive search across localized names and SKU |

Response:
```json
{ "data": [ { "id": "p-001", "sku": "...", "name": { "en": "...", "ar": "...", "fr": "..." }, "price": 189, "stock": 42, "...": "..." } ] }
```

### `POST /api/products`
Create a product. Required fields: `name`, `price`, `categoryId`.

```json
{
  "sku": "NVA-EL-999",
  "name": { "en": "...", "ar": "...", "fr": "..." },
  "description": { "en": "...", "ar": "...", "fr": "..." },
  "price": 199,
  "categoryId": "c-electronics",
  "stock": 20,
  "image": "https://..."
}
```

### `GET /api/products/:id`
Fetch a single product.

### `PATCH /api/products/:id`
Partial update. Any subset of fields on `Product`.

### `DELETE /api/products/:id`
Remove a product.

## Categories

### `GET /api/categories`
Return the full list of categories with localized names and icon keys.

## Orders

### `GET /api/orders`
List orders (newest first).

### `POST /api/orders`
Create an order. Automatically generates an invoice with `status: "unpaid"`.

```json
{
  "customer": {
    "name": "Amelia Khan",
    "email": "amelia@example.com",
    "phone": "+44 ...",
    "address": "221B Baker St, London"
  },
  "items": [
    { "productId": "p-001", "quantity": 1 },
    { "productId": "p-010", "quantity": 2 }
  ]
}
```

Response includes computed `subtotal`, `tax` (10%), and `total`.

### `GET /api/orders/:id`
Fetch a single order.

### `PATCH /api/orders/:id`
Update order status. Body: `{ "status": "pending" | "processing" | "shipped" | "delivered" | "cancelled" }`.

## Invoices

### `GET /api/invoices`
List invoices.

### `GET /api/invoices/:id`
Fetch a single invoice.

### `PATCH /api/invoices/:id`
Partial update. Typically used to toggle `status` to `"paid"` / `"unpaid"`.

## Analytics

### `GET /api/analytics`
Returns:

```json
{
  "data": {
    "revenue": 3511.2,
    "orders": 4,
    "products": 12,
    "pending": 1,
    "shipped": 1,
    "delivered": 1,
    "unpaid": 2,
    "topProducts": [
      { "productId": "p-009", "name": "Cloud Linen Sofa", "qty": 1, "revenue": 1299 }
    ],
    "lowStock": [
      { "id": "p-009", "name": "Cloud Linen Sofa", "stock": 7 }
    ]
  }
}
```

## Error handling

All handlers return the appropriate HTTP status:

| Code | Meaning        |
| ---- | -------------- |
| 200  | OK             |
| 201  | Created        |
| 400  | Bad request    |
| 404  | Not found      |

Error body shape: `{ "error": "..." }`.
