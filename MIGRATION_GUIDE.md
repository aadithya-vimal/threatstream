# ThreatStream Database Migration Guide

This guide provides instructions on how to deploy the PostgreSQL schema to a Supabase backend database.

---

## Step 1: Initialize Supabase Project

1. Navigate to the [Supabase Dashboard](https://supabase.com/).
2. Click **New Project** and configure your organization and database password.
3. Once the project is initialized, navigate to **Project Settings > API** to locate:
   - **Project URL**
   - **Anon Public API Key**

---

## Step 2: Apply SQL Migrations

There are two primary methods to apply the schema migration to your Supabase instance:

### Method A: Via Supabase SQL Editor (Recommended for Fast Setup)
1. In your project dashboard, click on the **SQL Editor** tab in the sidebar.
2. Click **New Query**.
3. Open `supabase/migrations/20260705000000_init_soc_schema.sql` from the repository root.
4. Copy the entire file content and paste it into the query window.
5. Click **Run**.
6. **Verify**: Check the Table Editor tab in the sidebar. You should see all 36 tables successfully instantiated with indexes and relationships configured.

### Method B: Via Supabase CLI (Recommended for Development Pipelines)
1. Install Supabase CLI:
   ```bash
   npm install -g supabase
   ```
2. Login to your account:
   ```bash
   supabase login
   ```
3. Initialize Supabase in your project root:
   ```bash
   supabase init
   ```
4. Link the project using your Reference ID (found in project settings):
   ```bash
   supabase link --project-ref your-project-ref-id
   ```
5. Apply database migrations to the remote instance:
   ```bash
   supabase db push
   ```

---

## Step 3: Configure Environment Variables

1. Open the `.env.local` file in the root of your ThreatStream folder.
2. Replace the placeholder values with your live Supabase credentials:
   ```env
   VITE_SUPABASE_URL=https://your-live-project-id.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.your-live-anon-key
   VITE_USE_MOCK=false
   ```
3. Set `VITE_USE_MOCK` to `false` to instruct repositories to direct all select/insert/update transactions to the Supabase client.

---

## Step 4: Troubleshooting Connection Issues

* **CORS Blocked**: If queries fail in the browser console, navigate to **Database > API** in your Supabase dashboard and verify the allowed domains match your local dev server address (typically `http://localhost:5173`).
* **Schema Cache Sync**: If you create tables manually outside migrations, you may need to reload the schema cache under **Project Settings > API > Reload Schema**.
* **Table Permissions (RLS)**: By default, Supabase enables Row Level Security (RLS) on new tables. In a testing sandbox, you can disable RLS or write a permissive policy to allow read/write calls using the anon key:
  ```sql
  ALTER TABLE threat_events ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "Allow anonymous read access" ON threat_events FOR SELECT USING (true);
  ```
