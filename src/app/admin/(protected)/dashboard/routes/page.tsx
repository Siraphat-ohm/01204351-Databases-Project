import { RouteManagement } from '@/components/RouteManagement';
import { routeService } from '@/services/route.services';
import { getServerSession } from '@/services/auth.services'; 
import { redirect } from 'next/navigation';

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function RoutesPage({ searchParams }: PageProps) {
  // 1. Authenticate Request
  const session = await getServerSession();
  if (!session) redirect('/admin/login');

  const resolvedParams = await searchParams;
  const page = Number(resolvedParams.page) || 1;
  const limit = 15; // Set pagination limit

  const originSearch = typeof resolvedParams.origin === 'string' ? resolvedParams.origin.toLowerCase() : '';
  const destSearch = typeof resolvedParams.destination === 'string' ? resolvedParams.destination.toLowerCase() : '';

  let finalData = [];
  let totalPages = 1;

  if (originSearch || destSearch) {
    // 2a. Fetch all and filter on the server if search parameters exist
    const allRoutes = await routeService.findAll(session as any);

    const filteredRoutes = allRoutes.filter((route: any) => {
      const matchesOrigin = !originSearch || 
        route.origin.iataCode.toLowerCase().includes(originSearch) ||
        route.origin.city.toLowerCase().includes(originSearch);

      const matchesDest = !destSearch || 
        route.destination.iataCode.toLowerCase().includes(destSearch) ||
        route.destination.city.toLowerCase().includes(destSearch);

      return matchesOrigin && matchesDest;
    });

    const total = filteredRoutes.length;
    totalPages = Math.ceil(total / limit) || 1;
    
    const skip = (page - 1) * limit;
    finalData = filteredRoutes.slice(skip, skip + limit);

  } else {
    // 2b. No filters: Use the native paginated service
    const response = await routeService.findAllPaginated(session as any, { page, limit });
    finalData = response.data;
    totalPages = response.meta.totalPages;
  }

  // 3. Pass Data to Client Component
  return (
    <RouteManagement 
      initialRoutes={finalData as any} 
      totalPages={totalPages}
      currentPage={page}
    />
  );
}