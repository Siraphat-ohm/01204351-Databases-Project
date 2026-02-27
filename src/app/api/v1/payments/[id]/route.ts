import { NextRequest } from "next/server";
import { ZodError } from "zod";
import { paymentService } from "@/services/payment.services";
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

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession();
    if (!session?.user) return unauthorizedResponse();

    const limited = enforceApiRateLimit({
      headers: req.headers,
      namespace: "api:v1:payments",
      userId: session.user.id,
      action: "write",
    });
    if (!limited.ok) return tooManyRequestsResponse(limited.retryAfterMs);

    const body = await req.json();
    const serviceSession = {
      user: { id: session.user.id, role: session.user.role },
    };
    const transactionId = params.id;

    // Route the action based on your Action Contract
    switch (body.action) {
      case "mark-success": {
        const result = await paymentService.markPaymentSuccess(
          transactionId,
          { stripeChargeId: body.stripeChargeId },
          serviceSession,
        );
        return successResponse(result);
      }

      case "mark-failed": {
        const result = await paymentService.markPaymentFailed(
          transactionId,
          {
            failureCode: body.failureCode,
            failureMessage: body.failureMessage,
          },
          serviceSession,
        );
        return successResponse(result);
      }

      case "refund": {
        const result = await paymentService.refundPayment(
          transactionId,
          { amount: body.amount, reason: body.reason },
          serviceSession,
        );
        return successResponse(result);
      }

      default:
        return errorResponse("Invalid or missing action", 400);
    }
  } catch (err) {
    // Catch validation and domain-specific errors matching your existing patterns
    if (err instanceof ZodError) {
      return validationErrorResponse(zodFieldErrors(err));
    }
    if (err instanceof Error && err.name === "UnauthorizedError") {
      return unauthorizedResponse();
    }
    if (err instanceof Error && err.name === "PaymentNotFoundError") {
      return errorResponse(err.message, 404);
    }
    if (err instanceof Error && err.name === "PaymentConflictError") {
      return errorResponse(err.message, 409);
    }
    console.error(`[PATCH /api/v1/payments/${params.id}]`, err);
    return errorResponse("Internal server error");
  }
}

// You can optionally include GET or DELETE for individual payments in this same file
// export async function GET(req: NextRequest, { params }: { params: { id: string } }) { ... }
