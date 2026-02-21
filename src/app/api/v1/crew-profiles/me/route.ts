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

function unauthorized() {
  return errorResponse('Unauthorized', 401);
}

export async function GET() {
  try {
    const session = await getServerSession();
    if (!session?.user) return unauthorized();

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
    if (!session?.user) return unauthorized();

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
