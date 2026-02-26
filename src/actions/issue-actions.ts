'use server'

import { issueReportService } from '@/services/issue-report.services'; // Adjust path
import { getServerSession } from '@/services/auth.services';
import { revalidatePath } from 'next/cache';
import { UpdateIssueReportStatusInput } from '@/types/issue-report.type'; // Adjust path

export async function updateIssueStatusAction(id: string, input: UpdateIssueReportStatusInput) {
  const session = await getServerSession();
  
  if (!session) {
    return { error: 'Unauthorized' };
  }

  try {
    await issueReportService.updateStatus(id, input, session);
    revalidatePath('/dashboard/issues');
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}