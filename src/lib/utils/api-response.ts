import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function successResponse<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function errorResponse(message: string, status = 500) {
  return NextResponse.json({ error: message }, { status });
}

export function unauthorizedResponse() {
  return errorResponse("Unauthorized", 401);
}

export function tooManyRequestsResponse(retryAfterMs: number) {
  return errorResponse(
    `Too many requests. Retry in ${Math.ceil(retryAfterMs / 1000)}s`,
    429,
  );
}

export function notFoundResponse(resource = "Resource") {
  return errorResponse(`${resource} not found`, 404);
}

export function validationErrorResponse(errors: unknown) {
  return NextResponse.json(
    { error: "Validation failed", details: errors },
    { status: 400 },
  );
}

export function zodFieldErrors(err: ZodError<unknown>) {
  return err.issues.reduce<Record<string, string[]>>((acc, issue) => {
    const key = issue.path.length > 0 ? String(issue.path[0]) : "form";
    if (!acc[key]) acc[key] = [];
    acc[key].push(issue.message);
    return acc;
  }, {});
}
