"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Container,
  Paper,
  Stack,
  Title,
  Text,
  Group,
  Button,
  Divider,
  Alert,
  Center,
  Loader,
  Box,
  Badge,
} from "@mantine/core";
import { IconLock, IconAlertCircle } from "@tabler/icons-react";
import { Navbar } from "@/components/Navbar";
import { useAuthSession } from "@/services/auth-client.service";

export default function PaymentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const bookingId = searchParams.get("bookingId");

  const { data: session, isPending } = useAuthSession();

  const [initializing, setInitializing] = useState(true);
  const [loading, setLoading] = useState(false);
  const [bookingData, setBookingData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
        if (!session) {
      router.replace(`/login`);
      return;
    }
    const fetchDetails = async () => {
      if (!bookingId) {
        setError("No booking ID provided.");
        setInitializing(false);
        return;
      }

      try {
        const res = await fetch(`/api/v1/bookings/${bookingId}`);
        const result = await res.json();

        if (!res.ok) {
          throw new Error(
            result.error?.message || result.message || "Could not find booking",
          );
        }

        setBookingData(result.data || result);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setInitializing(false);
      }
    };

    if (!isPending) {
      fetchDetails();
    }
  }, [bookingId, isPending]);

  const handleStripeCheckout = async () => {
    if (!bookingId) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/v1/stripe/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ bookingId }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to initialize payment");
      }

      window.location.href = data.url;
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Unable to redirect to payment gateway.");
      setLoading(false);
    }
  };

  if (isPending || initializing) {
    return (
      <Center h="100vh">
        <Stack align="center">
          <Loader size="xl" />
          <Text c="dimmed">Preparing secure payment...</Text>
        </Stack>
      </Center>
    );
  }

  if (!session?.user) {
    return (
      <Center h="100vh">
        <Alert color="red">You must be logged in.</Alert>
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
            <Text c="dimmed">
              You will be redirected to secure payment gateway.
            </Text>
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
              <Text size="xl" fw={900}>
                Total Amount
              </Text>
              <Text size="xl" fw={900} c="blue.9">
                THB {bookingData?.totalPrice?.toLocaleString() || "0"}
              </Text>
            </Group>
          </Paper>

          {error && (
            <Alert color="red" icon={<IconAlertCircle size={18} />}>
              {error}
            </Alert>
          )}

          <Paper withBorder p="xl" radius="md">
            <Stack>
              <Alert color="blue" icon={<IconLock size={18} />} variant="light">
                Payment is securely processed by Stripe.
              </Alert>

              <Button
                fullWidth
                size="lg"
                color="green"
                loading={loading}
                onClick={handleStripeCheckout}
              >
                Pay THB {bookingData?.totalPrice?.toLocaleString() || "0"}
              </Button>

              <Button
                variant="subtle"
                color="gray"
                onClick={() => router.back()}
                disabled={loading}
              >
                Cancel
              </Button>
            </Stack>
          </Paper>
        </Stack>
      </Container>
    </>
  );
}
