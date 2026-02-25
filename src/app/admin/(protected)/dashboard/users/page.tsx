import { UserManagement } from "@/components/UserManagement";
import { userService } from "@/services/user.services";
import { getServerSession } from '@/services/auth.services'; // Adjust path to your session getter
import { redirect } from "next/navigation";

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function UsersPage({ searchParams }: PageProps) {
  const session = await getServerSession();
  
  if (!session || session.user.role !== 'ADMIN') {
    redirect('/admin/login'); // Or handle unauthorized access
  }

  // 1. Await search params
  const resolvedParams = await searchParams;
  const page = Number(resolvedParams.page) || 1;
  const limit = Number(resolvedParams.limit) || 10;

  // 2. Fetch data from real service
  const response = await userService.findAllPaginated(session, { page, limit });

  // 3. Pass data and pagination meta to the client component
  return (
    <UserManagement 
      initialUsers={response.data} 
      totalPages={response.meta.totalPages}
      currentPage={response.meta.page}
    />
  );
}