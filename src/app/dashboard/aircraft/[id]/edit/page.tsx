import { AircraftEditForm } from "@/components/AircraftEditForm";
import { notFound } from "next/navigation";
import { AircraftService } from "@/lib/services/backoffice/aircraft"; // Adjust path if needed

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditAircraftPage({ params }: PageProps) {
  // 1. Unwrap params (Next.js 15+)
  const resolvedParams = await params;
  const id = Number(resolvedParams.id);

  // Validate ID format
  if (isNaN(id)) {
    notFound();
  }

  // 2. Fetch Aircraft Data & Types in Parallel
  const [aircraft, aircraftTypes] = await Promise.all([
    AircraftService.getAircraftById(id),
    AircraftService.getAircraftTypes(),
  ]);

  // 3. Handle 404 if aircraft doesn't exist
  if (!aircraft) {
    notFound();
  }

  // 4. Render Form
  return (
    <AircraftEditForm 
      aircraft={aircraft} 
      aircraftTypes={aircraftTypes} 
    />
  );
}