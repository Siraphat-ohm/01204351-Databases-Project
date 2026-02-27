import { FlightOpsLogManagement } from "@/components/FlightOpsLogManagement";
import { flightOpsLogService } from "@/services/flight-ops-log.services"; 
import { getServerSession } from "@/services/auth.services";
import { redirect } from "next/navigation";

export default async function FlightOpsLogsPage() {
  const session = await getServerSession();
  
  if (!session) {
    redirect('/login');
  }

  let rawLogs = [];
  try {
    rawLogs = await flightOpsLogService.findAll(session);
  } catch (err) {
    redirect('/dashboard'); 
  }

  // Sanitize data for the Client Component
  const sanitizedLogs = rawLogs.map((log: any) => {
    const lData = typeof log.toJSON === 'function' ? log.toJSON() : log;

    return {
      id: lData._id?.toString() || lData.id,
      flightId: lData.flightId?.toString() || 'Unknown',
      captainName: lData.captainName,
      
      // ✅ FIX: Explicitly extract only the needed fields to drop the hidden `_id` buffer
      gateChanges: (lData.gateChanges || []).map((gc: any) => ({
        from: gc.from,
        to: gc.to,
        reason: gc.reason,
        time: new Date(gc.time).toISOString(),
      })),
      
      // ✅ FIX: Also explicitly extract weather to drop any hidden `_id` buffers
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
    />
  );
}