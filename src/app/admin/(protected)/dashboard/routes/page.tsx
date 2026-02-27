import { RouteManagement } from '@/components/RouteManagement';
import { routeService } from '@/services/route.services';
import { getServerSession } from '@/services/auth.services'; 
import { redirect } from 'next/navigation';
import type { Prisma } from '@/generated/prisma/client';

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

  const originSearch = typeof resolvedParams.origin === 'string' ? resolvedParams.origin : '';
  const destSearch = typeof resolvedParams.destination === 'string' ? resolvedParams.destination : '';

  // 2. Build the Prisma Where Clause natively
  const where: Prisma.RouteWhereInput = {};
  const andConditions: Prisma.RouteWhereInput[] = [];

  if (originSearch) {
    andConditions.push({
      origin: {
        OR: [
          { iataCode: { contains: originSearch, mode: 'insensitive' } },
          { city: { contains: originSearch, mode: 'insensitive' } },
        ]
      }
    });
  }

  if (destSearch) {
    andConditions.push({
      destination: {
        OR: [
          { iataCode: { contains: destSearch, mode: 'insensitive' } },
          { city: { contains: destSearch, mode: 'insensitive' } },
        ]
      }
    });
  }

  // If both or either search term exists, apply the AND condition
  if (andConditions.length > 0) {
    where.AND = andConditions;
  }

  // 3. Delegate Pagination and Filtering directly to the Database
  const response = await routeService.findAllPaginated(session as any, { 
    page, 
    limit, 
    where 
  } as any);

  // 4. Pass Data to Client Component
  return (
    <RouteManagement 
      initialRoutes={response.data as any} 
      totalPages={response.meta.totalPages}
      currentPage={page}
    />
  );
}