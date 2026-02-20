import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";

  const airports = await prisma.airport.findMany({
    where: {
      OR: [
        { iataCode: { contains: search, mode: "insensitive" } },
        { city: { contains: search, mode: "insensitive" } },
        { name: { contains: search, mode: "insensitive" } },
      ],
    },
    take: 20,
  });

  return NextResponse.json(airports);
}
