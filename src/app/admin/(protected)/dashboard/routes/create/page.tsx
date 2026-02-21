import { RouteCreateForm } from "@/components/RouteCreateForm";
import { airportService } from "@/services/airport.services";
import { requireServerSession } from "@/services/auth.services"; // Adjust path to your new auth utility

export default async function CreateRoutePage() {
  // 1. Enforce Authentication
  const session = await requireServerSession();

  // 2. Fetch Airports for the selection dropdowns
  const airports = await airportService.findAll(session as any);

  // 3. Render the dedicated form component
  return <RouteCreateForm airports={airports as any} />;
}