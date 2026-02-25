"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { 
  Container, Paper, Stack, Title, Text, Group, 
  Button, Divider, Radio, Alert, Center, Loader, Box, Badge
} from "@mantine/core";
import { IconCreditCard, IconLock, IconAlertCircle, IconCheck, IconReceipt2 } from "@tabler/icons-react";
import { Navbar } from "@/components/Navbar";

// Import our Server Actions directly!
import { getBookingSummaryAction, processPaymentAction } from "./actions";

export default function PaymentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const bookingId = searchParams.get("bookingId");

  const [initializing, setInitializing] = useState(true);
  const [loading, setLoading] = useState(false);
  const [bookingData, setBookingData] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState("CREDIT_CARD");
  const [error, setError] = useState<string | null>(null);

  // Load the booking details when the page opens
  useEffect(() => {
    const fetchDetails = async () => {
      if (!bookingId) {
        setError("No booking ID provided.");
        setInitializing(false);
        return;
      }
      
      try {
        // Call the server action directly to bypass API routes
        const data = await getBookingSummaryAction(bookingId);
        setBookingData(data);
      } catch (err: any) {
        setError(err.message || "Could not retrieve booking information.");
      } finally {
        setInitializing(false);
      }
    };
    
    fetchDetails();
  }, [bookingId]);

  const handleConfirmPayment = async () => {
    if (!bookingId || !bookingData) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Process the payment using the server action
      await processPaymentAction(bookingId, paymentMethod, bookingData.totalPrice);

      // Redirect to confirmation page on success
      router.push(`/FlightSearch/Confirmation?bookingId=${bookingId}`);
    } catch (err: any) {
      setError(err.message || "Transaction declined. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (initializing) return <Center h="100vh"><Loader size="xl" /></Center>;

  return (
    <>
      <Navbar />
      <Container size="sm" py="xl">
        <Stack gap="xl">
          <Box>
            <Title order={2}>Finalize Your Booking</Title>
            <Text c="dimmed">Complete your payment to secure your seats.</Text>
          </Box>

          {/* Booking Summary Card */}
          <Paper withBorder p="lg" radius="md">
            <Group justify="space-between" mb="xs">
              <Text fw={700}>Booking Reference</Text>
              <Badge variant="outline" color="blue">
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

          {/* Payment Method Selection */}
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
              
              <Button variant="subtle" color="gray" onClick={() => router.back()}>
                Cancel & Return
              </Button>
            </Stack>
          </Paper>
        </Stack>
      </Container>
    </>
  );
}