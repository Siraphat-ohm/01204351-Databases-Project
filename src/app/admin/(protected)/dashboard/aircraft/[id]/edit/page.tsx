// app/dashboard/aircraft/[id]/edit/page.tsx

import { AircraftEditForm } from "@/components/AircraftEditForm";
import { notFound } from "next/navigation";
import { aircraftService, AircraftNotFoundError } from "@/services/aircraft.services"; 
import { aircraftTypeService } from "@/services/aircraft-type.services"; // Import your new service!
import { requireServerSession } from "@/services/auth.services"; // Use your clean auth utility

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditAircraftPage({ params }: PageProps) {
  // 1. Unwrap params (Next.js 15+)
  const resolvedParams = await params;
  const id = resolvedParams.id; // Using string CUIDs

  try {
    // 2. Enforce authentication and get the session 
    // (Throws AuthenticationRequiredError if not logged in)
    const session = await requireServerSession();

    // 3. Fetch Aircraft Data & Aircraft Types in Parallel!
    // Both of these methods require the user session for your RBAC checks.
    const [aircraft, aircraftTypes] = await Promise.all([
      aircraftService.findById(id, session as any),
      aircraftTypeService.findAll(session as any),
    ]);

    // 4. Render Form with the real, fully-typed data
    return (
      <AircraftEditForm 
        aircraft={aircraft as any} 
        aircraftTypes={aircraftTypes as any} 
      />
    );
  } catch (error) {
    // 5. Gracefully handle 404s using your custom error class
    if (error instanceof AircraftNotFoundError) {
      notFound();
    }
    
    // Note: If AuthenticationRequiredError or UnauthorizedError is thrown, 
    // Next.js will naturally catch it and render your nearest error.tsx boundary.
    throw error;
  }
}