# Stylify - Custom Tailoring Platform

A modern platform connecting customers with professional tailors, featuring AI-powered try-on technology.

## Features

- 🔐 **Authentication** - Role-based access for tailors, customers, and admins
- ✂️ **Tailor Profiles** - Professional portfolios with galleries and specialties
- 👔 **Custom Orders** - Multi-step order flow with measurements and style selection
- 🤖 **AI Try-On** - Preview designs before ordering
- 📧 **Notifications** - Automated email and WhatsApp updates
- 📊 **Admin Dashboard** - Metrics and order management

## Tech Stack

- **Frontend**: React + Vite + TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **Animations**: Framer Motion
- **Backend**: Lovable Cloud (Supabase)
- **Database**: PostgreSQL
- **Auth**: Supabase Auth
- **Storage**: Supabase Storage

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:8080`

## Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# Supabase credentials (auto-configured by Lovable Cloud)
VITE_SUPABASE_URL=your_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_key

# Optional: AI and Email services
AI_API_KEY=your_ai_key
EMAIL_API_KEY=your_email_key
```

## User Roles

- **Customer** - Browse tailors, place orders, view try-ons
- **Tailor** - Manage profile, portfolio, and orders
- **Admin** - Platform metrics and user management

## Database Schema

### Main Tables
- `users` - User profiles and roles
- `tailors` - Tailor business information
- `orders` - Customer orders with measurements
- `tryon_jobs` - AI try-on processing queue

## Deployment

This project is designed to be deployed on Vercel:

1. Connect your repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main

## Development Workflow

1. **Local Development**: `npm run dev`
2. **Build**: `npm run build`
3. **Preview Build**: `npm run preview`
4. **Lint**: `npm run lint`

## Project Structure

```
src/
├── components/ui/     # shadcn/ui components
├── pages/            # Route pages
│   ├── auth/        # Authentication pages
│   ├── tailor/      # Tailor dashboard
│   └── customer/    # Customer pages
├── lib/             # Utilities and animations
└── integrations/    # Supabase client (auto-generated)
```

## Contributing

This is an MVP project. For feature requests or bugs, please open an issue.

## License

Proprietary - All rights reserved
