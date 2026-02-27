import { NextRequest, NextResponse } from "next/server";
import { paymentService } from "@/services/payment.services";
import type { ServiceSession } from "@/services/_shared/session";
import { stripe } from "@/lib/stripe";
import type Stripe from "stripe";

export const runtime = "nodejs";


const systemSession: ServiceSession = {
  user: { id: "system", role: "SYSTEM" },
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
    console.error("Invalid webhook signature:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      // ✅ Checkout finished
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        const transactionId =
          session.metadata?.transactionId ?? session.client_reference_id;

        if (!transactionId) break;

        await paymentService.markPaymentSuccess(
          transactionId,
          {
            stripeChargeId:
              typeof session.payment_intent === "string"
                ? session.payment_intent
                : undefined,
          },
          systemSession,
        );

        break;
      }

      // ✅ PaymentIntent success (extra safety)
      case "payment_intent.succeeded": {
        const intent = event.data.object as Stripe.PaymentIntent;

        const transactionId = intent.metadata?.transactionId;
        if (!transactionId) break;

        await paymentService.markPaymentSuccess(
          transactionId,
          {
            stripeChargeId: intent.id,
          },
          systemSession,
        );

        break;
      }

      // ❌ Payment failed
      case "payment_intent.payment_failed": {
        const intent = event.data.object as Stripe.PaymentIntent;

        const transactionId = intent.metadata?.transactionId;
        if (!transactionId) break;

        await paymentService.markPaymentFailed(
          transactionId,
          {
            failureCode: intent.last_payment_error?.code,
            failureMessage: intent.last_payment_error?.message,
          },
          systemSession,
        );

        break;
      }

      default:
        console.log("Unhandled event:", event.type);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook handler error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 },
    );
  }
}
