import { NextRequest } from 'next/server';
import { ZodError } from 'zod';
import { crewProfileService } from '@/services/crew-profile.services';
import { getServerSession } from '@/services/auth.services';
import {
  successResponse,
  errorResponse,
  validationErrorResponse,
  zodFieldErrors,
} from '@/lib/utils/api-response';
import { enforceApiRateLimit } from '@/lib/utils/rate-limit';

function unauthorized() {
  return errorResponse('Unauthorized', 401);
}

function tooManyRequests(retryAfterMs: number) {
  return errorResponse(`Too many requests. Retry in ${Math.ceil(retryAfterMs / 1000)}s`, 429);
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const session = await getServerSession();
    if (!session?.user) return unauthorized();

    const limited = enforceApiRateLimit({
      headers: req.headers,
      namespace: 'api:v1:crew-profiles:user',
      userId: session.user.id,
      action: 'read',
    });
    if (!limited.ok) return tooManyRequests(limited.retryAfterMs);

    const { userId } = await params;

    const result = await crewProfileService.findByUserId(userId, {
      user: { id: session.user.id, role: session.user.role },
    });

    return successResponse(result);
  } catch (err) {
    if (err instanceof Error && err.name === 'CrewProfileNotFoundError') {
      return errorResponse(err.message, 404);
    }
    if (err instanceof Error && err.name === 'UnauthorizedError') {
      return unauthorized();
    }
    console.error('[GET /api/v1/crew-profiles/[userId]]', err);
    return errorResponse('Internal server error');
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const session = await getServerSession();
    if (!session?.user) return unauthorized();

    const limited = enforceApiRateLimit({
      headers: req.headers,
      namespace: 'api:v1:crew-profiles:user',
      userId: session.user.id,
      action: 'write',
    });
    if (!limited.ok) return tooManyRequests(limited.retryAfterMs);

    const { userId } = await params;
    const body = await req.json();

    const result = await crewProfileService.patchByUserId(userId, body, {
      user: { id: session.user.id, role: session.user.role },
    });

    return successResponse(result);
  } catch (err) {
    if (err instanceof ZodError) {
      return validationErrorResponse(zodFieldErrors(err));
    }
    if (err instanceof Error && err.name === 'CrewProfileNotFoundError') {
      return errorResponse(err.message, 404);
    }
    if (err instanceof Error && err.name === 'UnauthorizedError') {
      return unauthorized();
    }
    console.error('[PATCH /api/v1/crew-profiles/[userId]]', err);
    return errorResponse('Internal server error');
  }
}
