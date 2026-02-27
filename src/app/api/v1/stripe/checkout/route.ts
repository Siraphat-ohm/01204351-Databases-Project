import { NextRequest, NextResponse } from "next/server";
import { paymentService } from "@/services/payment.services";
import { getServerSession } from "@/services/auth.services";

export async function POST(req: NextRequest) {
  const { bookingId } = await req.json();
  const session = await getServerSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const origin = req.headers.get("origin")!;

  const result = await paymentService.createCheckoutSession(
    bookingId,
    origin,
    session,
  );

  return NextResponse.json(result);
}
