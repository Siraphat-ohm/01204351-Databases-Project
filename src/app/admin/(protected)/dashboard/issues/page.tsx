import { IssueManagement } from "@/components/IssueManagement";
import { issueReportService } from "@/services/issue-report.services"; 
import { redirect } from "next/navigation";
import { getServerSession } from "@/services/auth.services";

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function IssuesPage({ searchParams }: PageProps) {
  const session = await getServerSession();
  
  if (!session || session.user.role !== 'ADMIN') {
    redirect('/admin/login');
  }

  const resolvedParams = await searchParams;
  const page = Number(resolvedParams.page) || 1;
  const limit = 15; // Set your pagination limit

  // Read URL Parameters for filtering
  const search = typeof resolvedParams.search === 'string' ? resolvedParams.search : '';
  const statusFilter = typeof resolvedParams.status === 'string' ? resolvedParams.status : '';

  // 1. Build the database query (where clause)
  const where: any = {};

  if (statusFilter) {
    where.status = statusFilter;
  }

  if (search) {
    where.OR = [
      { category: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
      // Optional: If you want to search by user email as well
      // { user: { email: { contains: search, mode: 'insensitive' } } }
    ];
  }

  // 2. Fetch paginated and filtered data natively from the Database
  const response = await issueReportService.findAllPaginated(session as any, {
    page,
    limit,
    where
  } as any);

  // 3. Sanitize and convert objects to plain JavaScript objects
  const sanitizedIssues = response.data.map((issue: any) => {
    // If you are using Mongoose, calling .toJSON() or .toObject() first is helpful
    const issueData = typeof issue.toJSON === 'function' ? issue.toJSON() : issue;

    return {
      // Convert MongoDB ObjectId to a standard string 'id' if necessary
      id: issueData._id?.toString() || issueData.id,
      category: issueData.category,
      description: issueData.description,
      status: issueData.status,
      attachments: issueData.attachments || [],
      createdAt: issueData.createdAt, 
      user: issueData.user ? {
        name: issueData.user.name || null,
        email: issueData.user.email,
      } : undefined,
      resolvedBy: issueData.resolvedBy?.toString() || null,
    };
  });

  // 4. Pass the sanitized data & pagination metadata to the Client Component
  return (
    <IssueManagement 
      initialIssues={sanitizedIssues} 
      totalPages={response.meta.totalPages}
      currentPage={page}
    />
  );
}