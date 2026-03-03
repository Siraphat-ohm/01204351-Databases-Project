"use client";

import { useState, useEffect, useMemo } from "react";
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
  const bookingIdQuery = searchParams.get("bookingId"); 
  
  // Split the booking IDs if there are multiple (e.g., "id1,id2")
  const bookingIds = useMemo(() => {
    return bookingIdQuery ? bookingIdQuery.split(',').filter(Boolean) : [];
  }, [bookingIdQuery]);

  const { data: session, isPending } = useAuthSession();

  const [initializing, setInitializing] = useState(true);
  const [loading, setLoading] = useState(false);
  const [bookingsData, setBookingsData] = useState<any[]>([]); // Now an array
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session && !isPending) {
      router.replace(`/login`);
      return;
    }

    const fetchDetails = async () => {
      if (bookingIds.length === 0) {
        setError("No booking ID provided.");
        setInitializing(false);
        return;
      }

      try {
        // Fetch all bookings simultaneously
        const fetchPromises = bookingIds.map(async (id) => {
          const res = await fetch(`/api/v1/bookings/${id}`);
          const result = await res.json();
          if (!res.ok) {
            throw new Error(result.error?.message || result.message || `Could not find booking ${id}`);
          }
          return result.data || result;
        });

        const results = await Promise.all(fetchPromises);
        setBookingsData(results);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setInitializing(false);
      }
    };

    if (!isPending) {
      fetchDetails();
    }
  }, [bookingIds, isPending, session, router]);

  // Calculate the grand total across all fetched bookings
  const grandTotal = useMemo(() => {
    return bookingsData.reduce((sum, b) => sum + (Number(b.totalPrice) || 0), 0);
  }, [bookingsData]);

  const handleStripeCheckout = async () => {
    if (bookingIds.length === 0) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/v1/stripe/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        // Pass the array of IDs to your backend
        body: JSON.stringify({ bookingIds }), 
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
              You will be redirected to a secure payment gateway.
            </Text>
          </Box>

          <Paper withBorder p="lg" radius="md">
            <Text fw={700} mb="sm">Booking Reference{bookingsData.length > 1 ? 's' : ''}</Text>
            
            <Group gap="sm" mb="md">
              {bookingsData.length > 0 ? (
                bookingsData.map((b, i) => (
                  <Badge key={b.id || i} variant="outline" color="blue" size="lg">
                    {b.bookingRef || "PENDING"} {bookingsData.length > 1 && `(Trip ${i + 1})`}
                  </Badge>
                ))
              ) : (
                <Badge variant="outline" color="gray" size="lg">PENDING</Badge>
              )}
            </Group>

            {/* Optional Breakdown for Round Trips */}
            {bookingsData.length > 1 && (
              <Box mb="md">
                <Text size="sm" c="dimmed" mb="xs">Price Breakdown</Text>
                {bookingsData.map((b, i) => (
                  <Group justify="space-between" key={b.id || i} mb={4}>
                    <Text size="sm">Trip {i + 1} ({b.bookingRef || "Pending"})</Text>
                    <Text size="sm">THB {Number(b.totalPrice || 0).toLocaleString()}</Text>
                  </Group>
                ))}
              </Box>
            )}

            <Divider my="sm" />

            <Group justify="space-between">
              <Text size="xl" fw={900}>Grand Total</Text>
              <Text size="xl" fw={900} c="blue.9">
                THB {grandTotal.toLocaleString()}
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
                Pay THB {grandTotal.toLocaleString()}
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