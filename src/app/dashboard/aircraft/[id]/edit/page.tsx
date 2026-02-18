import { AircraftEditForm } from "@/components/AircraftEditForm";
import { notFound } from "next/navigation";

// --- Types (Mocking Prisma) ---
type AircraftStatus = 'ACTIVE' | 'MAINTENANCE' | 'RETIRED';

interface AircraftType {
  id: number;
  model: string;
  capacityEco: number;
  capacityBiz: number;
}

interface Aircraft {
  id: number;
  tailNumber: string;
  status: AircraftStatus;
  type: AircraftType;
}

interface PageProps {
  params: Promise<{ id: string }>;
}

// --- Mock Service Function ---
async function getAircraftEditData(id: number) {
  // Simulate DB Latency
  await new Promise((resolve) => setTimeout(resolve, 500));

  // 1. Mock Reference Data (Aircraft Types)
  const aircraftTypes: AircraftType[] = [
    { id: 1, model: 'Boeing 777-300ER', capacityEco: 306, capacityBiz: 42 },
    { id: 2, model: 'Airbus A350-900', capacityEco: 289, capacityBiz: 32 },
    { id: 3, model: 'Airbus A320-200', capacityEco: 168, capacityBiz: 0 },
    { id: 4, model: 'ATR 72-600', capacityEco: 70, capacityBiz: 0 },
  ];

  // 2. Mock Specific Aircraft Data
  // In real app: await prisma.aircraft.findUnique({ where: { id }, include: { type: true } })
  
  // Let's simulate finding one based on ID, or return 404 if not "found"
  let aircraft: Aircraft | undefined;

  // Simple mock logic to generate data based on ID
  if (id >= 100 && id < 200) {
    const typeIndex = id % 4; // vary the type based on ID
    aircraft = {
      id: id,
      tailNumber: id === 101 ? 'HS-TBA' : `HS-GEN-${id}`,
      status: id % 2 === 0 ? 'MAINTENANCE' : 'ACTIVE',
      type: aircraftTypes[typeIndex]
    };
  }

  return { aircraft, aircraftTypes };
}

export default async function EditAircraftPage({ params }: PageProps) {
  const resolvedParams = await params;
  const id = Number(resolvedParams.id);

  if (isNaN(id)) {
    notFound();
  }

  // Fetch data
  const { aircraft, aircraftTypes } = await getAircraftEditData(id);

  if (!aircraft) {
    notFound();
  }

  return (
    <AircraftEditForm 
      aircraft={aircraft} 
      aircraftTypes={aircraftTypes} 
    />
  );
}