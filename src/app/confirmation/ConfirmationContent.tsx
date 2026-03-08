"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Container, Paper, Title, Text, Stack, Center, Loader, Box, RingProgress, Divider, Button, Badge, Group } from "@mantine/core";
import { IconCheck } from "@tabler/icons-react";

export function ConfirmationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [countdown, setCountdown] = useState(10);
  const [bookingRefs, setBookingRefs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  
  const bookingIdParam = searchParams.get("bookingId");
  const bookingIds = bookingIdParam ? bookingIdParam.split(',') : [];

  useEffect(() => {
    const fetchBookingRefs = async () => {
      if (bookingIds.length === 0) {
        setLoading(false);
        return;
      }
      
      try {
        // Fetch all bookings by their IDs
        const refs: string[] = [];
        
        for (const id of bookingIds) {
          try {
            const res = await fetch(`/api/v1/bookings/${id}`);
            const result = await res.json();
            const booking = result.data || result;
            
            if (booking?.bookingRef) {
              refs.push(booking.bookingRef);
            }
          } catch (e) {
            console.error(`Failed to fetch booking ${id}:`, e);
          }
        }
        
        setBookingRefs(refs);
      } catch (e) {
        console.error("Failed to fetch booking refs", e);
      } finally {
        setLoading(false);
      }
    };

    fetchBookingRefs();

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) clearInterval(timer);
        return prev - 1;
      });
    }, 1000);

    const redirect = setTimeout(() => {
      router.push("/history");
    }, 10000);

    return () => {
      clearInterval(timer);
      clearTimeout(redirect);
    };
  }, [bookingIdParam, router]);

  if (loading) {
    return (
      <Container size="sm" py={100}>
        <Center h={400}>
          <Loader size="xl" />
        </Center>
      </Container>
    );
  }

  return (
    <Container size="sm" py={100}>
      <Paper withBorder shadow="md" p={50} radius="lg" style={{ textAlign: "center" }}>
        <Stack align="center" gap="xl">
          <RingProgress
            sections={[{ value: 100, color: "green" }]}
            label={
              <Center>
                <IconCheck size={40} color="var(--mantine-color-green-6)" />
              </Center>
            }
          />
        
          <Stack gap={5}>
            <Title order={1}>Payment Successful!</Title>
            {bookingRefs.length === 0 ? (
              <Text size="lg" c="dimmed">
                Your booking has been confirmed.
              </Text>
            ) : bookingRefs.length === 1 ? (
              <Text size="lg" c="dimmed">
                Your booking <b>#{bookingRefs[0]}</b> has been confirmed.
              </Text>
            ) : (
              <Stack gap="xs">
                <Text size="lg" c="dimmed">
                  Your {bookingRefs.length} bookings have been confirmed:
                </Text>
                <Group justify="center" gap="xs">
                  {bookingRefs.map((ref) => (
                    <Badge key={ref} size="lg" variant="light" color="blue">
                      {ref}
                    </Badge>
                  ))}
                </Group>
              </Stack>
            )}
          </Stack>

          <Divider w="100%" label="Redirecting" labelPosition="center" />

          <Stack gap="xs">
            <Text size="sm" c="dimmed">
              We are taking you to your booking history in
            </Text>
            <Text fw={700} size="xl" c="blue">
              {countdown > 0 ? countdown : 0} seconds...
            </Text>
            <Loader color="blue" size="sm" variant="dots" />
          </Stack>

          <Button variant="subtle" onClick={() => router.push("/history")}>
            Go to History Now
          </Button>
        </Stack>
      </Paper>
    </Container>
  );
}
