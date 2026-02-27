import { AirportCreateForm } from "@/components/AirportCreateForm";
import { requireServerSession } from "@/services/auth.services"; // Adjust path to your new auth utility

export default async function CreateAirportPage() {
  // Enforce admin authentication before rendering the page
  await requireServerSession();

  return <AirportCreateForm />;
}