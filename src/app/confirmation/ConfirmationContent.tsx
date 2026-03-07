"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Container, Paper, Title, Text, Stack, Center, Loader, Box, RingProgress, Divider, Button } from "@mantine/core";
import { IconCheck } from "@tabler/icons-react";

export function ConfirmationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [countdown, setCountdown] = useState(10);
  const [bookingRef, setBookingRef] = useState<string | null>(null);
  
  const bookingId = searchParams.get("bookingId");

  useEffect(() => {
    const fetchBookingRef = async () => {
      if (!bookingId) return;
      try {
        const res = await fetch("/api/v1/tickets");
        const data = await res.json();
        const ticket = data.find((t: any) => t.bookingId === bookingId);
        
        if (ticket?.booking?.bookingRef) {
          setBookingRef(ticket.booking.bookingRef);
        }
      } catch (e) {
        console.error("Failed to fetch booking ref", e);
      }
    };

    fetchBookingRef();

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
  }, [bookingId, router]);

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
            <Text size="lg" c="dimmed">
              Your booking <b>#{bookingRef || "..."}</b> has been confirmed.
            </Text>
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
