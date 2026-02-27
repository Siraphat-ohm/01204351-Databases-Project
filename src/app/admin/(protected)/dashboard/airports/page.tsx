import { AirportManagement } from '@/components/AirportManagement';
import { airportService } from '@/services/airport.services'; 
import { getServerSession } from '@/services/auth.services'; 
import { redirect } from 'next/navigation';

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function AirportsPage({ searchParams }: PageProps) {
  const session = await getServerSession();
  if (!session) redirect('/admin/login');

  const resolvedParams = await searchParams;
  const page = Number(resolvedParams.page) || 1;
  const limit = 15; // 👈 Fixed limit set to 15
  const search = typeof resolvedParams.search === 'string' ? resolvedParams.search.toLowerCase() : '';

  let finalData = [];
  let totalPages = 1;

  if (search) {
    // WORKAROUND: Because the service doesn't support search, we fetch all 
    // and filter + paginate manually on the server.
    const allAirports = await airportService.findAll(session as any);
    
    const filtered = allAirports.filter(a => 
      a.iataCode.toLowerCase().includes(search) ||
      a.name.toLowerCase().includes(search) ||
      a.city.toLowerCase().includes(search) ||
      a.country.toLowerCase().includes(search)
    );

    const total = filtered.length;
    totalPages = Math.ceil(total / limit) || 1;
    
    const skip = (page - 1) * limit;
    finalData = filtered.slice(skip, skip + limit);

  } else {
    // If no search, use the native paginated service
    const response = await airportService.findAllPaginated(session as any, { page, limit });
    finalData = response.data;
    totalPages = response.meta.totalPages;
  }

  return (
    <AirportManagement 
      initialAirports={finalData as any} 
      totalPages={totalPages}
      currentPage={page}
    />
  );
}