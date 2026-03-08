'use server'

import { issueReportService } from '@/services/issue-report.services'; // Adjust path
import { flightOpsLogService } from '@/services/flight-ops-log.services';
import { getServerSession } from '@/services/auth.services';
import { revalidatePath } from 'next/cache';
import { CreateIssueReportInput, UpdateIssueReportStatusInput } from '@/types/issue-report.type'; // Adjust path

export async function createIssueReportAction(input: CreateIssueReportInput & { flightId?: string }) {
  const session = await getServerSession();

  if (!session) {
    return { error: 'Unauthorized' };
  }

  try {
    // 1. Create the base Issue Report
    await issueReportService.createMine(input, session as any);

    // 2. If it's a flight report with a flightId, also log it in Flight Ops
    if (input.category === 'flight' && input.flightId) {
      await flightOpsLogService.upsertByFlightId(input.flightId, {
        captainName: session.user.name || 'Staff',
        incidents: [input.description],
        gateChanges: [],
      }, session as any);
      revalidatePath('/admin/dashboard/ops-log');
    }

    revalidatePath('/admin/dashboard/issues');
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}
export async function updateIssueStatusAction(id: string, input: UpdateIssueReportStatusInput) {
  const session = await getServerSession();
  if (!session) {
    return { error: 'Unauthorized' };
  }

  try {
    await issueReportService.updateStatus(id, input, session);
    revalidatePath('/admin/dashboard/issues');
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}