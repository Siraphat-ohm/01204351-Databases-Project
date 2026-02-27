import { NextRequest } from "next/server";
import { ZodError } from "zod";
import { NotFoundError, ConflictError, UnauthorizedError, BadRequestError } from '@/lib/errors';
import { ticketService } from "@/services/ticket.services";
import { getServerSession } from "@/services/auth.services";
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  tooManyRequestsResponse,
  validationErrorResponse,
  zodFieldErrors,
} from "@/lib/utils/api-response";
import { enforceApiRateLimit } from "@/lib/utils/rate-limit";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession();
    if (!session?.user) return unauthorizedResponse();

    const limited = enforceApiRateLimit({
      headers: req.headers,
      namespace: "api:v1:tickets:id",
      userId: session.user.id,
      action: "read",
    });
    if (!limited.ok) return tooManyRequestsResponse(limited.retryAfterMs);

    const { id } = await params;
    const row = await ticketService.findById(id, {
      user: { id: session.user.id, role: session.user.role },
    });

    return successResponse(row);
  } catch (err) {
    if (err instanceof NotFoundError) return errorResponse(err.message, 404);
    if (err instanceof UnauthorizedError) return unauthorizedResponse();
    console.error('[GET /api/v1/tickets/[id]]', err);
    return errorResponse('Internal server error');
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession();
    if (!session?.user) return unauthorizedResponse();

    const limited = enforceApiRateLimit({
      headers: req.headers,
      namespace: "api:v1:tickets:id",
      userId: session.user.id,
      action: "write",
    });
    if (!limited.ok) return tooManyRequestsResponse(limited.retryAfterMs);

    const { id } = await params;
    const body = await req.json();

    const row = await ticketService.updateTicket(id, body, {
      user: { id: session.user.id, role: session.user.role },
    });

    return successResponse(row);
  } catch (err) {
    if (err instanceof ZodError) return validationErrorResponse(zodFieldErrors(err));
    if (err instanceof NotFoundError) return errorResponse(err.message, 404);
    if (err instanceof UnauthorizedError) return unauthorizedResponse();
    if (err instanceof ConflictError) return errorResponse(err.message, 409);
    console.error('[PATCH /api/v1/tickets/[id]]', err);
    return errorResponse('Internal server error');
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession();
    if (!session?.user) return unauthorizedResponse();

    const limited = enforceApiRateLimit({
      headers: req.headers,
      namespace: "api:v1:tickets:id",
      userId: session.user.id,
      action: "write",
    });
    if (!limited.ok) return tooManyRequestsResponse(limited.retryAfterMs);

    const { id } = await params;
    const row = await ticketService.deleteTicket(id, {
      user: { id: session.user.id, role: session.user.role },
    });

    return successResponse(row);
  } catch (err) {
    if (err instanceof NotFoundError) return errorResponse(err.message, 404);
    if (err instanceof UnauthorizedError) return unauthorizedResponse();
    console.error('[DELETE /api/v1/tickets/[id]]', err);
    return errorResponse('Internal server error');
  }
}
