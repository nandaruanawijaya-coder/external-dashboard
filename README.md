# BukuWarung Client Dashboard

Next.js application for displaying key account performance metrics.

## Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Create Environment File
Copy `.env.local.example` to `.env.local` and fill in your values:

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:
```env
NEXT_PUBLIC_GOOGLE_CLOUD_PROJECT_ID=ledger-fcc1e
NEXT_PUBLIC_BIGQUERY_DATASET=key_account_reports
GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/to/service-account-key.json
JWT_SECRET=your-min-32-character-secret-key
NEXT_PUBLIC_API_URL=http://localhost:3000
NODE_ENV=development
```

**⚠️ Important:**
- `GOOGLE_APPLICATION_CREDENTIALS` must be an absolute path
- `JWT_SECRET` must be at least 32 characters
- Never commit `.env.local` or service account credentials

### 3. Run Development Server
```bash
npm run dev
```

Visit `http://localhost:3000` → should redirect to `/login`

## Testing

### Login Flow
1. Go to `http://localhost:3000/login`
2. Enter a valid UID from `uid_master` table
3. Should redirect to `/dashboard`
4. Check DevTools → Application → Cookies to see `auth-token`

### Logout
1. Click "Logout" button on dashboard
2. Should redirect to `/login`
3. Cookie should be cleared

## Project Structure

```
src/
├── app/
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Redirects to /login
│   ├── login/page.tsx      # Login page
│   ├── dashboard/page.tsx  # Dashboard (placeholder)
│   ├── api/
│   │   └── auth/
│   │       ├── login/route.ts
│   │       └── logout/route.ts
│   └── globals.css         # Tailwind CSS
├── lib/
│   ├── bigquery.ts         # BigQuery client & queries
│   ├── auth.ts             # JWT utilities
│   └── types.ts            # TypeScript interfaces
├── components/
│   └── LoginForm.tsx       # Login form component
└── middleware.ts           # Route protection
```

## Build for Production

```bash
npm run build
npm start
```

## Next: Phase 2

Once Phase 1 is working, Phase 2 will add:
- `/api/dashboard/scorecard` - Company-level metrics
- `/api/dashboard/branch-performance` - Store-level breakdown
- `/api/dashboard/trends` - Daily/monthly trends
- `/api/dashboard/active-stores` - Active store count trend
- `/api/dashboard/settlement-history` - Settlement records
