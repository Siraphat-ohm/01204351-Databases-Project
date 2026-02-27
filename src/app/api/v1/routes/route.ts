import { NextRequest } from 'next/server';
import { ZodError } from 'zod';
import { NotFoundError, ConflictError, UnauthorizedError } from '@/lib/errors';
import { routeService } from '@/services/route.services';
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

function resolvePageLimit(req: NextRequest) {
  const pageParam = req.nextUrl.searchParams.get('page');
  const limitParam = req.nextUrl.searchParams.get('limit');
  const skipParam = req.nextUrl.searchParams.get('skip');
  const takeParam = req.nextUrl.searchParams.get('take');

  if (skipParam !== null || takeParam !== null) {
    const skip = Number(skipParam ?? 0);
    const take = Number(takeParam ?? 20);
    const limit = take > 0 ? take : 20;
    const page = Math.floor((skip > 0 ? skip : 0) / limit) + 1;
    return { page, limit };
  }

  return {
    page: Number(pageParam ?? 1),
    limit: Number(limitParam ?? 20),
  };
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) return unauthorizedResponse();

    const limited = enforceApiRateLimit({
      headers: req.headers,
      namespace: 'api:v1:routes',
      userId: session.user.id,
      action: 'read',
    });
    if (!limited.ok) return tooManyRequestsResponse(limited.retryAfterMs);

    const search = req.nextUrl.searchParams.get('search') ?? '';
    const { page, limit } = resolvePageLimit(req);
    const serviceSession = { user: { id: session.user.id, role: session.user.role } };

    const result = await routeService.searchPaginated(search, serviceSession, { page, limit });
    return successResponse(result);
  } catch (err) {
    if (err instanceof UnauthorizedError) return unauthorizedResponse();
    console.error('[GET /api/v1/routes]', err);
    return errorResponse('Internal server error');
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) return unauthorizedResponse();

    const limited = enforceApiRateLimit({
      headers: req.headers,
      namespace: 'api:v1:routes',
      userId: session.user.id,
      action: 'write',
    });
    if (!limited.ok) return tooManyRequestsResponse(limited.retryAfterMs);

    const body = await req.json();
    const created = await routeService.createRoute(body, {
      user: { id: session.user.id, role: session.user.role },
    });

    return successResponse(created, 201);
  } catch (err) {
    if (err instanceof ZodError) return validationErrorResponse(zodFieldErrors(err));
    if (err instanceof UnauthorizedError) return unauthorizedResponse();
    if (err instanceof ConflictError) return errorResponse(err.message, 409);
    console.error('[POST /api/v1/routes]', err);
    return errorResponse('Internal server error');
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) return unauthorizedResponse();

    const limited = enforceApiRateLimit({
      headers: req.headers,
      namespace: 'api:v1:routes',
      userId: session.user.id,
      action: 'write',
    });
    if (!limited.ok) return tooManyRequestsResponse(limited.retryAfterMs);

    const body = await req.json();
    const id = typeof body?.id === 'string' ? body.id : '';
    if (!id) return errorResponse('id is required', 400);

    const { id: _id, ...payload } = body as Record<string, unknown>;
    const updated = await routeService.updateRoute(id, payload, {
      user: { id: session.user.id, role: session.user.role },
    });

    return successResponse(updated);
  } catch (err) {
    if (err instanceof ZodError) return validationErrorResponse(zodFieldErrors(err));
    if (err instanceof UnauthorizedError) return unauthorizedResponse();
    if (err instanceof NotFoundError) return errorResponse(err.message, 404);
    console.error('[PATCH /api/v1/routes]', err);
    return errorResponse('Internal server error');
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) return unauthorizedResponse();

    const limited = enforceApiRateLimit({
      headers: req.headers,
      namespace: 'api:v1:routes',
      userId: session.user.id,
      action: 'write',
    });
    if (!limited.ok) return tooManyRequestsResponse(limited.retryAfterMs);

    let id = req.nextUrl.searchParams.get('id');

    if (!id && req.headers.get('content-type')?.includes('application/json')) {
      const body = await req.json();
      id = typeof body?.id === 'string' ? body.id : null;
    }

    if (!id) return errorResponse('id is required', 400);

    const deleted = await routeService.deleteRoute(id, {
      user: { id: session.user.id, role: session.user.role },
    });

    return successResponse(deleted);
  } catch (err) {
    if (err instanceof UnauthorizedError) return unauthorizedResponse();
    if (err instanceof NotFoundError) return errorResponse(err.message, 404);
    if (err instanceof ConflictError) return errorResponse(err.message, 409);
    console.error('[DELETE /api/v1/routes]', err);
    return errorResponse('Internal server error');
  }
}