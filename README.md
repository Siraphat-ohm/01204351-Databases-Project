# YokAirline ✈️

> **01204351 Databases Project** — A comprehensive Airline Management System built with Next.js 16, PostgreSQL, and MongoDB, featuring real-time flight tracking, staff operations management, booking and payment flows, and a full administrative dashboard.

---

## สมาชิกในกลุ่ม

- [นายสิรภัทร ทัพภะ](https://github.com/Siraphat-ohm)  6710504409
- [นายธิติ ทรงพลวารินทร์](https://github.com/ThitiSo) 6710503992
- [นายพงศ์พล บุญศิริ](https://github.com/slowyier) 6710504131

---

## Database Schema

- [Schema](./docs/database-design.pdf)

## Video Presentation

- [Video Link](https://youtu.be/krmUC8MhBC8)

---

## Tech Stack

- **Frontend**: Next.js 16, Mantine UI, Mapbox GL JS
- **Backend**: Next.js API Routes
- **Databases**: PostgreSQL, MongoDB
- **Authentication**: BetterAuth
- **Containerization**: Docker
- **Testing**: Jest, React Testing Library
- **Documentation**: Swagger
- **Payment Integration**: Stripe

## Features

- Staff operations management
- Booking and payment flows
- Full administrative dashboard
- Role-based access control
- Comprehensive testing suite
- API documentation with Swagger

---

## Run with Docker (Recommended)

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) & Docker Compose
- [Stripe CLI](https://stripe.com/docs/stripe-cli) (for payment testing)

### 1. Setup environment

```bash
cp .env.example .env
```

Fill in the required values in `.env` (at minimum: DB credentials, `BETTER_AUTH_SECRET`, Stripe keys, Mapbox token).

### 2. Start all services

```bash
docker compose up --build -d
```

### 3. Seed the database

```bash
docker exec airline_app sh -c 'NODE_OPTIONS="--max-old-space-size=3072" ./node_modules/.bin/tsx prisma/seed.ts'
```

### 4. Open app

- App: http://localhost:3000
- pgAdmin: http://localhost:8080
- Mongo Express: http://localhost:8081

### 5. Stripe webhook (run on host machine, not in Docker)

```bash
stripe login
stripe listen --forward-to http://localhost:3000/api/v1/stripe/webhook
```

Copy the `whsec_...` secret it prints into `STRIPE_WEBHOOK_SECRET` in `.env`, then restart:

```bash
docker compose up -d app
```

### Docker services

| Service       | Container               | Host Port | Notes                          |
| ------------- | ----------------------- | --------- | ------------------------------ |
| Next.js App   | `airline_app`           | 3000      |                                |
| PostgreSQL    | `airline_postgres`      | —         | Internal only (use pgAdmin)    |
| pgAdmin       | `airline_pgadmin`       | 8080      |                                |
| MongoDB       | `airline_mongo`         | —         | Internal only (use Mongo Express) |
| Mongo Express | `airline_mongo_express` | 8081      |                                |

> **Note:** `NEXT_PUBLIC_*` environment variables (Mapbox token, Stripe publishable key, App URL) are embedded into the client bundle at **build time**. If you change any of them in `.env`, you must rebuild the image:
>
> ```bash
> docker compose build --no-cache app && docker compose up -d app
> ```

### Docker commands

```bash
# Stop all services
docker compose down

# Stop and remove volumes (deletes DB data)
docker compose down -v

# Rebuild without cache
docker compose build --no-cache
docker compose up -d

# View app logs
docker logs airline_app
```

---

## Run Locally (Development)

### Prerequisites

- [Bun](https://bun.sh/)
- PostgreSQL & MongoDB running (or use Docker for DBs only: `docker compose up -d postgres mongo`)
- [Stripe CLI](https://stripe.com/docs/stripe-cli)

### 1. Install dependencies

```bash
bun install
```

### 2. Setup environment

```bash
cp .env.example .env
# Fill in the required values
```

### 3. Setup database

```bash
bunx prisma generate
bunx prisma migrate dev
bunx tsx prisma/seed.ts
```

### 4. Start dev server

```bash
bun dev
```

### 5. Stripe webhook testing

```bash
stripe listen --forward-to localhost:3000/api/v1/stripe/webhook
```

### 6. Open app

- http://localhost:3000

### Default seed credentials

- **Admin**: `admin@yokairlines.com` / `Passw0rd123!`

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details


