import { NextRequest } from 'next/server';
import { ZodError } from 'zod';
import { issueReportService } from '@/services/issue-report.services';
import { getServerSession } from '@/services/auth.services';
import {
  successResponse,
  errorResponse,
  validationErrorResponse,
  zodFieldErrors,
} from '@/lib/utils/api-response';

function unauthorized() {
  return errorResponse('Unauthorized', 401);
}

export async function GET() {
  try {
    const session = await getServerSession();
    if (!session?.user) return unauthorized();

    const serviceSession = { user: { id: session.user.id, role: session.user.role } };

    if (session.user.role === 'ADMIN') {
      const rows = await issueReportService.findAll(serviceSession);
      return successResponse(rows);
    }

    const rows = await issueReportService.findMine(serviceSession);
    return successResponse(rows);
  } catch (err) {
    if (err instanceof Error && err.name === 'UnauthorizedError') {
      return unauthorized();
    }
    console.error('[GET /api/v1/issues]', err);
    return errorResponse('Internal server error');
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) return unauthorized();

    const body = await req.json();
    const created = await issueReportService.createMine(body, {
      user: { id: session.user.id, role: session.user.role },
    });

    return successResponse(created, 201);
  } catch (err) {
    if (err instanceof ZodError) {
      return validationErrorResponse(zodFieldErrors(err));
    }
    console.error('[POST /api/v1/issues]', err);
    return errorResponse('Internal server error');
  }
}
