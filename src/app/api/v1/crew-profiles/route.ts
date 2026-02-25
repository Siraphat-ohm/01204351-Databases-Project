import { NextRequest } from 'next/server';
import { ZodError } from 'zod';
import { crewProfileService } from '@/services/crew-profile.services';
import { getServerSession } from '@/services/auth.services';
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  tooManyRequestsResponse,
  validationErrorResponse,
  zodFieldErrors,
} from '@/lib/utils/api-response';
import { enforceApiRateLimit } from '@/lib/utils/rate-limit';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) return unauthorizedResponse();

    const limited = enforceApiRateLimit({
      headers: req.headers,
      namespace: 'api:v1:crew-profiles',
      userId: session.user.id,
      action: 'read',
    });
    if (!limited.ok) return tooManyRequestsResponse(limited.retryAfterMs);

    const page = Number(req.nextUrl.searchParams.get('page') ?? 1);
    const limit = Number(req.nextUrl.searchParams.get('limit') ?? 20);

    const result = await crewProfileService.findAllPaginated(
      { user: { id: session.user.id, role: session.user.role } },
      { page, limit },
    );

    return successResponse(result);
  } catch (err) {
    if (err instanceof Error && err.name === 'UnauthorizedError') {
      return unauthorizedResponse();
    }
    console.error('[GET /api/v1/crew-profiles]', err);
    return errorResponse('Internal server error');
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) return unauthorizedResponse();

    const limited = enforceApiRateLimit({
      headers: req.headers,
      namespace: 'api:v1:crew-profiles',
      userId: session.user.id,
      action: 'write',
    });
    if (!limited.ok) return tooManyRequestsResponse(limited.retryAfterMs);

    const body = await req.json();

    const created = await crewProfileService.create(body, {
      user: { id: session.user.id, role: session.user.role },
    });

    return successResponse(created, 201);
  } catch (err) {
    if (err instanceof ZodError) {
      return validationErrorResponse(zodFieldErrors(err));
    }
    if (err instanceof Error && err.name === 'UnauthorizedError') {
      return unauthorizedResponse();
    }
    if (err instanceof Error && err.name === 'CrewProfileConflictError') {
      return errorResponse(err.message, 409);
    }
    console.error('[POST /api/v1/crew-profiles]', err);
    return errorResponse('Internal server error');
  }
}
