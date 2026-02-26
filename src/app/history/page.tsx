"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Container, Title, Card, Text, Group, Badge, Stack, Loader, Center, Paper, Divider, Flex, Box } from "@mantine/core";
import { IconPlaneDeparture, IconTicket, IconUser } from "@tabler/icons-react";
import { useAuthSession } from "@/services/auth-client.service";
import { Navbar } from "@/components/Navbar";

export default function HistoryPage() {
  const { data: session } = useAuthSession();
  const [groupedBookings, setGroupedBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
     if (!session) {
      router.replace(`/login`);
      return;
    }
    const fetchTickets = async () => {
      try {
        const res = await fetch("/api/v1/tickets");
        const data = await res.json();
        
       if (Array.isArray(data)) {
  const groups = data.reduce((acc: any, ticket: any) => {
    const ref = ticket.booking?.bookingRef || "N/A";
    if (!acc[ref]) {
      acc[ref] = {
        ref,
        flight: ticket.flight,
        booking: ticket.booking,
        passengers: []
      };
    }
    acc[ref].passengers.push(ticket);
    return acc;
  }, {});

  // Convert to array and sort by booking creation date (Latest First)
  const sortedGroups = Object.values(groups).sort((a: any, b: any) => {
    const dateA = new Date(a.booking?.createdAt).getTime();
    const dateB = new Date(b.booking?.createdAt).getTime();
    
    // Sort descending: most recent booking date first
    return dateB - dateA;
  });

  setGroupedBookings(sortedGroups);
}
      } catch (error) {
        console.error("Failed to fetch tickets", error);
      } finally {
        setLoading(false);
      }
    };

    if (session) fetchTickets();
  }, [session]);

  if (loading) {
    return (
      <>
        <Navbar />
        <Center h="80vh"><Loader color="blue" size="xl" /></Center>
      </>
    );
  }

  return (
    <Box pb="xl">
      <Navbar />
      <Container size="md" py="xl">
        <Stack gap="xl">
          <Group justify="space-between">
            <Group>
              <IconTicket size={32} color="var(--mantine-color-blue-6)" />
              <Title order={2}>My Bookings</Title>
            </Group>
          </Group>

          {groupedBookings.length === 0 ? (
            <Paper p="xl" withBorder style={{ textAlign: 'center', borderStyle: 'dashed' }}>
              <Text c="dimmed">You haven't booked any flights yet.</Text>
            </Paper>
          ) : (
            groupedBookings.map((group: any) => (
              <Card 
                key={group.ref} 
                withBorder 
                shadow="sm" 
                radius="md" 
                p={0} 
                style={{ cursor: 'pointer' }} 
                onClick={() => router.push(`/history/${group.ref}`)}
              >
                <Flex align="stretch" direction={{ base: 'column', sm: 'row' }}>
                  
                  {/* --- LEFT SECTION: CENTERED FLIGHT INFO --- */}
                  <Stack p="xl" style={{ flex: 1 }} >
                    <Group justify="space-between" align="start">
                      <Badge color="blue" variant="filled" radius="xl">
                        {group.flight?.flightCode}
                      </Badge>
                      <Text size="sm" fw={500} c="dimmed">Ref: {group.ref}</Text>
                    </Group>

                    <Group justify="space-between" align="center" mt="md">
                      <Stack gap={0}>
                        <Text size="xl" fw={900}>{group.flight?.route?.origin?.iataCode}</Text>
                        <Text size="sm" c="dimmed">{group.flight?.route?.origin?.city}</Text>
                      </Stack>
                      
                      <Stack align="center" gap={0} style={{ flex: 1 }}>
                        <IconPlaneDeparture color="gray" size={24} style={{ opacity: 0.5 }} />
                        <Divider w="50%" />
                      </Stack>

                      <Stack gap={0} align="flex-end">
                        <Text size="xl" fw={900}>{group.flight?.route?.destination?.iataCode}</Text>
                        <Text size="sm" c="dimmed">{group.flight?.route?.destination?.city}</Text>
                      </Stack>
                    </Group>

                    <Text size="sm" fw={600} mt="md">
                      {new Date(group.flight?.departureTime).toLocaleString('en-GB', {
                        weekday: 'short', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                      })}
                    </Text>
                  </Stack>

                  {/* --- RIGHT SECTION: PASSENGER DETAILS --- */}
                  <Stack p="lg" gap={0} bg="gray.0" style={{ borderLeft: '1px dashed #dee2e6', flex: 1 }}>
                    <Text size="xs" fw={700} c="dimmed" tt="uppercase" mb="md">Passenger Details</Text>
                    
                    <Stack gap="md">
                      {group.passengers.map((passenger: any, index: number) => (
                        <Stack key={passenger.id} gap={4}>
                          {index > 0 && <Divider variant="dotted" mb="sm" />}
                          <Group gap="xs">
                            <IconUser size={16} color="gray" />
                            <Text size="sm" fw={800}>{passenger.firstName} {passenger.lastName}</Text>
                          </Group>
                          
                          <Group justify="space-between">
                            <Group gap="xl">
                              <div>
                                <Text size="xs" c="dimmed" tt="uppercase">Seat</Text>
                                <Text fw={800} size="md">{passenger.seatNumber}</Text>
                              </div>
                              <div>
                                <Text size="xs" c="dimmed" tt="uppercase">Class</Text>
                                <Text size="xs" fw={800} c="blue" tt="uppercase">{passenger.class}</Text>
                              </div>
                            </Group>
                            
                            <Badge 
                              color={passenger.checkedIn ? "green" : "orange"} 
                              variant="outline" 
                              size="sm"
                              radius="xl"
                              leftSection={<div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: 'currentColor' }} />}
                            >
                              {passenger.checkedIn ? "CHECKED IN" : "NOT CHECK IN"}
                            </Badge>
                          </Group>
                        </Stack>
                      ))}
                    </Stack>
                  </Stack>
                </Flex>
              </Card>
            )
          ))}
        </Stack>
      </Container>
    </Box>
  );
}