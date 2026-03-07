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

async function resolvePaymentDetailsFromIntentId(paymentIntentId: string) {
  const intent = await stripe.paymentIntents.retrieve(paymentIntentId, {
    expand: ["latest_charge", "payment_method"],
  });

  const stripeChargeId =
    typeof intent.latest_charge === "string"
      ? intent.latest_charge
      : intent.latest_charge?.id;

  let paymentMethodType: string | undefined;
  let paymentMethodRef: string | undefined;

  if (typeof intent.payment_method !== "string" && intent.payment_method) {
    paymentMethodType = intent.payment_method.type;

    if (intent.payment_method.type === "card") {
      paymentMethodRef = intent.payment_method.card?.last4
        ? `**** ${intent.payment_method.card.last4}`
        : undefined;
    } else if (intent.payment_method.type === "promptpay") {
      paymentMethodRef = intent.payment_method.id ?? "PromptPay";
    }
  } else if (typeof intent.payment_method === "string") {
    // Keep provider payment method id as a stable reference when object isn't expanded
    paymentMethodRef = intent.payment_method;
  }

  if (!paymentMethodType && typeof intent.latest_charge !== "string" && intent.latest_charge?.payment_method_details) {
    const pmd = intent.latest_charge.payment_method_details;
    paymentMethodType = pmd.type;

    if (pmd.card?.last4) {
      paymentMethodRef = `**** ${pmd.card.last4}`;
    } else if (pmd.promptpay) {
      paymentMethodRef = paymentMethodRef ?? "PromptPay";
    }
  }

  return {
    stripePaymentIntentId: intent.id,
    stripeChargeId,
    paymentMethodType,
    paymentMethodRef,
  };
}

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
      // PRIMARY: Fires when checkout completes for all payment methods
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        
        const rawIds = session.metadata?.transactionIds;
        if (!rawIds) {
          console.warn("[Webhook] No transactionIds in checkout.session.completed:", session.id);
          break;
        }

        const transactionIds = rawIds.split(',').filter(Boolean);

        // CRITICAL: Only mark success if payment_status is "paid"
        // For async methods (PromptPay), payment_status will be "unpaid" here
        if (session.payment_status === "paid") {
          const paymentIntentId = typeof session.payment_intent === "string"
            ? session.payment_intent
            : (session.payment_intent as Stripe.PaymentIntent | null)?.id;

          if (!paymentIntentId) {
            console.warn("[Webhook] checkout.session.completed has no payment_intent:", session.id);
            break;
          }

          let details: {
            stripePaymentIntentId: string;
            stripeChargeId?: string;
            paymentMethodType?: string;
            paymentMethodRef?: string;
          };

          try {
            details = await resolvePaymentDetailsFromIntentId(paymentIntentId);
          } catch (e) {
            console.error("[Webhook] Failed to retrieve payment details:", e);
            details = {
              stripePaymentIntentId: paymentIntentId,
              stripeChargeId: paymentIntentId,
            };
          }

          await Promise.all(
            transactionIds.map(id => 
              paymentService.markPaymentSuccess(id, {
                stripePaymentIntentId: details.stripePaymentIntentId,
                stripeChargeId: details.stripeChargeId,
                paymentMethodType: details.paymentMethodType,
                paymentMethodRef: details.paymentMethodRef,
              }, systemSession)
            )
          );
        } else {
          console.log(`[Webhook] Session ${session.id} completed but payment_status=${session.payment_status}, waiting for async confirmation`);
        }

        break;
      }

      // Fires when async payment (PromptPay) succeeds after checkout.session.completed
      case "checkout.session.async_payment_succeeded": {
        const session = event.data.object as Stripe.Checkout.Session;

        const rawIds = session.metadata?.transactionIds;
        if (!rawIds) {
          console.warn("[Webhook] No transactionIds in async_payment_succeeded:", session.id);
          break;
        }

        const transactionIds = rawIds.split(',').filter(Boolean);
        const paymentIntentId = typeof session.payment_intent === "string"
          ? session.payment_intent
          : (session.payment_intent as Stripe.PaymentIntent | null)?.id;

        if (!paymentIntentId) {
          console.warn("[Webhook] async_payment_succeeded has no payment_intent:", session.id);
          break;
        }

        let details: {
          stripePaymentIntentId: string;
          stripeChargeId?: string;
          paymentMethodType?: string;
          paymentMethodRef?: string;
        };

        try {
          details = await resolvePaymentDetailsFromIntentId(paymentIntentId);
        } catch (e) {
          console.error("[Webhook] Failed to retrieve payment details:", e);
          details = {
            stripePaymentIntentId: paymentIntentId,
            stripeChargeId: paymentIntentId,
            paymentMethodType: "promptpay",
            paymentMethodRef: "PromptPay",
          };
        }

        await Promise.all(
          transactionIds.map(id => 
            paymentService.markPaymentSuccess(id, {
              stripePaymentIntentId: details.stripePaymentIntentId,
              stripeChargeId: details.stripeChargeId,
              paymentMethodType: details.paymentMethodType,
              paymentMethodRef: details.paymentMethodRef,
            }, systemSession)
          )
        );

        break;
      }

      // Fires when async payment (PromptPay) fails
      case "checkout.session.async_payment_failed": {
        const session = event.data.object as Stripe.Checkout.Session;

        const rawIds = session.metadata?.transactionIds;
        if (!rawIds) break;

        const transactionIds = rawIds.split(',').filter(Boolean);

        await Promise.all(
          transactionIds.map(id => 
            paymentService.markPaymentFailed(
              id,
              { failureMessage: "Async payment failed" },
              systemSession
            )
          )
        );

        break;
      }

      // FALLBACK: payment_intent.succeeded (may arrive independently)
      case "payment_intent.succeeded": {
        const intent = event.data.object as Stripe.PaymentIntent;

        const rawIds = intent.metadata?.transactionIds || intent.metadata?.transactionId;
        
        if (!rawIds) {
          console.warn("[Webhook] No transaction IDs in payment_intent.succeeded:", intent.id);
          break;
        }

        const transactionIds = rawIds.split(',').filter(Boolean);

        let details: {
          stripePaymentIntentId: string;
          stripeChargeId?: string;
          paymentMethodType?: string;
          paymentMethodRef?: string;
        };

        try {
          details = await resolvePaymentDetailsFromIntentId(intent.id);
        } catch (e) {
          console.error("[Webhook] Failed to retrieve payment details:", e);
          details = {
            stripePaymentIntentId: intent.id,
            stripeChargeId:
              typeof intent.latest_charge === "string"
                ? intent.latest_charge
                : (intent.latest_charge as Stripe.Charge | null)?.id,
          };
        }

        await Promise.all(
          transactionIds.map(id => 
            paymentService.markPaymentSuccess(
              id,
              {
                stripePaymentIntentId: details.stripePaymentIntentId,
                stripeChargeId: details.stripeChargeId,
                paymentMethodType: details.paymentMethodType,
                paymentMethodRef: details.paymentMethodRef,
              },
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
    console.error("[Stripe Webhook] Error processing event:", event.type, error);
    return NextResponse.json(
      { error: "Webhook processing failed", details: error.message },
      { status: 500 },
    );
  }
}