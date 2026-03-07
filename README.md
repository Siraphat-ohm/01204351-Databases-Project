# YokAirline ✈️

YokAirline is a comprehensive Airline Management System built with Next.js, featuring real-time flight tracking, staff operations management, and a robust administrative dashboard.

## 🚀 Getting Started with Bun

This project is optimized for [Bun](https://bun.sh/). Follow these steps to get your local environment running.

### 1. Clone & Install
```bash
git clone <repository-url>
cd 01204351-Databases-Project
bun install
```

### 2. Environment Configuration
Copy the example environment file and fill in your secrets (Database URLs, Stripe keys, Mapbox tokens).
```bash
cp .env.example .env
```

### 3. Start Database Services
The project requires PostgreSQL and MongoDB. You can start them using Docker:
```bash
docker-compose up -d
```

### 4. Database Setup
Generate the Prisma client and sync your schema with the PostgreSQL database.
```bash
bun db:generate
bun db:migrate
```

### 5. Seed Initial Data
Populate the database with airports, routes, staff profiles, and aircraft.
```bash
bun db:seed
bun db:seed-seats
```

### 6. Run the Application
Start the development server:
```bash
bun dev
```
Open [http://localhost:3000/admin/login](http://localhost:3000/admin/login) to access the staff portal.

### 7. Run Tests
Execute the test suite using Bun:
```bash
bun test
```

## 🛠 Tech Stack
- **Framework:** Next.js 15 (App Router)
- **Runtime:** Bun
- **UI/Styling:** Mantine UI, Lucide Icons
- **Database (SQL):** PostgreSQL + Prisma (Core entities)
- **Database (NoSQL):** MongoDB + Mongoose (Operational logs)
- **Auth:** Better Auth
- **Payments:** Stripe
- **Maps:** Mapbox GL

## 📜 Available Scripts
- `bun dev`: Start development server.
- `bun build`: Build for production.
- `bun start`: Start production server.
- `bun test`: Run the test suite.
- `bun db:migrate`: Run Prisma migrations.
- `bun db:seed`: Seed primary data.
- `bun db:seed-seats`: Seed aircraft layouts.
- `bun db:reset`: Reset and re-migrate the database.
