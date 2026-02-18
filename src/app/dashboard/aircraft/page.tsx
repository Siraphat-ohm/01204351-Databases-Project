import { AircraftManagement }  from '@/components/AircraftManagement';

// 1. Types mirroring Prisma Result
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

// 2. Mock Data Service (Server Side)
async function getFleetData() {
  // Simulate DB Latency
  await new Promise((resolve) => setTimeout(resolve, 600));

  // Mock Aircraft Types (Reference Table)
  // Prisma: await prisma.aircraftType.findMany()
  const aircraftTypes: AircraftType[] = [
    { id: 1, model: 'Boeing 777-300ER', capacityEco: 306, capacityBiz: 42 },
    { id: 2, model: 'Airbus A350-900', capacityEco: 289, capacityBiz: 32 },
    { id: 3, model: 'Airbus A320-200', capacityEco: 168, capacityBiz: 0 },
    { id: 4, model: 'ATR 72-600', capacityEco: 70, capacityBiz: 0 },
  ];

  // Mock Aircrafts (Main Table)
  // Prisma: await prisma.aircraft.findMany({ include: { type: true } })
  const aircrafts: Aircraft[] = [
    { id: 101, tailNumber: 'HS-TBA', status: 'ACTIVE', type: aircraftTypes[0] },
    { id: 102, tailNumber: 'HS-TBB', status: 'MAINTENANCE', type: aircraftTypes[0] },
    { id: 103, tailNumber: 'HS-XEA', status: 'ACTIVE', type: aircraftTypes[1] },
    { id: 104, tailNumber: 'HS-BBX', status: 'ACTIVE', type: aircraftTypes[2] },
    { id: 105, tailNumber: 'HS-BBY', status: 'ACTIVE', type: aircraftTypes[2] },
    { id: 106, tailNumber: 'HS-PGA', status: 'RETIRED', type: aircraftTypes[3] },
    { id: 107, tailNumber: 'HS-PGB', status: 'MAINTENANCE', type: aircraftTypes[3] },
  ];

  return { aircrafts, aircraftTypes };
}

export default async function AircraftPage() {
  // Fetch data on the server
  const { aircrafts, aircraftTypes } = await getFleetData();

  // Pass data to Client Component
  return (
    <AircraftManagement 
      initialAircrafts={aircrafts} 
      aircraftTypes={aircraftTypes} 
    />
  );
}