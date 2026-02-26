"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Container,
  Stack,
  Group,
  Box,
  Text,
  Paper,
  Badge,
  Divider,
  Center,
  Loader,
  Button,
} from "@mantine/core";
import {
  IconPlaneDeparture,
  IconChevronLeft,
  IconBarcode,
  IconQrcode,
} from "@tabler/icons-react";
import { useAuthSession } from "@/services/auth-client.service";
// --- IMPORT NAVBAR ---
import { Navbar } from "@/components/Navbar";

export default function BookingDetailsPage() {
  const { ref } = useParams();
  const router = useRouter();
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { data: session } = useAuthSession();

  useEffect(() => {
    if (!session) {
      router.replace(`/login`);
      return;
    }

    const fetchBookingDetails = async () => {
      try {
        const res = await fetch("/api/v1/tickets");
        const data = await res.json();
        const filtered = data.filter((t: any) => t.booking?.bookingRef === ref);
        setTickets(filtered);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchBookingDetails();
  }, [ref, session, router]);

  if (loading)
    return (
      <>
        <Navbar />
        <Center h="80vh">
          <Loader size="xl" />
        </Center>
      </>
    );

  return (
    <>
      <Navbar />
      <Container size="md" py="xl">
        <Button
          variant="subtle"
          leftSection={<IconChevronLeft size={16} />}
          onClick={() => router.back()}
          mb="xl"
        >
          Back to History
        </Button>

        <Stack gap={40}>
          {tickets.map((ticket) => (
            <Paper
              key={ticket.id}
              shadow="md"
              radius="lg"
              style={{ overflow: "hidden", border: "1px solid #e0e0e0" }}
            >
              {/* Blue Header Bar */}
              <Group justify="space-between" bg="blue.6" p="md" c="white">
                <Group gap="xs">
                  <IconPlaneDeparture size={24} />
                  <Text fw={900} style={{ letterSpacing: "1px" }}>
                    YOK AIRLINES
                  </Text>
                </Group>
                <Text fw={700}>BOARDING PASS</Text>
              </Group>

              <Group gap={0} align="stretch" wrap="nowrap">
                {/* --- BARCODE COLUMN (FIXED WIDTH) --- */}
                <Box
                  style={{
                    width: "60px",
                    position: "relative",
                    backgroundColor: "#fff",
                    borderRight: "1px solid #f0f0f0",
                  }}
                >
                  <Box
                    style={{
                      position: "absolute",
                      top: "50%",
                      left: "50%",
                      transform: "translate(-50%, -50%) rotate(-90deg)",
                      width: "240px", // Long barcode
                      height: "40px",
                      background: `repeating-linear-gradient(90deg, #000, #000 2px, transparent 2px, transparent 4px, #000 4px, #000 5px, transparent 5px, transparent 8px)`,
                      opacity: 0.8,
                    }}
                  />
                </Box>

                {/* --- MAIN SECTION --- */}
                <Stack p="xl" style={{ flex: 2, position: "relative" }}>
                  <Group justify="space-between">
                    <Stack gap={0}>
                      <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                        Passenger Name
                      </Text>
                      <Text size="lg" fw={800}>
                        {ticket.firstName} {ticket.lastName}
                      </Text>
                    </Stack>
                    <Stack gap={0}>
                      <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                        Flight No
                      </Text>
                      <Text size="lg" fw={800} c="blue.7">
                        {ticket.flight?.flightCode}
                      </Text>
                    </Stack>
                    <Stack gap={0}>
                      <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                        Seat Number
                      </Text>
                      <Text size="lg" fw={800} c="blue.7">
                        {ticket.seatNumber}
                      </Text>
                    </Stack>
                  </Group>

                  <Group mt="xl" justify="space-between" align="center">
                    <div>
                      <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                        From
                      </Text>
                      <Text size="xl" fw={900} lh={1}>
                        {ticket.flight?.route?.origin?.iataCode}
                      </Text>
                      <Text size="sm">{ticket.flight?.route?.origin?.city}</Text>
                    </div>

                    <Box style={{ textAlign: "center", opacity: 0.2 }}>
                      <IconPlaneDeparture size={32} />
                      <Divider w={80} />
                    </Box>

                    <div style={{ textAlign: "right" }}>
                      <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                        To
                      </Text>
                      <Text size="xl" fw={900} lh={1}>
                        {ticket.flight?.route?.destination?.iataCode}
                      </Text>
                      <Text size="sm">
                        {ticket.flight?.route?.destination?.city}
                      </Text>
                    </div>
                  </Group>

                  <Divider variant="dashed" my="lg" />

                  <Group grow>
                    <div>
                      <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                        Date
                      </Text>
                      <Text fw={700}>
                        {new Date(ticket.flight?.departureTime).toLocaleDateString()}
                      </Text>
                    </div>
                    <div>
                      <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                        Gate
                      </Text>
                      <Text fw={700}>{ticket.flight?.gate || "A1"}</Text>
                    </div>
                    <div>
                      <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                        Boarding Time
                      </Text>
                      <Text fw={700} c="blue.7">
                        04:20 PM
                      </Text>
                    </div>
                  </Group>
                </Stack>

                {/* --- STUB SECTION --- */}
                <Stack
                  p="xl"
                  bg="gray.0"
                  style={{
                    flex: 1,
                    borderLeft: "2px dashed #e0e0e0",
                    justifyContent: "space-between",
                    minWidth: "240px",
                  }}
                >
                  <Stack gap="xs">
                    <div>
                      <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                        Passenger
                      </Text>
                      <Text
                        size="sm"
                        fw={800}
                        style={{ textTransform: "uppercase" }}
                      >
                        {ticket.firstName} {ticket.lastName}
                      </Text>
                    </div>

                    <Group justify="space-between" mt="xs">
                      <div>
                        <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                          From
                        </Text>
                        <Text size="md" fw={900}>
                          {ticket.flight?.route?.origin?.iataCode}
                        </Text>
                      </div>
                      <IconPlaneDeparture
                        size={14}
                        color="#adb5bd"
                        style={{ marginTop: "10px" }}
                      />
                      <div style={{ textAlign: "right" }}>
                        <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                          To
                        </Text>
                        <Text size="md" fw={900}>
                          {ticket.flight?.route?.destination?.iataCode}
                        </Text>
                      </div>
                    </Group>
                  </Stack>

                  <Group mt="md" justify="space-between" align="flex-end">
                    <Stack gap={0}>
                      <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                        Seat
                      </Text>
                      <Text size="38px" fw={900} lh={1} c="blue.9">
                        {ticket.seatNumber}
                      </Text>
                    </Stack>
                    <Badge variant="light" color="blue" radius="sm" mb="4px">
                      {ticket.class}
                    </Badge>
                  </Group>

                  <Stack gap={10} mt="md">
                    <div>
                      <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                        Reference
                      </Text>
                      <Text size="xs" fw={800}>
                        {ref}
                      </Text>
                    </div>

                    <Box
                      style={{
                        width: "100%",
                        height: "45px",
                        background: `repeating-linear-gradient(
                          90deg, 
                          #000, 
                          #000 1px, 
                          transparent 1px, 
                          transparent 2px, 
                          #000 2px, 
                          #000 3px, 
                          transparent 3px, 
                          transparent 5px,
                          #000 5px,
                          #000 6px,
                          transparent 6px,
                          transparent 8px
                        )`,
                        opacity: 0.9,
                      }}
                    />

                    <Text
                      ta="center"
                      size="8px"
                      fw={600}
                      style={{ letterSpacing: "3px", marginTop: "-6px" }}
                    >
                      {ref?.toString().toUpperCase()}
                    </Text>
                  </Stack>
                </Stack>
              </Group>
            </Paper>
          ))}
        </Stack>
      </Container>
    </>
  );
}