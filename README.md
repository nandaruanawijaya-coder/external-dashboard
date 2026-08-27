# BukuWarung Analytics Dashboard

A real-time analytics dashboard for BukuWarung business metrics, built with Next.js 14 and BigQuery.

## Features

- **Dashboard Tabs**: Overview, Performance, Settlement, Stores
- **Real-time Data**: Connected to BigQuery for live business metrics
- **Advanced Filtering**: Period (MTD, QTD, YTD, 90D), custom date ranges, store selection, status filtering
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile
- **Data Visualization**: Charts, heatmaps, and detailed tables
- **Secure Authentication**: JWT-based auth with httpOnly cookies
- **Row-level Access Control**: UID isolation for data security

## Quick Start

### Prerequisites
- Node.js 16+
- Google Cloud BigQuery access
- Environment variables configured

### Installation

```bash
npm install
npm run dev
```

Open [http://localhost:3000/login](http://localhost:3000/login)

## Environment Variables

```env
NEXT_PUBLIC_GOOGLE_CLOUD_PROJECT_ID=ledger-fcc1e
NEXT_PUBLIC_BIGQUERY_DATASET=key_account_reports
NEXT_PUBLIC_BIGQUERY_LOCATION=asia-southeast1
JWT_SECRET=your-jwt-secret
GOOGLE_APPLICATION_CREDENTIALS=your-credentials-json
```

## Deployment

Deployed on **Vercel**: https://external-dashboard-cyan.vercel.app

Environment variables configured in Vercel dashboard. Auto-deploys on `main` branch push.

## Tech Stack

- **Frontend**: Next.js 14.2, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: BigQuery (asia-southeast1)
- **Authentication**: JWT
- **Deployment**: Vercel

## Performance

- Scorecard API: **954ms** (2.8x faster)
- Active Stores API: **557ms** (2.9x faster)
- Optimization: Parallel query execution with Promise.all()

## API Endpoints

- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/dashboard/scorecard` - Company metrics
- `GET /api/dashboard/trends` - Daily/monthly trends
- `GET /api/dashboard/active-stores` - Active store counts
- `GET /api/dashboard/branch-performance` - Store breakdown
- `GET /api/dashboard/settlement-history` - Settlement records
- `GET /api/dashboard/day-of-week` - Day-of-week analysis
- `GET /api/dashboard/stores` - All stores list
- `GET /api/dashboard/all-stores` - Store data with filters
