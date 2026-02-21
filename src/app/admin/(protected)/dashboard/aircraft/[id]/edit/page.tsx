import { AircraftEditForm } from "@/components/AircraftEditForm";
import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { aircraftService, AircraftNotFoundError } from "@/services/aircraft.services"; 
import { auth } from "@/lib/auth";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditAircraftPage({ params }: PageProps) {
  // 1. Unwrap params (Next.js 15+)
  const resolvedParams = await params;
  const id = resolvedParams.id; // Leave as string since your DB uses CUIDs now

  // 2. Securely fetch the Better Auth session
  const sessionResponse = await auth.api.getSession({
    headers: await headers(),
  });

  if (!sessionResponse) {
    redirect("/admin/login");
  }

  try {
    // 3. Fetch Aircraft Data using the new service (requires session)
    const aircraft = await aircraftService.findById(id, sessionResponse.user as any);

    // 4. Fetch Aircraft Types 
    // NOTE: Your new aircraftService does not include getAircraftTypes().
    // You will need to replace this array with a call to your aircraft type repository.
    const aircraftTypes: any[] = []; 

    // 5. Render Form
    return (
      <AircraftEditForm 
        aircraft={aircraft as any} 
        aircraftTypes={aircraftTypes} 
      />
    );
  } catch (error) {
    // 6. Gracefully handle 404s using your custom error class
    if (error instanceof AircraftNotFoundError) {
      notFound();
    }
    // Re-throw other unexpected errors
    throw error;
  }
}