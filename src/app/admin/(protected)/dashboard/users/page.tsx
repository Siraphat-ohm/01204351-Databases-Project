import { UserManagement } from "@/components/UserManagement";
import { userService } from "@/services/user.services"; // Adjust path if needed
import { getServerSession } from '@/services/auth.services'; 
import { redirect } from "next/navigation";

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function UsersPage({ searchParams }: PageProps) {
  const session = await getServerSession();
  
  if (!session || session.user.role !== 'ADMIN') {
    redirect('/admin/login'); 
  }

  const resolvedParams = await searchParams;
  const page = Number(resolvedParams.page) || 1;
  const limit = 15; // Set pagination limit

  const search = typeof resolvedParams.search === 'string' ? resolvedParams.search.toLowerCase() : '';
  const roleFilter = typeof resolvedParams.role === 'string' ? resolvedParams.role : '';

  let finalData = [];
  let totalPages = 1;

  if (search || roleFilter) {
    // WORKAROUND: If filtering is applied, fetch all and filter on the server
    const allUsers = await userService.findAll(session as any);
    
    const filteredUsers = allUsers.filter((u: any) => {
      const matchesSearch = search === '' || 
        (u.name || '').toLowerCase().includes(search) ||
        u.email.toLowerCase().includes(search) ||
        (u.staffProfile?.employeeId || '').toLowerCase().includes(search);
      
      const matchesRole = roleFilter === '' || u.role === roleFilter;

      return matchesSearch && matchesRole;
    });

    const total = filteredUsers.length;
    totalPages = Math.ceil(total / limit) || 1;
    
    const skip = (page - 1) * limit;
    finalData = filteredUsers.slice(skip, skip + limit);

  } else {
    // No filters: Use the native paginated service
    const response = await userService.findAllPaginated(session as any, { page, limit });
    finalData = response.data;
    totalPages = response.meta.totalPages;
  }

  return (
    <UserManagement 
      initialUsers={finalData} 
      totalPages={totalPages}
      currentPage={page}
    />
  );
}