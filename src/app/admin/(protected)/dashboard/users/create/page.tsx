import { UserCreateForm } from "@/components/UserCreateForm";
import { airportService } from "@/services/airport.services";
import { getServerSession } from "@/services/auth.services";
import { redirect } from "next/navigation";

export default async function CreateUserPage() {
  const session = await getServerSession();
  
  if (!session || session.user.role !== 'ADMIN') {
    redirect('/admin/login');
  }

  // Fetch airports for base/station selection
  let airports: Awaited<ReturnType<typeof airportService.findAll>> = [];
  try {
    airports = await airportService.findAll(session as any);
  } catch (error) {
    console.error("Failed to fetch airports for user creation:", error);
  }

  return (
    <UserCreateForm airports={airports as any} />
  );
}
