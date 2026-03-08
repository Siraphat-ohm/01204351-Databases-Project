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

## Run with Docker

1. Copy env template:
	- `cp .env.example .env`
2. Update required values in `.env` (at minimum DB credentials, auth secret, and app URL).
3. Start all services:
	- `docker compose up --build -d`
4. Open app:
	- `http://localhost:3000`

Included services:
- Next.js app (`app`)
- PostgreSQL (`postgres`)
- pgAdmin (`pgadmin`)
- MongoDB (`mongo`)
- Mongo web client (`mongo-compass`)

To stop:
- `docker compose down`

To stop and remove volumes:
- `docker compose down -v`

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

## How to Run Locally

1. Clone the repository:
   - `git clone
2. Install dependencies:
   - `bun install`
3. Set up environment variables:
   - Create a `.env` file based on `.env.example` and fill in the required values.
4. Start the development server:
   - `bun dev`
5. Access the application at:
   - `http://localhost:3000`
6. Stripe Webhook Testing:
   - Use Stripe CLI to forward webhooks to your local server:
   - `stripe listen --forward-to localhost:3000/api/v1/stripe/webhook`

## License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details


