import { FlightTicketManagement } from "@/components/FlightTicketManagement";
import { ticketService } from "@/services/ticket.services"; // Adjust path
import { getServerSession } from "@/services/auth.services"; // Adjust path
import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function FlightTicketsPage({ params }: PageProps) {
  const resolvedParams = await params;
  const flightId = resolvedParams.id;
  
  const session = await getServerSession();
  
  if (!session) {
    redirect('/login');
  }

  // 1. Fetch raw tickets using your service
  const rawTickets = await ticketService.findByFlightId(flightId, session);

  // 2. Sanitize data to plain JavaScript objects
  const sanitizedTickets = rawTickets.map((ticket: any) => {
    const tData = typeof ticket.toJSON === 'function' ? ticket.toJSON() : ticket;

    return {
      id: tData._id?.toString() || tData.id,
      bookingId: tData.bookingId?.toString() || 'Unknown',
      flightId: tData.flightId?.toString(),
      firstName: tData.firstName,
      lastName: tData.lastName,
      class: tData.class,
      seatNumber: tData.seatNumber || null,
      checkedIn: !!tData.checkedIn, // Boolean cast
      boardingPass: tData.boardingPass || null,
      price: tData.price ? parseInt(tData.price.toString(), 10) : 0,
    };
  });

  return (
    <FlightTicketManagement 
      flightId={flightId} 
      initialTickets={sanitizedTickets} 
    />
  );
}