import { NextRequest, NextResponse } from "next/server";
import { paymentService } from "@/services/payment.services";
import type { ServiceSession } from "@/services/_shared/session";
import { stripe } from "@/lib/stripe";
import type Stripe from "stripe";

export const runtime = "nodejs";

// Keep your system session
const systemSession: any = {
  user: { id: "system", role: "ADMIN" }, // Ensure role allows 'create' access
};

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch (err) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
    const session = event.data.object as Stripe.Checkout.Session;
    
    // Use the metadata we passed in the session
    const rawIds = session.metadata?.transactionIds;
    if (!rawIds) break;

    const transactionIds = rawIds.split(',').filter(Boolean);
    const stripeChargeId = session.payment_intent as string;

    await Promise.all(
      transactionIds.map(id => 
        paymentService.markPaymentSuccess(id, { stripeChargeId }, systemSession)
      )
    );
    break;
  }
      case "payment_intent.succeeded": {
        const intent = event.data.object as Stripe.PaymentIntent;

        // 1. Check for the NEW plural key 'transactionIds'
        // If it doesn't exist, fall back to the old singular 'transactionId'
        const rawIds = intent.metadata?.transactionIds || intent.metadata?.transactionId;
        
        if (!rawIds) {
          console.warn("No transaction IDs found in metadata for intent:", intent.id);
          break;
        }

        // 2. Split the string (e.g., "tx_1,tx_2") into an array
        const transactionIds = rawIds.split(',').filter(Boolean);

        const stripeChargeId = typeof intent.latest_charge === "string"
          ? intent.latest_charge
          : intent.latest_charge?.id;

        // 3. LOOP through every ID and mark them as success
        // This confirms every flight in a round-trip
        await Promise.all(
          transactionIds.map(id => 
            paymentService.markPaymentSuccess(
              id,
              { stripeChargeId },
              systemSession
            )
          )
        );

        break;
      }

      case "payment_intent.payment_failed": {
        const intent = event.data.object as Stripe.PaymentIntent;
        const rawIds = intent.metadata?.transactionIds || intent.metadata?.transactionId;
        
        if (!rawIds) break;

        const transactionIds = rawIds.split(',').filter(Boolean);

        await Promise.all(
          transactionIds.map(id => 
            paymentService.markPaymentFailed(
              id,
              {
                failureCode: intent.last_payment_error?.code,
                failureMessage: intent.last_payment_error?.message,
              },
              systemSession
            )
          )
        );

        break;
      }

      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error("Webhook Loop Error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed", details: error.message },
      { status: 500 },
    );
  }
}