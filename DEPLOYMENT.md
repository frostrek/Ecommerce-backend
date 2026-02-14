# 🚀 Deployment Guide (Render.com)

This backend is configured for easy deployment on [Render](https://render.com).

## Option 1: The Easy Way (Blueprints)
1. Push this code to a GitHub repository.
2. Log in to Render and go to **Blueprints**.
3. Click **New Blueprint Instance**.
4. Connect your repository.
5. Render will automatically detect `render.yaml` and set up:
   - The **Web Service** (Backend API)
   - A **PostgreSQL Database** (Free tier)
   - All necessary environment variables

## Option 2: Manual Setup
If you prefer setting it up manually:

### 1. Database
1. Create a **PostgreSQL** database on Render.
2. Copy the **Internal Database URL** (e.g., `postgres://user:pass@hostname:5432/db`).

### 2. Web Service
1. Create a **New Web Service**.
2. Connect your repo.
3. **Build Command**: `npm install`
4. **Start Command**: `npm start`
5. **Environment Variables**:
   - `NODE_ENV`: `production`
   - `DB_HOST`, `DB_USER`, etc... **OR** just modify `src/config/database.js` to accept `DATABASE_URL`.
   - `DB_SSL`: `true`
   - `JWT_ACCESS_SECRET`: (Generate a random string)
   - `JWT_REFRESH_SECRET`: (Generate a random string)
   - `CORS_ORIGIN`: Your frontend URL (e.g., `https://your-store.netlify.app`)

## ⚠️ Important Note on Database
If you use Render's **Free Tier Database**, it will spin down after inactivity, causing a delay on the first request.

## 🛠️ verifying Deployment
Once deployed, test the health endpoint:
```
GET https://<your-service-name>.onrender.com/
```
You should see:
```json
{
  "success": true,
  "message": "Ecommerce Backend API",
  ...
}
```
