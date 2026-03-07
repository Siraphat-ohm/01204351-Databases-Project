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
  const limit = 15; 
  const search = typeof resolvedParams.search === 'string' ? resolvedParams.search : '';

  // 🌟 Delegate pagination and searching entirely to your built-in service!
  // If search is empty, this service automatically falls back to fetching all records safely.
  const response = await airportService.searchPaginated(search, session as any, { 
    page, 
    limit 
  });

  return (
    <AirportManagement 
      initialAirports={response.data as any} 
      totalPages={response.meta.totalPages}
      currentPage={page}
      userRole={session.user.role}
    />
  );
}