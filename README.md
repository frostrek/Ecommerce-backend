# Ecommerce Backend API

A robust Express.js backend for ecommerce applications using PostgreSQL.

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js 5.x
- **Database**: PostgreSQL
- **Driver**: node-postgres (pg)

## Project Structure

```
src/
├── app.js                    # Express app configuration
├── config/
│   └── constants.js          # App constants
├── database/
│   ├── index.js              # PostgreSQL connection pool
│   ├── migrations/           # SQL migration files
│   └── seeds/                # Seed data for testing
├── repositories/             # Data access layer
│   ├── base.repository.js    # Shared CRUD operations
│   └── products.repository.js
├── controllers/              # Route handlers
│   └── products.controller.js
├── routes/                   # API routes
│   ├── index.js              # Route aggregator
│   └── products.routes.js
├── middlewares/              # Express middlewares
│   ├── asyncHandler.js       # Async error wrapper
│   └── errorHandler.js       # Global error handler
└── utils/                    # Utility functions
    ├── logger.js             # Console logger
    └── response.js           # Standard API responses
```

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 14+

### Installation

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your PostgreSQL credentials
```

### Database Setup

```bash
# Create database
psql -U postgres -c "CREATE DATABASE ecommerce_db;"

# Run migrations
psql -U postgres -d ecommerce_db -f src/database/migrations/001_initial_schema.sql

# (Optional) Seed data
psql -U postgres -d ecommerce_db -f src/database/seeds/seed.sql
```

### Running the Server

```bash
# Development mode (with hot reload)
npm run dev

# Production mode
npm start
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Health check |
| GET | `/api/products` | Get all products |
| GET | `/api/products/search?q=term` | Search products |
| GET | `/api/products/:id` | Get product by ID |
| GET | `/api/products/:id/details` | Get product with all details |
| POST | `/api/products` | Create product |
| PATCH | `/api/products/:id` | Update product |
| DELETE | `/api/products/:id` | Delete product |

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| PORT | Server port | 3000 |
| NODE_ENV | Environment | development |
| DB_HOST | PostgreSQL host | localhost |
| DB_PORT | PostgreSQL port | 5432 |
| DB_NAME | Database name | ecommerce_db |
| DB_USER | Database user | postgres |
| DB_PASSWORD | Database password | - |

## Contributing

1. Create a feature branch
2. Make your changes
3. Submit a pull request

## License

ISC
