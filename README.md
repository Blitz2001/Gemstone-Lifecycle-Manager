# Gemstone Processing & Lifecycle Management System

A comprehensive enterprise platform designed to manage the end-to-end lifecycle of high-value gemstones. From initial procurement and rough analysis to cutting, polishing, certification, and final sale, this system provides rigorous tracking, financial auditing, and workflow automation.

## 🚀 Key Features

### 💎 Complete Lifecycle Tracking
- **State Machine Architecture**: Strictly enforced transitions between stages (Procurement → Electric Burn → Cut & Polish → Certification → Sell Ready → Sold).
- **Transformation Lineage**: Track how a single rough stone is cut into multiple polished gems (1-to-N relationships).
- **Evidence Management**: Upload and secure high-res images and certificates for every stage of the process.

### 📊 Financial & Operational Intelligence
- **Cost Tracking**: Granular tracking of purchase price + cumulative processing costs (cutting fees, certification costs, etc.).
- **Yield Analysis**: "Electric Burn" reporting to analyze yield potential and optimize cutting strategies.
- **Profit/Loss Dashboards**: Real-time calculation of Total Investment, Realized Revenue, and ROI.
- **Partial Sales**: Flexible inventory management allowing individual items from a lot to be sold while keeping the lot active.

### 🔒 Security & Compliance
- **Role-Based Access Control (RBAC)**: secure hierarchy with `Admin` (Write/Mutate) and `User` (Read-only) roles.
- **Audit Trails**: Complete history of every action taken on a gemstone, including who performed it and when.
- **Immutable Finalization**: "Sold" lots are cryptographically locked to prevent post-sale tampering.

### ⚡ Workflow Management
- **Kanban Dashboard**: Visual overview of all active inventory across different stages.
- **Automated Validations**: Prevents invalid state transitions (e.g., cannot sell a stone without certification data).

## 🛠️ Technology Stack

- **Framework**: [Next.js 14](https://nextjs.org/) (App Router, Server Components)
- **Database & Auth**: [Supabase](https://supabase.com/) (PostgreSQL, Row Level Security)
- **UI System**: [Shadcn UI](https://ui.shadcn.com/) + [Tailwind CSS](https://tailwindcss.com/)
- **State Management**: React Query + Server Actions
- **Charts**: Recharts

## 🏁 Getting Started

### Prerequisites
- Node.js 18+
- A Supabase Project

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/gemstone-lifecycle-manager.git
   cd gemstone-lifecycle-manager
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment Variables**
   Create a `.env.local` file in the root directory:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   ```

4. **Run the Development Server**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) to view the application.

### Database Setup
This project uses Supabase for the database. SQL migrations are included in the `supabase/migrations` folder.
1. Run the `20240110_init_schema.sql` to set up the core tables.
2. Run `20260111_add_rbac.sql` to enable role-based security.
3. Run `20260111_auto_create_profile.sql` to enable automatic user profile creation.

## 👥 Authentication & Roles

The system is closed-loop (invited users only).
- **Admins**: Have full access to create lots, edit details, and manage users.
- **Viewers**: Can access dashboards and reports but cannot modify data.
- **Dev Access**: A `/setup_dev_user` route is available in development mode to quickly bootstrap an admin account.

## 📄 License
Private / Proprietary.
