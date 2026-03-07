# YokAirline ✈️

> **01204351 Databases Project** — A comprehensive Airline Management System built with Next.js 16, PostgreSQL, and MongoDB, featuring real-time flight tracking, staff operations management, booking and payment flows, and a full administrative dashboard.

---

## 📅 Submission Info

| Item | Detail |
|------|--------|
| **Course** | 01204351 Databases |
| **Deadline** | Monday, March 9, 2026 (Class Time) |
| **GitHub** | Switch repository to **Public** after the deadline for grading |

### Deliverables
1. **GitHub Repository** — this repo; must be runnable using the documentation below
2. **Presentation Video** — uploaded to YouTube, max **7 minutes**, with clear video and excellent audio quality
   - Must cover: Problem description · System overview · Application demonstration · Database design explanation
3. **Database Design Document** — one A4 page, single side (`docs/database-design.pdf`), also included in this repository
   - Must summarize: PostgreSQL schema · MongoDB document structure · Role of each database

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Runtime | Bun |
| UI | Mantine UI, Tabler Icons, Lucide Icons |
| Database (SQL) | PostgreSQL + Prisma |
| Database (NoSQL) | MongoDB + Mongoose |
| Auth | Better Auth |
| Payments | Stripe |
| Maps | Mapbox GL |
| Validation | Zod |
| API Docs | Swagger UI / Zod-OpenAPI |

---

## 🚀 Getting Started

This project is optimized for [Bun](https://bun.sh/). Follow the steps below to run it locally.

### 1. Clone & Install

```bash
git clone <repository-url>
cd 01204351-Databases-Project
bun install
```

### 2. Environment Configuration

```bash
cp .env.example .env
```

Fill in the following values in `.env`:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `MONGO_USER_DATABASE_URL` | MongoDB connection string |
| `BETTER_AUTH_SECRET` | Random 32+ character secret |
| `STRIPE_SECRET_KEY` | From Stripe Dashboard |
| `STRIPE_WEBHOOK_SECRET` | From `stripe listen` (local dev) |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | From Mapbox account |

### 3. Start Database Services

```bash
docker-compose up -d
```

Admin UIs (once running):
- **pgAdmin** → [http://localhost:8080](http://localhost:8080)
- **MongoDB Compass (Web)** → [http://localhost:8081](http://localhost:8081)

### 4. Database Setup

```bash
bun db:generate   # Generate Prisma client
bun db:migrate    # Apply PostgreSQL migrations
```

### 5. Seed Data

```bash
bun db:seed        # Seed airports, routes, staff, aircraft & seat layouts
```

### 6. Run the Application

```bash
bun dev
```

Open [http://localhost:3000](http://localhost:3000) — staff portal login at [http://localhost:3000/admin/login](http://localhost:3000/admin/login).

### 7. Run Tests

```bash
bun test
```

---

## 📜 Available Scripts

| Script | Description |
|--------|-------------|
| `bun dev` | Start development server |
| `bun build` | Build for production |
| `bun start` | Start production server |
| `bun test` | Run the test suite |
| `bun db:generate` | Generate Prisma client |
| `bun db:migrate` | Run Prisma migrations |
| `bun db:seed` | Seed all primary data (airports, routes, staff, aircraft, seat layouts) |
| `bun db:reset` | Reset and re-migrate the database |

---

## 🗄 Database Design

See [`docs/database-design.pdf`](docs/database-design.pdf) for the full one-page design document.

### PostgreSQL (Prisma)
Handles all core relational entities: Users, Staff, Flights, Aircraft, Routes, Airports, Bookings, Tickets, Payments, and Seat layouts.

### MongoDB (Mongoose)
Handles high-frequency operational data: Flight Operations Logs, Issue Reports, and audit trails that benefit from flexible schema and high write throughput.

### Role of Each Database
- **PostgreSQL** — Source of truth for transactional and relational data requiring ACID guarantees (bookings, payments, user accounts).
- **MongoDB** — Operational and log data with flexible schema, suited for append-heavy workloads and rich nested documents.
