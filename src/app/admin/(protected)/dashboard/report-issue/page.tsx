import { IssueReportForm } from "@/components/IssueReportForm";
import { getServerSession } from "@/services/auth.services";
import { flightService } from "@/services/flight.services";
import { redirect } from "next/navigation";

export default async function ReportIssuePage() {
  const session = await getServerSession();
  
  if (!session) {
    redirect('/admin/login');
  }

  // Fetch upcoming flights for selection
  let upcomingFlights: { id: string; flightCode: string; route: string }[] = [];
  try {
    const flights = await flightService.findAll(session as any);
    upcomingFlights = (flights as any[])
      .filter(f => new Date(f.departureTime) >= new Date())
      .map(f => ({
        id: f.id,
        flightCode: f.flightCode,
        route: `${f.route.origin.iataCode} - ${f.route.destination.iataCode}`
      }));
  } catch (error) {
    console.error("Failed to fetch flights for issue report:", error);
  }

  return (
    <IssueReportForm initialFlights={upcomingFlights} />
  );
}
