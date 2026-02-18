// app/dashboard/flights/[id]/edit/page.tsx

import { FlightService } from "@/lib/services/backoffice/flight";
import { FlightEditForm } from "@/components/FlightEditForm";
import { notFound } from "next/navigation";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditFlightPage({ params }: PageProps) {
  // 1. Unwrap params (Next.js 15+)
  const resolvedParams = await params;
  const id = resolvedParams.id;

  // 2. Fetch specific flight
  const flight = await FlightService.getFlightByFlightCode(id);

  if (!flight) {
    notFound();
  }

  // 3. ✅ FIX: Prepare Serializable Object
  // เราต้องสร้าง Object ใหม่ที่ตัดส่วนที่ไม่จำเป็น (เช่น bookings ที่มี Decimal) ทิ้ง
  // และแปลง basePrice จาก Decimal เป็น Number
  const serializableFlight = {
    id: flight.id,
    flightCode: flight.flightCode,
    status: flight.status,
    gate: flight.gate,
    departureTime: flight.departureTime, // Next.js สมัยใหม่ serialize Date ได้ แต่ถ้ามีปัญหาให้ใช้ .toISOString()
    
    // แปลง Decimal เป็น Number
    basePrice: flight.basePrice.toNumber(),
    
    // ส่งเฉพาะ Relation ที่ Form ต้องใช้
    aircraft: {
      id: flight.aircraft.id,
      tailNumber: flight.aircraft.tailNumber,
      type: {
        model: flight.aircraft.type.model
      }
    },
    route: {
      origin: {
        city: flight.route.origin.city,
        iataCode: flight.route.origin.iataCode
      },
      destination: {
        city: flight.route.destination.city,
        iataCode: flight.route.destination.iataCode
      }
    }
  };

  // 4. Render the Form with sanitized data
  return <FlightEditForm flight={serializableFlight} />;
}