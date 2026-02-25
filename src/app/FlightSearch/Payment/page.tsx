"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { 
  Container, Paper, Stack, Title, Text, Group, 
  Button, Divider, Radio, Alert, Center, Loader, Box, Badge
} from "@mantine/core";
import { IconCreditCard, IconLock, IconAlertCircle, IconCheck, IconReceipt2 } from "@tabler/icons-react";
import { Navbar } from "@/components/Navbar";
import { useAuthSession } from "@/services/auth-client.service"; // Using your exact auth client

export default function PaymentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const bookingId = searchParams.get("bookingId");

  const { data: session, isPending } = useAuthSession(); // Ensure session is loaded

  const [initializing, setInitializing] = useState(true);
  const [loading, setLoading] = useState(false);
  const [bookingData, setBookingData] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState("CREDIT_CARD");
  const [error, setError] = useState<string | null>(null);

  // 1. Fetch Booking Details on Load
  useEffect(() => {
    const fetchDetails = async () => {
      if (!bookingId) {
        setError("No booking ID provided.");
        setInitializing(false);
        return;
      }

      try {
        // Fetch the booking to get the total amount
        const res = await fetch(`/api/v1/bookings/${bookingId}`);
        const result = await res.json();

        if (!res.ok) {
          throw new Error(result.error?.message || result.message || "Could not find booking");
        }
        
        // Handle your API's successResponse wrapper
        setBookingData(result.data || result);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setInitializing(false);
      }
    };

    // Wait until auth is resolved before fetching
    if (!isPending) {
      fetchDetails();
    }
  }, [bookingId, isPending]);

  // 2. Handle the Payment Process (Matches your API exactly)
  const handleConfirmPayment = async () => {
    if (!bookingId || !bookingData) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // STEP A: Create Payment (Calls your exact POST /api/v1/payments)
      const createRes = await fetch(`/api/v1/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: bookingId,
          amount: bookingData.totalPrice,
          currency: "THB",
          method: paymentMethod
        })
      });
      
      const createdResult = await createRes.json();
      
      if (!createRes.ok) {
        throw new Error(createdResult.error?.message || createdResult.message || "Failed to initialize payment.");
      }
      
      // Extract the newly created payment ID from the successResponse
      const paymentId = createdResult.data?.id || createdResult.id;

      // STEP B: Confirm Payment (Calls your exact PATCH /api/v1/payments/[id])
      const patchRes = await fetch(`/api/v1/payments/${paymentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "mark-success", // Required by your PATCH route exactly
          paidAt: new Date().toISOString(),
          transactionId: `TXN-${Math.random().toString(36).slice(2, 10).toUpperCase()}`
        })
      });

      const patchResult = await patchRes.json();
      
      if (!patchRes.ok) {
        throw new Error(patchResult.error?.message || patchResult.message || "Payment processing failed.");
      }

      // Success! Redirect to confirmation
      router.push(`/FlightSearch/Confirmation?bookingId=${bookingId}`);

    } catch (err: any) {
      console.error("Payment Flow Error:", err);
      setError(err.message || "Transaction declined. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (isPending || initializing) {
    return (
      <Center h="100vh" flex={1}>
        <Stack align="center">
          <Loader size="xl" />
          <Text c="dimmed">Preparing secure payment gateway...</Text>
        </Stack>
      </Center>
    );
  }

  // Security fallback if somehow unauthenticated
  if (!session?.user) {
    return (
      <Center h="100vh">
        <Alert color="red" title="Unauthorized">
          You must be logged in to view this payment page.
        </Alert>
      </Center>
    );
  }

  return (
    <>
      <Navbar />
      <Container size="sm" py="xl">
        <Stack gap="xl">
          <Box>
            <Title order={2}>Finalize Your Booking</Title>
            <Text c="dimmed">Complete your payment to secure your seats.</Text>
          </Box>

          <Paper withBorder p="lg" radius="md">
            <Group justify="space-between" mb="xs">
              <Text fw={700}>Booking Reference</Text>
              <Badge variant="outline" color="blue" size="lg">
                {bookingData?.bookingRef || "PENDING"}
              </Badge>
            </Group>
            <Divider my="sm" />
            <Group justify="space-between">
              <Text size="xl" fw={900}>Total Amount</Text>
              <Text size="xl" fw={900} c="blue.9">
                THB {bookingData?.totalPrice?.toLocaleString() || "0"}
              </Text>
            </Group>
          </Paper>

          <Paper withBorder p="xl" radius="md" shadow="sm">
            <Stack gap="md">
              <Group gap="xs">
                <IconReceipt2 size={20} />
                <Text fw={700} size="lg">Payment Method</Text>
              </Group>
              
              <Radio.Group value={paymentMethod} onChange={setPaymentMethod}>
                <Stack gap="sm">
                  <Paper withBorder p="md" radius="sm" component="label" style={{ cursor: 'pointer' }}>
                    <Group justify="space-between">
                      <Radio value="CREDIT_CARD" label="Credit / Debit Card" />
                      <IconCreditCard size={20} color="gray" />
                    </Group>
                  </Paper>
                  <Paper withBorder p="md" radius="sm" component="label" style={{ cursor: 'pointer' }}>
                    <Radio value="PROMPTPAY" label="PromptPay QR" />
                  </Paper>
                </Stack>
              </Radio.Group>

              <Alert color="blue" icon={<IconLock size={18} />} variant="light">
                Secure 256-bit SSL Encrypted Payment
              </Alert>

              {error && (
                <Alert color="red" icon={<IconAlertCircle size={18} />}>
                  {error}
                </Alert>
              )}

              <Button 
                fullWidth 
                size="lg" 
                color="green" 
                loading={loading}
                onClick={handleConfirmPayment}
                leftSection={<IconCheck size={20} />}
              >
                Confirm & Pay THB {bookingData?.totalPrice?.toLocaleString() || "0"}
              </Button>
              
              <Button variant="subtle" color="gray" onClick={() => router.back()} disabled={loading}>
                Cancel & Return
              </Button>
            </Stack>
          </Paper>
        </Stack>
      </Container>
    </>
  );
}