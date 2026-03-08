import { AircraftManagement } from '@/components/AircraftManagement';
import { redirect } from 'next/navigation';
import { aircraftService } from '@/services/aircraft.services'; 
import { aircraftTypeService } from '@/services/aircraft-type.services'; 
import { getServerSession } from '@/services/auth.services';
import type { Prisma } from '@/generated/prisma/client';

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
  const limit = 15; 
  
  const search = typeof resolvedParams.search === 'string' ? resolvedParams.search : '';
  const statusFilter = typeof resolvedParams.status === 'string' ? resolvedParams.status : '';

  // We need the aircraft types for the dropdowns
  const aircraftTypes = await aircraftTypeService.findAll(session as any);

  // 🌟 BUILD THE PRISMA WHERE CLAUSE
  const where: Prisma.AircraftWhereInput = {};
  
  if (search) {
    where.OR = [
      { tailNumber: { contains: search, mode: 'insensitive' } },
      // Assuming relation is 'type' and field is 'model' based on your previous filter
      { type: { model: { contains: search, mode: 'insensitive' } } } 
    ];
  }

  if (statusFilter) {
    where.status = statusFilter as any; // Cast to your Prisma Enum type
  }

  // 🌟 DELEGATE PAGINATION AND FILTERING DIRECTLY TO THE DATABASE
  const response = await aircraftService.findAllPaginated(session as any, { 
    page, 
    limit, 
    where 
  } as any);

  return (
    <AircraftManagement 
      initialAircrafts={response.data as any} 
      aircraftTypes={aircraftTypes as any}
      totalPages={response.meta.totalPages}
      currentPage={page}
      userRole={session.user.role}
    />
  );
}