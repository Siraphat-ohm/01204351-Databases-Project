import { FlightOpsLogManagement } from "@/components/FlightOpsLogManagement";
import { flightOpsLogService } from "@/services/flight-ops-log.services"; 
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
  const search = typeof resolvedParams.search === 'string' ? resolvedParams.search.toLowerCase() : '';

  let rawLogs = [];
  try {
    // Fetch all logs from the database
    rawLogs = await flightOpsLogService.findAll(session as any);
  } catch (err) {
    redirect('/admin/dashboard'); 
  }

  // 1. Filter data natively on the Server
  const filteredLogs = rawLogs.filter((log: any) => {
    if (!search) return true;
    const flightId = log.flightId?.toString().toLowerCase() || '';
    const captain = log.captainName?.toLowerCase() || '';
    return flightId.includes(search) || captain.includes(search);
  });

  // 2. Handle Pagination Calculation
  const totalPages = Math.ceil(filteredLogs.length / limit) || 1;
  const skip = (page - 1) * limit;
  const paginatedLogs = filteredLogs.slice(skip, skip + limit);

  // 3. Sanitize data strictly for the Client Component (drop hidden buffers)
  const sanitizedLogs = paginatedLogs.map((log: any) => {
    const lData = typeof log.toJSON === 'function' ? log.toJSON() : log;

    return {
      id: lData._id?.toString() || lData.id,
      flightId: lData.flightId?.toString() || 'Unknown',
      captainName: lData.captainName,
      
      gateChanges: (lData.gateChanges || []).map((gc: any) => ({
        from: gc.from,
        to: gc.to,
        reason: gc.reason,
        time: new Date(gc.time).toISOString(),
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
      totalPages={totalPages}
      currentPage={page}
    />
  );
}