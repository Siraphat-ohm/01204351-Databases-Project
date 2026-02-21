import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { createRouteSchema, updateRouteSchema } from "@/types/route.type";
import { routeRepository } from "@/repositories/route.repository";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";
  const skip = Number(searchParams.get("skip") || 0);
  const take = Number(searchParams.get("take") || 20);

  const where = search
    ? {
        OR: [
          { origin: { name: { contains: search, mode: "insensitive" } } },
          { destination: { name: { contains: search, mode: "insensitive" } } },
        ],
      }
    : undefined;

  const [data, total] = await Promise.all([
    prisma.route.findMany({
      where,
      skip,
      take,
      include: { origin: true, destination: true },
    }),
    prisma.route.count({ where }),
  ]);

  return NextResponse.json({ data, total, skip, take });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = createRouteSchema.parse(body);

    const existing = await routeRepository.findByAirportIds(
      data.originAirportId,
      data.destAirportId,
    );
    if (existing) {
      return NextResponse.json(
        { message: "Route already exists" },
        { status: 409 },
      );
    }

    if (data.createReturn) {
      const reverseExists = await routeRepository.findByAirportIds(
        data.destAirportId,
        data.originAirportId,
      );
      if (reverseExists) {
        return NextResponse.json(
          { message: "Return route already exists" },
          { status: 409 },
        );
      }
    }

    if (data.createReturn) {
      const [route, returnRoute] = await prisma.$transaction([
        prisma.route.create({
          data: {
            originAirportId: data.originAirportId,
            destAirportId: data.destAirportId,
            distanceKm: data.distanceKm,
            durationMins: data.durationMins ?? null,
          },
          include: { origin: true, destination: true },
        }),
        prisma.route.create({
          data: {
            originAirportId: data.destAirportId,
            destAirportId: data.originAirportId,
            distanceKm: data.distanceKm,
            durationMins: data.durationMins ?? null,
          },
          include: { origin: true, destination: true },
        }),
      ]);

      return NextResponse.json({ route, returnRoute });
    }

    const route = await prisma.route.create({
      data: {
        originAirportId: data.originAirportId,
        destAirportId: data.destAirportId,
        distanceKm: data.distanceKm,
        durationMins: data.durationMins ?? null,
      },
      include: { origin: true, destination: true },
    });

    return NextResponse.json({ route, returnRoute: null });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ issues: error.issues }, { status: 400 });
    }
    return NextResponse.json({ message: "Failed to create route" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const id = z.string().cuid().parse(body?.id);
    const data = updateRouteSchema.parse(body);

    const existing = await routeRepository.findByIdAdmin(id);
    if (!existing) {
      return NextResponse.json({ message: "Route not found" }, { status: 404 });
    }

    const route = await prisma.route.update({
      where: { id },
      data,
      include: { origin: true, destination: true },
    });

    return NextResponse.json({ route });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ issues: error.issues }, { status: 400 });
    }
    return NextResponse.json({ message: "Failed to update route" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    let id = searchParams.get("id");

    if (!id && req.headers.get("content-type")?.includes("application/json")) {
      const body = await req.json();
      id = body?.id;
    }

    const routeId = z.string().cuid().parse(id);

    const existing = await routeRepository.findByIdAdmin(routeId);
    if (!existing) {
      return NextResponse.json({ message: "Route not found" }, { status: 404 });
    }

    const activeFlights = await routeRepository.countActiveFlights(routeId);
    if (activeFlights > 0) {
      return NextResponse.json(
        { message: "Route has active flights" },
        { status: 409 },
      );
    }

    await prisma.route.delete({ where: { id: routeId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ issues: error.issues }, { status: 400 });
    }
    return NextResponse.json({ message: "Failed to delete route" }, { status: 500 });
  }
}