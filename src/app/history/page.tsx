"use client";

import { useEffect, useState } from "react";
import { Container, Title, Card, Text, Group, Badge, Stack, Loader, Center, Paper, Divider } from "@mantine/core";
import { IconPlaneDeparture, IconTicket, IconMapPin, IconUser } from "@tabler/icons-react";
import { useAuthSession } from "@/services/auth-client.service";

export default function HistoryPage() {
  const { data: session } = useAuthSession();
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTickets = async () => {
      try {
        // Based on your console.log, the endpoint returns an array directly
        const res = await fetch("/api/v1/tickets");
        const data = await res.json();
        setTickets(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Failed to fetch tickets", error);
      } finally {
        setLoading(false);
      }
    };

    if (session) fetchTickets();
  }, [session]);

  if (loading) {
    return <Center h="80vh"><Loader color="blue" size="xl" /></Center>;
  }

  return (
    <Container size="md" py="xl">
      <Stack gap="xl">
        <Group justify="space-between">
          <Group>
            <IconTicket size={32} color="var(--mantine-color-blue-6)" />
            <Title order={2}>My Bookings</Title>
          </Group>
          <Badge size="lg" variant="outline">{tickets.length} Tickets</Badge>
        </Group>

        {tickets.length === 0 ? (
          <Paper p="xl" withBorder style={{ textAlign: 'center', borderStyle: 'dashed' }}>
            <Text c="dimmed">You haven't booked any flights yet.</Text>
          </Paper>
        ) : (
          tickets.map((ticket) => (
            <Card key={ticket.id} withBorder shadow="sm" radius="md" p={0}>
              <Group grow gap={0}>
                {/* Left Section: Flight Info */}
                <Stack p="lg" gap="xs" style={{ flex: 2 }}>
                  <Group justify="space-between">
                    <Badge color="blue" variant="filled">{ticket.flight?.flightCode}</Badge>
                    <Text size="sm" fw={700} c="dimmed">Ref: {ticket.booking?.bookingRef}</Text>
                  </Group>

                  <Group mt="md" justify="space-between" align="center">
                    <div>
                      <Text size="xl" fw={900}>{ticket.flight?.route?.origin?.iataCode}</Text>
                      <Text size="xs" c="dimmed">{ticket.flight?.route?.origin?.city}</Text>
                    </div>
                    
                    <Stack align="center" gap={0}>
                      <IconPlaneDeparture color="gray" size={20} />
                      <Divider w={60} labelPosition="center" />
                    </Stack>

                    <div style={{ textAlign: 'right' }}>
                      <Text size="xl" fw={900}>{ticket.flight?.route?.destination?.iataCode}</Text>
                      <Text size="xs" c="dimmed">{ticket.flight?.route?.destination?.city}</Text>
                    </div>
                  </Group>

                  <Text size="sm" mt="sm" fw={500}>
                    {new Date(ticket.flight?.departureTime).toLocaleString('en-GB', {
                      weekday: 'short', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                    })}
                  </Text>
                </Stack>

                {/* Right Section: Passenger Info (Grey background) */}
                <Stack p="lg" gap="xs" bg="gray.0" style={{ borderLeft: '1px dashed var(--mantine-color-gray-3)' }}>
                  <Group gap="xs">
                    <IconUser size={16} />
                    <Text size="sm" fw={700} style={{ textTransform: 'uppercase' }}>
                      {ticket.firstName} {ticket.lastName}
                    </Text>
                  </Group>
                  
                  <Group justify="space-between" mt="auto">
                    <div>
                      <Text size="xs" c="dimmed">SEAT</Text>
                      <Text fw={700} size="lg">{ticket.seatNumber}</Text>
                    </div>
                    <div>
                      <Text size="xs" c="dimmed">CLASS</Text>
                      <Badge color={ticket.class === "BUSINESS" ? "violet" : "blue"} variant="light">
                        {ticket.class}
                      </Badge>
                    </div>
                  </Group>

                  <Divider mt="xs" />

                  <Group justify="space-between" align="center">
                    <Text size="xs" c="dimmed">STATUS</Text>
                    <Badge color={ticket.checkedIn ? "green" : "orange"} variant="dot">
                      {ticket.checkedIn ? "Checked In" : "Confirmed"}
                    </Badge>
                  </Group>
                </Stack>
              </Group>
            </Card>
          ))
        )}
      </Stack>
    </Container>
  );
}