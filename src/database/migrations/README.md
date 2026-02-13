# Database Migrations

## How It Works
- Migrations run in alphabetical order via `npm run migrate`
- Each `.sql` file runs **once** — tracked in the `migrations` table
- Already-applied files are **skipped** automatically

## Migration History

| File | Purpose |
|:--|:--|
| `001` | Initial schema: products, specs, packaging, variants, compliance, assets |
| `002` | Adds `quantity` column to variants |
| `003` | Adds `price` column to products |
| `004` | Creates `stock_movements` table |
| `005` | Creates carts, orders, payments tables + variant extension |
| `006` | Creates customers, addresses, auth, sessions |
| `007` | Cart indexes |
| `008` | Adds e-commerce columns to variants (size_label, price, etc.) |
| `009` | Adds FKs (carts→customers, orders→customers) + timestamps |
| `010` | Destructive reset for variants/carts/orders (unified schema) |
| `011` | Adds shipping/billing address to orders |

## Team Rules
1. **NEVER edit** an existing `.sql` file
2. **ALWAYS create** a new numbered file (e.g., `012_your_change.sql`)
3. **Run `npm run migrate`** after every `git pull`
4. Use `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` for safety
5. Test your migration locally before pushing

## For New Developers
After cloning the repo:
```bash
cp .env.example .env    # Configure your DB credentials
npm install
npm run migrate          # Apply all migrations
npm run dev              # Start the server
```
