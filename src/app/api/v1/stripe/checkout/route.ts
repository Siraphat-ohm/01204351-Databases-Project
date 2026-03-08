import { NextRequest, NextResponse } from "next/server";
import { paymentService } from "@/services/payment.services";
import { getServerSession } from "@/services/auth.services";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    // Support both formats: singular string or plural array
    const bookingIds = body.bookingIds || (body.bookingId ? [body.bookingId] : []);
    
    const session = await getServerSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!bookingIds || (Array.isArray(bookingIds) && bookingIds.length === 0)) {
      return NextResponse.json({ error: "No booking ID provided" }, { status: 400 });
    }

    const origin = req.headers.get("origin")!;

    const result = await paymentService.createCheckoutSession(
      bookingIds, // Now passing the array/string logic
      origin,
      session,
    );

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Stripe Checkout Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" }, 
      { status: error.status || 500 }
    );
  }
}