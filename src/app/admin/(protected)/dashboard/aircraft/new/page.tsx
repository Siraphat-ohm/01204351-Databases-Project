import { AircraftCreateForm } from '@/components/AircraftCreateForm';
import { aircraftTypeService } from '@/services/aircraft-type.services'; 
import { getServerSession } from '@/services/auth.services';
import { redirect } from 'next/navigation';

export default async function NewAircraftPage() {
  const session = await getServerSession();
  if (!session) redirect('/admin/login');

  const aircraftTypes = await aircraftTypeService.findAll(session as any);

  // Add capacities to the sanitized payload
  const simplifiedTypes = aircraftTypes.map((type) => ({
    id: type.id,
    model: type.model,
    iataCode: type.iataCode,
    capacityEco: type.capacityEco || 0,
    capacityBiz: type.capacityBiz || 0,
    capacityFirst: type.capacityFirst || 0,
  }));

  return <AircraftCreateForm aircraftTypes={simplifiedTypes} />;
}