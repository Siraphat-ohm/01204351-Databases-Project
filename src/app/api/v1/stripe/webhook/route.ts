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
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "payment_intent.succeeded": {
        const intent = event.data.object as Stripe.PaymentIntent;

        const transactionId = intent.metadata?.transactionId;
        if (!transactionId) break;

        await paymentService.markPaymentSuccess(
          transactionId,
          {
            stripeChargeId:
              typeof intent.latest_charge === "string"
                ? intent.latest_charge
                : intent.latest_charge?.id,
          },
          systemSession,
        );

        break;
      }

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
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 },
    );
  }
}
