# Shelf Builder

3D wardrobe configurator built with Next.js, Three.js, and React Three Fiber. Design custom wardrobes with compartments, shelves, dividers, doors, and drawers, then export specifications to PDF.

## Tech Stack

### Frontend
- **Next.js 16** - React framework with App Router and Turbopack
- **React 19** - With React Compiler for automatic memoization
- **Three.js** + **React Three Fiber** + **Drei** - 3D rendering and scene management
- **Tailwind CSS v4** - Utility-first styling
- **Radix UI** - Accessible UI primitives
- **shadcn/ui** - Component library built on Radix
- **Zustand** - Lightweight state management
- **TanStack Table** - Headless table with sorting, filtering, pagination
- **Lucide React** - Icon library

### Backend & Database
- **Drizzle ORM** - Type-safe SQL queries
- **Neon** - Serverless PostgreSQL
- **better-auth** - Authentication with sessions
- **Resend** + **React Email** - Transactional emails
- **Cloudflare R2** / **AWS S3** - File storage for images

### Tools
- **TypeScript** - Type safety
- **Biome** - Fast linting and formatting
- **Drizzle Kit** - Database migrations
- **jsPDF** - PDF generation for cut lists and quotes
- **Zod** - Schema validation

## Setup

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Required environment variables are defined in `.env.example`.

## Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Scripts

```bash
npm run dev          # Start dev server with Turbopack
npm run build        # Production build
npm run lint         # Check with Biome
npm run lint:fix     # Auto-fix lint issues
npm run db:generate  # Generate Drizzle migrations
npm run db:migrate   # Run migrations
npm run db:push      # Push schema to database
npm run email:dev    # Preview emails locally
```
