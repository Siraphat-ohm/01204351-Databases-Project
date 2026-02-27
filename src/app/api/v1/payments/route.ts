// src/app/api/v1/payments/route.ts
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

// ... (Keep your existing GET function here) ...

export async function POST(req: NextRequest) {
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

    // --- NEW: Handle Stripe Checkout redirect generation ---
    if (body.action === "create-checkout") {
      // Get the origin dynamically so Stripe knows where to redirect back to
      const origin = req.headers.get("origin") || "http://localhost:3000";

      const sessionData = await paymentService.createCheckoutSession(
        body.bookingId,
        origin,
        serviceSession,
      );

      // Returns { url: "https://checkout.stripe.com/..." }
      return successResponse(sessionData, 201);
    }

    // --- FALLBACK: Standard manual payment creation ---
    const created = await paymentService.createPayment(body, serviceSession);
    return successResponse(created, 201);
  } catch (err) {
    if (err instanceof ZodError) {
      return validationErrorResponse(zodFieldErrors(err));
    }
    if (err instanceof Error && err.name === "UnauthorizedError") {
      return unauthorizedResponse();
    }
    if (err instanceof Error && err.name === "BookingNotFoundError") {
      return errorResponse(err.message, 404);
    }
    if (err instanceof Error && err.name === "PaymentConflictError") {
      return errorResponse(err.message, 409);
    }
    console.error("[POST /api/v1/payments]", err);
    return errorResponse("Internal server error");
  }
}
