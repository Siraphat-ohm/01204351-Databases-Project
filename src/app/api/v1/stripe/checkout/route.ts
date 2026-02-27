import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

export async function POST(req: Request) {
  try {
    const { transactionId } = await req.json();

    if (!transactionId) {
      return NextResponse.json(
        { error: "transactionId is required" },
        { status: 400 },
      );
    }

    // 🔎 ดึง transaction จาก DB
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
      include: {
        booking: true,
      },
    });

    if (!transaction) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 },
      );
    }

    if (transaction.status !== "PENDING") {
      return NextResponse.json(
        { error: "Transaction already processed" },
        { status: 400 },
      );
    }

    // 💳 สร้าง Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],

      line_items: [
        {
          price_data: {
            currency: transaction.currency.toLowerCase(),
            product_data: {
              name: `Flight Booking ${transaction.booking.bookingRef}`,
            },
            unit_amount: Math.round(Number(transaction.amount) * 100),
          },
          quantity: 1,
        },
      ],

      metadata: {
        transactionId: transaction.id, // 👈 webhook ใช้ตัวนี้
      },

      client_reference_id: transaction.id,

      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/success`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/payment/${transaction.booking.id}`,
    });

    // 🔐 เก็บ stripe session id (optional แต่แนะนำ)
    await prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        stripeSessionId: session.id,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
