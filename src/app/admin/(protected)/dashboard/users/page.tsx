import { UserManagement } from "@/components/UserManagement";
import { userService } from "@/services/user.services"; 
import { getServerSession } from '@/services/auth.services'; 
import { redirect } from "next/navigation";
import type { Prisma, Role } from '@/generated/prisma/client';

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function UsersPage({ searchParams }: PageProps) {
  const session = await getServerSession();
  
  if (!session || session.user.role === 'PASSENGER') {
    redirect('/admin/login'); 
  }

  const resolvedParams = await searchParams;
  const page = Number(resolvedParams.page) || 1;
  const limit = 15; // Set pagination limit

  const search = typeof resolvedParams.search === 'string' ? resolvedParams.search : '';
  const roleFilter = typeof resolvedParams.role === 'string' ? resolvedParams.role : '';

  // 1. Build the database query (where clause)
  const where: Prisma.UserWhereInput = {};

  if (roleFilter) {
    where.role = roleFilter as Role;
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      // Search inside the nested relation natively!
      { staffProfile: { employeeId: { contains: search, mode: 'insensitive' } } }
    ];
  }

  // 2. Fetch paginated and filtered data natively from the Database
  const response = await userService.findAllPaginated(session as any, { 
    page, 
    limit, 
    where 
  } as any);

  return (
    <UserManagement 
      initialUsers={response.data as any} 
      totalPages={response.meta.totalPages}
      currentPage={page}
      userRole={session.user.role}
    />
  );
}