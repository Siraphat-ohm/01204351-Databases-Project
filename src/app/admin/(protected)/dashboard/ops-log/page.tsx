import { FlightOpsLogManagement } from "@/components/FlightOpsLogManagement";
import { flightOpsLogService } from "@/services/flight-ops-log.services"; 
import { flightRepository } from "@/repositories/flight.repository";
import { getServerSession } from "@/services/auth.services";
import { redirect } from "next/navigation";

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function FlightOpsLogsPage({ searchParams }: PageProps) {
  const session = await getServerSession();

  if (!session) {
    redirect('/admin/login');
  }

  const resolvedParams = await searchParams;
  const page = Number(resolvedParams.page) || 1;
  const limit = 15; // Set pagination limit
  const search = typeof resolvedParams.search === 'string' ? resolvedParams.search : '';

  // 1. Build the database query (where clause) - Mongoose compatible!
  const where: any = {};

  if (search) {
    where.$or = [
      { flightId: { $regex: search, $options: 'i' } },
      { captainName: { $regex: search, $options: 'i' } },
    ];
  }

  // 2. Fetch paginated and filtered data natively from the Database
  const response = await flightOpsLogService.findAllPaginated(session as any, {
    page,
    limit,
    where
  } as any);

  // 3. Fetch flight details for display (avoid N+1)
  const flightIds = Array.from(new Set(response.data.map((log: any) => log.flightId)));
  const flights = await flightRepository.findAll({
    where: { id: { in: flightIds } }
  });

  const flightMap = new Map(flights.map(f => [f.id, f]));

  // 4. Sanitize data strictly for the Client Component
  const sanitizedLogs = response.data.map((log: any) => {
    const lData = typeof log.toJSON === 'function' ? log.toJSON() : log;
    const flight: any = flightMap.get(lData.flightId);

    return {
      id: lData._id?.toString() || lData.id,
      flightId: lData.flightId?.toString() || 'Unknown',
      flightCode: flight?.flightCode || 'Unknown',
      route: flight ? `${flight.route.origin.iataCode} - ${flight.route.destination.iataCode}` : 'Unknown',

      captainName: lData.captainName,

      gateChanges: (lData.gateChanges || []).map((gc: any) => ({
        from: gc.from,
        to: gc.to,
        reason: gc.reason,
        time: gc.time ? new Date(gc.time).toISOString() : null,
      })),

      weatherConditions: lData.weatherConditions ? {
        origin: lData.weatherConditions.origin,
        destination: lData.weatherConditions.destination
      } : null,

      incidents: lData.incidents || [],
      maintenanceChecklist: JSON.parse(JSON.stringify(lData.maintenanceChecklist || {})), 
      createdAt: lData.createdAt ? new Date(lData.createdAt).toISOString() : new Date().toISOString(),
    };
  });

  return (
    <FlightOpsLogManagement 
      initialLogs={sanitizedLogs} 
      userRole={session.user.role} 
      totalPages={response.meta.totalPages}
      currentPage={page}
    />
  );
}