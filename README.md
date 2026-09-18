# Haute Joaillerie Gemstone Processing & Lifecycle Management System

An enterprise platform engineered for high-value gemstone lifecycle management, financial valuation, and custody auditing. From raw parcel procurement and rough analysis through heat treatment (Gas/Electric burn), precision faceting, gemological laboratory certification, and final sale liquidation.

---

## 💎 Key Features

- **Strict State Machine**: Enforces business lifecycle transitions: `PROCUREMENT` → `PERFORMING` → `GAS_BURN` → `CUT_POLISH` → `ELECTRIC_BURN` → `CERTIFICATION` → `SELL_READY` → `Finalized`.
- **Financial Intelligence**: Real-time aggregation of acquisition costs + cumulative processing costs (cutting, treatments, lab fees) vs. realized revenue and projected valuation.
- **Partial Sales & Inventory Splitting**: Liquidate individual cut stones from a parcel while maintaining the parent lot's audit trail and yield calculations.
- **Multi-Asset Custody & Evidence**: High-resolution photography, lab certificates, and treatment logs backed by Supabase Storage.
- **Enterprise RBAC**: Hardened PostgreSQL Row-Level Security separating `admin` (write, transition, finalize, delete) from `user` (read-only floor viewer).
- **Responsive Mobile & Desktop**: Designed with Haute Joaillerie aesthetic (Playfair Display, Obsidian glass, Vault Gold) with a dedicated mobile thumb dock and card ledger.
- **Audit-Ready Printable Dossier**: Formal cryptographic gemstone report (`/lots/[id]/report`) for collectors and auction houses.

---

## 🛠️ Technology Stack

- **Framework**: [Next.js 16.1](https://nextjs.org/) (App Router, Server Actions, Turbopack)
- **Runtime & UI**: [React 19.2](https://react.dev/), Tailwind CSS 4, Lucide Icons, Radix UI
- **Database & Auth**: [Supabase](https://supabase.com/) (PostgreSQL 15+, Row Level Security, Storage)
- **Analytics & Charts**: Recharts

---

## 🚀 Quick Start (Local Development)

### 1. Prerequisites
- Node.js 20+
- A Supabase project (Free or Pro tier)

### 2. Installation
```bash
git clone https://github.com/Blitz2001/Gemstone-Lifecycle-Manager.git
cd "Gemstone-Lifecycle-Manager"
npm install
```

### 3. Environment Configuration
Copy the template to `.env.local`:
```bash
cp .env.example .env.local
```
Fill in your Supabase credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 4. Database Setup
In your Supabase project dashboard, open the **SQL Editor** and run the contents of:
📁 `supabase/production_schema.sql`

### 5. Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🌐 Real-World Production Deployment

### Step 1: Database & Storage Provisioning (Supabase)

1. **Run Production Schema**:
   - In Supabase, go to **SQL Editor** → **New Query**.
   - Paste and run `supabase/production_schema.sql`.
   - This automatically creates all tables, views, triggers, types, RLS policies, and configures the `lot-evidence` storage bucket with 10MB image upload limits.

2. **Configure Authentication URLs**:
   - Go to **Authentication** → **URL Configuration**.
   - **Site URL**: Set to your production domain (e.g. `https://vault.gemstone.com` or `https://your-app.vercel.app`).
   - **Redirect URLs**: Add `https://your-app.vercel.app/**` and `https://your-app.vercel.app/auth/callback`.

3. **Configure Custom SMTP (Recommended for Real Users)**:
   - Supabase default email limits rate-limit emails to 3 per hour.
   - In **Authentication** → **Email Templates / SMTP Settings**, connect your transactional mailer (SendGrid, Resend, AWS SES, Postmark).

---

### Step 2: Deploying the Web Application

#### Option A: Vercel (Recommended - Fast & Zero Config)

1. Push your repository to GitHub or GitLab.
2. Sign in to [Vercel](https://vercel.com) and click **Add New Project**.
3. Import your gemstone repository.
4. In the **Environment Variables** section, enter the 4 required variables from `.env.example`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_SITE_URL` (Set to your Vercel production domain, e.g. `https://vault.gemstone.com`)
5. Click **Deploy**. Vercel will build and serve the application globally with automatic SSL and Edge CDN.

#### Option B: Docker / Self-Hosted VPS (DigitalOcean, AWS, Hetzner)

A multi-stage, lightweight production `Dockerfile` is included in the project root:

1. **Build Docker Container**:
   ```bash
   docker build -t gemstone-vault:latest \
     --build-arg NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co \
     --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key \
     --build-arg SUPABASE_SERVICE_ROLE_KEY=your_service_role_key \
     --build-arg NEXT_PUBLIC_SITE_URL=https://vault.yourcompany.com \
     .
   ```

2. **Run Container**:
   ```bash
   docker run -d \
     --name gemstone-vault \
     -p 3000:3000 \
     --restart unless-stopped \
     -e NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co" \
     -e NEXT_PUBLIC_SUPABASE_ANON_KEY="your_anon_key" \
     -e SUPABASE_SERVICE_ROLE_KEY="your_service_role_key" \
     -e NEXT_PUBLIC_SITE_URL="https://vault.yourcompany.com" \
     gemstone-vault:latest
   ```

3. **Reverse Proxy & SSL**:
   Place Nginx or Caddy in front of port 3000 with a free Let's Encrypt certificate:
   ```nginx
   server {
       server_name vault.yourcompany.com;
       location / {
           proxy_pass http://127.0.0.1:3000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }
   ```

---

### Step 3: Assigning Your First Administrator

When deploying to real users, signups default to the `user` role (read-only viewer) to protect sensitive valuation and lot data.

To elevate your account (or the company owner) to **Admin**:

1. Open your live application at `https://your-domain.com/signup` and create an account.
2. Open your **Supabase Dashboard** → **SQL Editor**.
3. Run this query:
   ```sql
   UPDATE public.profiles
   SET role = 'admin'
   WHERE id = (
     SELECT id FROM auth.users WHERE email = 'ceo@yourcompany.com'
   );
   ```
4. Refresh your application dashboard. You now have full executive authorization to create lots, register parcel burns, log costs, and finalize sales.

---

## 🔒 Security Summary

- **No Public/Anon Bypasses**: The production schema revokes all anonymous database privileges.
- **Server-Side Authorization**: Every Server Action validates admin status via `requireAdmin()` using cryptographic session validation.
- **Automated Dev Protection**: Bootstrapping routes like `/setup_dev_user` automatically return a 404 in production builds (`process.env.NODE_ENV === 'production'`).
- **Asset Privacy**: Image uploads are constrained to verified image MIME types and restricted to authenticated operators.
