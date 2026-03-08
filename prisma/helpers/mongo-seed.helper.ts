import { faker } from "@faker-js/faker";
import { PrismaClient, Rank, Role } from "@/generated/prisma/client";
import mongoose from "mongoose";
import CrewProfile from "@/models/CrewProfile";
import FlightOpsLog from "@/models/FlightOpsLog";
import IssueReport from "@/models/IssueReport";
import PaymentLog from "@/models/PaymentLog";
import { randInt } from "./seed-utils.helper";

const MONGO_URI = process.env.MONGO_USER_DATABASE_URL ?? process.env.MONGODB_URI;

export async function seedMongoData(
  prisma: PrismaClient,
  passengers: any[],
  staffProfiles: any[],
  flights: any[],
) {
  if (!MONGO_URI) {
    console.log("🟡 Mongo seed skipped (MONGO_USER_DATABASE_URL / MONGODB_URI not set)");
    return;
  }

  console.log("🍃 Seeding Mongo collections...");

  await mongoose.connect(MONGO_URI, { bufferCommands: false });

  try {
    await Promise.all([
      CrewProfile.deleteMany({}),
      FlightOpsLog.deleteMany({}),
      IssueReport.deleteMany({}),
      PaymentLog.deleteMany({}),
    ]);

    const crewRoles = new Set([Role.PILOT, Role.CABIN_CREW, Role.GROUND_STAFF, Role.MECHANIC]);
    const crewDocs = staffProfiles
      .filter((s: any) => crewRoles.has(s.role))
      .map((s: any) => ({
        userId: s.userId,
        nickname: faker.person.firstName(),
        languages: faker.helpers.arrayElements(["TH", "EN", "JP", "CN"], randInt(1, 3)),
        certifications: [
          {
            name: faker.helpers.arrayElement(["Safety", "First Aid", "ETOPS", "CRM"]),
            expireDate: faker.date.future({ years: 3 }),
          },
        ],
        flightHours: randInt(0, 12000),
      }));

    if (crewDocs.length) {
      await CrewProfile.insertMany(crewDocs, { ordered: false });
    }

    const captainUserIds = new Set(
      staffProfiles
        .filter((s: any) => s.role === Role.PILOT && s.rank === Rank.CAPTAIN)
        .map((s: any) => s.userId),
    );

    const captainUsers = await prisma.user.findMany({
      where: { id: { in: Array.from(captainUserIds) } },
      select: { id: true, name: true },
    });
    const captainNameMap = new Map(captainUsers.map((u) => [u.id, u.name]));

    const opsFlights = faker.helpers.arrayElements(flights, Math.min(flights.length, 180));
    const opsDocs = opsFlights.map((f: any) => ({
      flightId: f.id,
      captainName: (f.captainId && captainNameMap.get(f.captainId)) || "Unassigned Captain",
      gateChanges:
        Math.random() > 0.6
          ? [
              {
                from: `${faker.helpers.arrayElement(["A", "B", "C", "D"])}${randInt(1, 20)}`,
                to: `${faker.helpers.arrayElement(["A", "B", "C", "D"])}${randInt(1, 20)}`,
                time: faker.date.recent({ days: 3 }),
                reason: faker.helpers.arrayElement(["Congestion", "Operational", "Weather"]),
              },
            ]
          : [],
      weatherConditions:
        Math.random() > 0.5
          ? {
              origin: faker.helpers.arrayElement(["Clear", "Rain", "Storm", "Cloudy"]),
              destination: faker.helpers.arrayElement(["Clear", "Rain", "Storm", "Cloudy"]),
            }
          : undefined,
      incidents: Math.random() > 0.85 ? ["Minor operational delay"] : [],
      maintenanceChecklist: {
        fuelChecked: true,
        doorsChecked: true,
        tiresChecked: Math.random() > 0.02,
      },
    }));

    if (opsDocs.length) {
      await FlightOpsLog.insertMany(opsDocs, { ordered: false });
    }

    const issueUsers = faker.helpers.arrayElements(passengers, Math.min(passengers.length, 120));
    const issueDocs = issueUsers.map((u: any) => ({
      userId: u.id,
      category: faker.helpers.arrayElement(["booking", "payment", "flight", "baggage", "other"]),
      description: faker.lorem.sentence(),
      attachments: Math.random() > 0.8 ? [faker.internet.url()] : [],
      status: faker.helpers.arrayElement(["open", "investigating", "resolved", "closed"]),
    }));

    if (issueDocs.length) {
      await IssueReport.insertMany(issueDocs, { ordered: false });
    }

    const txRows = await prisma.transaction.findMany({
      take: 400,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        bookingId: true,
        amount: true,
        currency: true,
        status: true,
        paymentMethodType: true,
        refundReason: true,
      },
    });

    const statusMap: Record<string, "pending" | "success" | "failed" | "refunded"> = {
      PENDING: "pending",
      SUCCESS: "success",
      FAILED: "failed",
      REFUNDED: "refunded",
    };

    const paymentDocs = txRows.map((t) => ({
      transactionId: t.id,
      bookingId: t.bookingId,
      amount: Number(t.amount),
      currency: t.currency,
      status: statusMap[t.status],
      gateway: "stripe",
      rawResponse: {
        stripePaymentIntentId: `pi_${faker.string.alphanumeric({ length: 24, casing: "mixed" })}`,
        stripeChargeId: `py_${faker.string.alphanumeric({ length: 24, casing: "mixed" })}`,
        paymentMethodType: (t.paymentMethodType ?? faker.helpers.arrayElement(["card", "promptpay"])).toLowerCase(),
        paymentMethodRef: `pm_${faker.string.alphanumeric({ length: 24, casing: "mixed" })}`,
      },
    }));

    if (paymentDocs.length) {
      await PaymentLog.insertMany(paymentDocs, { ordered: false });
    }

    console.log(
      `  ✅ Mongo seeded | crewProfiles=${crewDocs.length} | flightOpsLogs=${opsDocs.length} | issues=${issueDocs.length} | paymentLogs=${paymentDocs.length}`,
    );
  } finally {
    await mongoose.disconnect();
  }
}
