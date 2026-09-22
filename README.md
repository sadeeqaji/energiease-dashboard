# EnergiEase Admin & Operations Dashboard

The official back-office administration, support desk, accounting reconciliation, and order fulfillment console for **EnergiEase**.

## Tech Stack
- **Framework:** React 19 + TypeScript + Vite
- **Styling:** Tailwind CSS v4 (Dark Zinc / Monzo & Stripe fintech standard)
- **Icons:** Lucide React
- **Architecture:** Static Edge Single Page Application (SPA)

## Features
- **Executive Overview:** Real-time KPI telemetry, live transaction stream, and DISCO grid health monitor.
- **Support & Order Drawer:** 20-digit STS token inspection, 1-click token copy, BuyPower re-query, Monnify payment verification, and manual vend retries.
- **Live WhatsApp Chat Desk:** 3-column real-time WhatsApp customer care workspace with live chat sync, quick replies, and customer diagnostics.
- **Accounting & Settlement Ledger:** Automated 4-step unit economics, daily revenue/cost reconciliation, and CSV export.
- **Customer Directory:** Saved meter tracking and order history by phone.
- **Staff & RBAC:** Role-based access control (Superadmin, Admin, Accounting, Support).

## Getting Started

### Prerequisites
- Node.js 18+
- npm or pnpm

### Installation
```bash
npm install
```

### Environment Variables
Create a `.env` file in the root directory:
```env
VITE_API_URL=https://api.energiease.ng
```

### Development
```bash
npm run dev
```

### Production Build
```bash
npm run build
```
The output will be generated in the `dist/` directory ready for deployment on Vercel, Cloudflare Pages, or Netlify.
