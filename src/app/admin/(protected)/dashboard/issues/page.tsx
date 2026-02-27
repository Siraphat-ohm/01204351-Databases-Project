import { IssueManagement } from "@/components/IssueManagement";
import { issueReportService } from "@/services/issue-report.services"; // Adjust path
import { redirect } from "next/navigation";
import { getServerSession } from "@/services/auth.services";

export default async function IssuesPage() {
  const session = await getServerSession();
  
  if (!session || session.user.role !== 'ADMIN') {
    redirect('/login');
  }

  // 1. Fetch raw data from the database
  const rawIssues = await issueReportService.findAll(session);

  // 2. Sanitize and convert MongoDB objects to plain JavaScript objects
  const sanitizedIssues = rawIssues.map((issue: any) => {
    // If you are using Mongoose, calling .toJSON() or .toObject() first is helpful
    const issueData = typeof issue.toJSON === 'function' ? issue.toJSON() : issue;

    return {
      // Convert MongoDB ObjectId to a standard string 'id'
      id: issueData._id?.toString() || issueData.id,
      category: issueData.category,
      description: issueData.description,
      status: issueData.status,
      attachments: issueData.attachments || [],
      // Next.js 14+ can pass Date objects, but if you get an error here too, use issueData.createdAt.toISOString()
      createdAt: issueData.createdAt, 
      user: issueData.user ? {
        name: issueData.user.name || null,
        email: issueData.user.email,
      } : undefined,
      resolvedBy: issueData.resolvedBy?.toString() || null,
    };
  });

  // 3. Pass the sanitized data to the Client Component
  return (
    <IssueManagement initialIssues={sanitizedIssues} />
  );
}