import { BookingTable } from "@/components/BookingTable";
import { getServerSession } from "@/services/auth.services";
import { bookingService } from "@/services/booking.services";
import { redirect } from "next/navigation";

export default async function BookingsPage() {
  const session = await getServerSession();
  
  if (!session || session.user.role === 'PASSENGER') {
    redirect('/admin/login');
  }

  const response = await bookingService.findAllPaginated(session as any, {
    limit: 50,
  });

  return (
    <BookingTable 
      initialBookings={response.data as any} 
      userRole={session.user.role} 
    />
  );
}
