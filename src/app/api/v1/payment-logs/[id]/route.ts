import { NextRequest } from 'next/server';
import { ZodError } from 'zod';
import { paymentLogService } from '@/services/payment-log.services';
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

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession();
    if (!session?.user) return unauthorized();

    const { id } = await params;
    const row = await paymentLogService.findById(id, {
      user: { id: session.user.id, role: session.user.role },
    });

    return successResponse(row);
  } catch (err) {
    if (err instanceof Error && err.name === 'PaymentLogNotFoundError') {
      return errorResponse(err.message, 404);
    }
    if (err instanceof Error && err.name === 'UnauthorizedError') {
      return unauthorized();
    }
    if (err instanceof Error && err.name === 'BookingNotFoundError') {
      return errorResponse(err.message, 404);
    }
    console.error('[GET /api/v1/payment-logs/[id]]', err);
    return errorResponse('Internal server error');
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession();
    if (!session?.user) return unauthorized();

    const { id } = await params;
    const body = await req.json();

    const row = await paymentLogService.updateById(id, body, {
      user: { id: session.user.id, role: session.user.role },
    });

    return successResponse(row);
  } catch (err) {
    if (err instanceof ZodError) {
      return validationErrorResponse(zodFieldErrors(err));
    }
    if (err instanceof Error && err.name === 'PaymentLogNotFoundError') {
      return errorResponse(err.message, 404);
    }
    if (err instanceof Error && err.name === 'UnauthorizedError') {
      return unauthorized();
    }
    console.error('[PATCH /api/v1/payment-logs/[id]]', err);
    return errorResponse('Internal server error');
  }
}
