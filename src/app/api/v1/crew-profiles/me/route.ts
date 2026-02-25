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
      namespace: 'api:v1:crew-profiles:me',
      userId: session.user.id,
      action: 'read',
    });
    if (!limited.ok) return tooManyRequestsResponse(limited.retryAfterMs);

    const result = await crewProfileService.findMyProfile({
      user: { id: session.user.id, role: session.user.role },
    });

    return successResponse(result);
  } catch (err) {
    if (err instanceof Error && err.name === 'CrewProfileNotFoundError') {
      return errorResponse(err.message, 404);
    }
    console.error('[GET /api/v1/crew-profiles/me]', err);
    return errorResponse('Internal server error');
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) return unauthorizedResponse();

    const limited = enforceApiRateLimit({
      headers: req.headers,
      namespace: 'api:v1:crew-profiles:me',
      userId: session.user.id,
      action: 'write',
    });
    if (!limited.ok) return tooManyRequestsResponse(limited.retryAfterMs);

    const body = await req.json();
    const result = await crewProfileService.upsertMyProfile(body, {
      user: { id: session.user.id, role: session.user.role },
    });

    return successResponse(result);
  } catch (err) {
    if (err instanceof ZodError) {
      return validationErrorResponse(zodFieldErrors(err));
    }
    console.error('[PUT /api/v1/crew-profiles/me]', err);
    return errorResponse('Internal server error');
  }
}
