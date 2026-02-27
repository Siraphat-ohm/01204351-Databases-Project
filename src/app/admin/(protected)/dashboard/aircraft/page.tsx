import { AircraftManagement } from '@/components/AircraftManagement';
import { redirect } from 'next/navigation';
import { aircraftService } from '@/services/aircraft.services'; 
import { aircraftTypeService } from '@/services/aircraft-type.services'; 
import { getServerSession } from '@/services/auth.services';

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function AircraftPage({ searchParams }: PageProps) {
  const session = await getServerSession();

  if (!session) {
    redirect('/admin/login'); 
  }

  const resolvedParams = await searchParams;
  const page = Number(resolvedParams.page) || 1;
  const limit = 15; // Set your desired items per page here
  
  const search = typeof resolvedParams.search === 'string' ? resolvedParams.search.toLowerCase() : '';
  const statusFilter = typeof resolvedParams.status === 'string' ? resolvedParams.status : '';

  let finalData = [];
  let totalPages = 1;

  // We need the aircraft types regardless of searching
  const aircraftTypes = await aircraftTypeService.findAll(session as any);

  if (search || statusFilter) {
    // WORKAROUND: If filtering is applied, fetch all and filter on the server
    const allAircrafts = await aircraftService.findAll(session as any);
    
    const filtered = allAircrafts.filter((ac: any) => {
      const matchesSearch = search === '' || 
        ac.tailNumber.toLowerCase().includes(search) ||
        (ac.type?.model?.toLowerCase() || '').includes(search);
      
      const matchesStatus = statusFilter === '' || ac.status === statusFilter;

      return matchesSearch && matchesStatus;
    });

    const total = filtered.length;
    totalPages = Math.ceil(total / limit) || 1;
    
    const skip = (page - 1) * limit;
    finalData = filtered.slice(skip, skip + limit);

  } else {
    // No filters: Use the native paginated service
    const response = await aircraftService.findAllPaginated(session as any, { page, limit });
    finalData = response.data;
    totalPages = response.meta.totalPages;
  }

  return (
    <AircraftManagement 
      initialAircrafts={finalData as any} 
      aircraftTypes={aircraftTypes as any}
      totalPages={totalPages}
      currentPage={page}
    />
  );
}