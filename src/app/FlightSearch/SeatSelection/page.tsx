"use client";

import { useState, useEffect } from "react";
import React from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { 
  Container, Grid, Paper, Stack, Title, Text, Group, 
  Button, Badge, Box, Center, Loader, Divider, ActionIcon, 
  TextInput, Modal, Alert, Tooltip
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconArmchair, IconPlane, IconUserPlus, IconUserMinus, IconCheck, IconAlertCircle, IconClock } from "@tabler/icons-react";
import { Navbar } from "@/components/Navbar";
import { createBookingAction } from "./actions";

const formatUTCTime = (dateString: string) => {
  if (!dateString) return "...";
  const d = new Date(dateString);
  return d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const formatDate = (dateString: string) => {
  if (!dateString) return "...";
  return new Date(dateString).toLocaleDateString("en-US", {
    weekday: 'short',
    day: 'numeric',
    month: 'short'
  });
};

export default function SeatSelectionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const departFlightCode = searchParams.get("departFlightCode");
  
  const [loading, setLoading] = useState(true);
  const [flight, setFlight] = useState<any>(null);
  const [seatMap, setSeatMap] = useState<any>(null);
  
  const initialSeats = parseInt(searchParams.get("adults") || "1") + parseInt(searchParams.get("children") || "0");
  const [requiredSeats, setRequiredSeats] = useState(initialSeats > 0 ? initialSeats : 1);
  
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [passengerNames, setPassengerNames] = useState<Record<string, string>>({});
  const [opened, { open, close }] = useDisclosure(false);
  const [isBooking, setIsBooking] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        if (!departFlightCode) throw new Error("No flight code");
        const [flightRes, seatsRes] = await Promise.all([
          fetch(`/api/v1/flights/${departFlightCode}`, { cache: "no-store" }),
          fetch(`/api/v1/flights/${departFlightCode}/seats`, { cache: "no-store" })
        ]);

        const rawFlight = await flightRes.json();
        const rawSeats = await seatsRes.json();

        setFlight(rawFlight.data || rawFlight);
        setSeatMap(rawSeats.data || rawSeats); 
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    if (departFlightCode) fetchData();
  }, [departFlightCode]);

const handleProceedToPayment = async () => {
  setIsBooking(true);
  try {
    // Call the Server Action directly - No 404 possible here!
    const result = await createBookingAction(
      flight.id, // Ensure you use the internal ID from flight object
      selectedSeats.map(code => ({
        seatCode: code,
        name: passengerNames[code].trim()
      }))
    );

    if (result.bookingId) {
      router.push(`/FlightSearch/Payment?bookingId=${result.bookingId}`);
    }
  } catch (err: any) {
    console.error("Service Error:", err);
    alert(err.message);
  } finally {
    setIsBooking(false);
  }
};

  const getBasePriceForCabin = (cabinName: string) => {
    const cName = cabinName?.toUpperCase();
    const ecoPrice = Number(flight?.basePriceEconomy) || 1500;
    if (cName === "FIRST") return Number(flight?.basePriceFirst) || (ecoPrice * 4);
    if (cName === "BUSINESS") return Number(flight?.basePriceBusiness) || (ecoPrice * 2.5);
    return ecoPrice;
  };

  const getSeatDetails = (seatLabel: string) => {
    const seatObj = seatMap?.seats?.find((s: any) => s.label === seatLabel || s.code === seatLabel);
    const rowNum = parseInt(seatLabel.match(/\d+/)?.[0] || "0", 10);
    
    let cabinClass = "ECONOMY";
    if (seatMap?.layout?.cabins) {
      for (const cabin of seatMap.layout.cabins) {
        if (rowNum >= cabin.rowStart && rowNum <= cabin.rowEnd) {
          cabinClass = cabin.cabin || "ECONOMY";
          break;
        }
      }
    }

    const basePrice = getBasePriceForCabin(cabinClass);
    const finalPrice = seatObj?.price !== undefined ? Number(seatObj.price) : basePrice + Number(seatObj?.surcharge || 0);
    const isOccupied = seatObj?.status === "OCCUPIED" || seatMap?.occupiedSeats?.includes(seatLabel);

    return { cabinClass, finalPrice, isOccupied };
  };

  const handleSeatClick = (seatCode: string) => {
    const { isOccupied } = getSeatDetails(seatCode);
    if (isOccupied) return;

    if (selectedSeats.includes(seatCode)) {
      setSelectedSeats(prev => prev.filter(s => s !== seatCode));
      const newNames = { ...passengerNames };
      delete newNames[seatCode];
      setPassengerNames(newNames);
    } else if (selectedSeats.length < requiredSeats) {
      setSelectedSeats(prev => [...prev, seatCode]);
    }
  };

  const decreasePassengers = () => {
    if (requiredSeats > 1) {
      const newCount = requiredSeats - 1;
      if (selectedSeats.length > newCount) {
        const seatToRemove = selectedSeats[selectedSeats.length - 1];
        setSelectedSeats(prev => prev.slice(0, -1));
        const newNames = { ...passengerNames };
        delete newNames[seatToRemove];
        setPassengerNames(newNames);
      }
      setRequiredSeats(newCount);
    }
  };

  if (loading) return <Center h="100vh"><Loader size="xl" /></Center>;

  const totalPrice = selectedSeats.reduce((total, code) => total + getSeatDetails(code).finalPrice, 0);
  const allNamesFilled = selectedSeats.length === requiredSeats && selectedSeats.every(s => passengerNames[s]?.trim().length > 0);

  return (
    <>
      <Navbar />
      <Container size="xl" py="xl">
        {/* ENHANCED HEADER: Flight Times & Pricing Guide */}
        <Paper withBorder p="xl" radius="md" mb="xl" shadow="xs">
          <Grid align="center">
            <Grid.Col span={{ base: 12, md: 5 }}>
              <Group justify="space-between" wrap="nowrap">
                <Box>
                  <Text size="xs" c="dimmed" fw={700} tt="uppercase">Departure</Text>
                  <Text fw={900} size="xl">{flight.route.origin.iataCode}</Text>
                  <Text size="sm" fw={500}>{formatUTCTime(flight.departureTime)}</Text>
                  <Text size="xs" c="dimmed">{formatDate(flight.departureTime)}</Text>
                </Box>
                
                <Stack align="center" gap={0} flex={1}>
                  <IconPlane size={20} color="var(--mantine-color-blue-6)" />
                  <Divider w="60%" color="gray.3" />
                </Stack>

                <Box ta="right">
                  <Text size="xs" c="dimmed" fw={700} tt="uppercase">Arrival</Text>
                  <Text fw={900} size="xl">{flight.route.destination.iataCode}</Text>
                  <Text size="sm" fw={500}>{formatUTCTime(flight.arrivalTime)}</Text>
                  <Text size="xs" c="dimmed">{formatDate(flight.arrivalTime)}</Text>
                </Box>
              </Group>
            </Grid.Col>

            <Grid.Col span={{ base: 12, md: 2 }}>
                <Center>
                    <Badge variant="light" size="lg" leftSection={<IconClock size={14}/>}>
                        Direct
                    </Badge>
                </Center>
            </Grid.Col>

            <Grid.Col span={{ base: 12, md: 5 }}>
              <Paper withBorder p="xs" bg="gray.0" radius="sm">
                <Text size="xs" fw={700} c="dimmed" mb={5} ta="center">PRICE GUIDE (PER SEAT)</Text>
                <Group justify="center" gap="lg">
                  {seatMap?.layout?.cabins?.map((cabin: any) => (
                    <Stack gap={0} key={cabin.cabin} align="center">
                      <Text size="xs" fw={800} c="blue">{cabin.cabin}</Text>
                      <Text size="xs" fw={700}>THB {getBasePriceForCabin(cabin.cabin).toLocaleString()}</Text>
                    </Stack>
                  ))}
                </Group>
              </Paper>
            </Grid.Col>
          </Grid>
        </Paper>

        <Grid gutter="xl">
          {/* Seat Map */}
          <Grid.Col span={{ base: 12, md: 7 }}>
            <Paper withBorder p="xl" radius="lg">
              <Stack gap="xl">
                {seatMap?.layout?.cabins?.map((cabin: any) => (
                  <Box key={cabin.cabin}>
                    <Divider label={`${cabin.cabin} CLASS`} labelPosition="center" mb="md" />
                    <Stack gap="xs" align="center">
                      {Array.from({ length: cabin.rowEnd - cabin.rowStart + 1 }, (_, i) => cabin.rowStart + i).map(row => (
                        <Group key={row} gap="xs">
                          {cabin.columns.map((col: string) => {
                            const code = `${row}${col}`;
                            const { isOccupied, finalPrice } = getSeatDetails(code);
                            return (
                              <React.Fragment key={code}>
                                <SeatButton 
                                  label={code} 
                                  isOccupied={isOccupied} 
                                  isSelected={selectedSeats.includes(code)}
                                  price={finalPrice}
                                  onClick={() => handleSeatClick(code)}
                                />
                                {cabin.aisleAfter?.includes(col) && <Box w={24} />}
                              </React.Fragment>
                            );
                          })}
                        </Group>
                      ))}
                    </Stack>
                  </Box>
                ))}
              </Stack>
            </Paper>
          </Grid.Col>

          {/* Passenger Sidebar */}
          <Grid.Col span={{ base: 12, md: 5 }}>
            <Paper withBorder p="md" radius="md" pos="sticky" top={20}>
              <Group justify="space-between" mb="md">
                <Title order={4}>Passengers ({requiredSeats})</Title>
                <Group gap={8}>
                  <ActionIcon variant="light" color="red" onClick={decreasePassengers} disabled={requiredSeats <= 1}>
                    <IconUserMinus size={18} />
                  </ActionIcon>
                  <ActionIcon variant="light" color="blue" onClick={() => setRequiredSeats(r => r + 1)}>
                    <IconUserPlus size={18} />
                  </ActionIcon>
                </Group>
              </Group>

              {selectedSeats.length === 0 ? (
                <Alert icon={<IconAlertCircle size={16} />} color="blue" variant="light">
                  Please select {requiredSeats} seat{requiredSeats > 1 ? 's' : ''} from the map.
                </Alert>
              ) : (
                <Stack gap="md">
                  {selectedSeats.map(code => {
                    const { cabinClass, finalPrice } = getSeatDetails(code);
                    return (
                      <Box key={code}>
                        <Group justify="space-between" mb={4}>
                          <Badge size="xs" variant="filled" color={cabinClass === "FIRST" ? "gold" : cabinClass === "BUSINESS" ? "indigo" : "blue"}>
                            {cabinClass}
                          </Badge>
                          <Text size="xs" fw={700} c="dimmed">THB {finalPrice.toLocaleString()}</Text>
                        </Group>
                        <TextInput 
                          placeholder={`Name for Seat ${code}`}
                          value={passengerNames[code] || ""}
                          onChange={(e) => setPassengerNames({...passengerNames, [code]: e.target.value})}
                          rightSection={
                            <ActionIcon color="gray" variant="subtle" onClick={() => handleSeatClick(code)}>
                              ✕
                            </ActionIcon>
                          }
                        />
                      </Box>
                    );
                  })}
                </Stack>
              )}

              <Divider my="xl" />
              <Group justify="space-between">
                <Text fw={700}>Total Amount</Text>
                <Text fw={900} size="xl" c="blue.9">THB {totalPrice.toLocaleString()}</Text>
              </Group>

                <Button 
                fullWidth 
                mt="xl" 
                size="lg" 
                color="green" 
                // Disable if names aren't filled OR if currently booking
                disabled={!allNamesFilled || isBooking} 
                loading={isBooking}
                onClick={handleProceedToPayment}
                >
                Proceed to Payment
                </Button>
            </Paper>
          </Grid.Col>
        </Grid>
      </Container>
    </>
  );
}

function SeatButton({ label, isOccupied, isSelected, price, onClick }: any) {
  return (
    <Tooltip label={isOccupied ? "Occupied" : `Seat ${label} - THB ${price.toLocaleString()}`}>
      <ActionIcon 
        size={40} 
        variant={isSelected ? "filled" : isOccupied ? "light" : "outline"}
        color={isSelected ? "blue" : isOccupied ? "red" : "gray"}
        disabled={isOccupied}
        onClick={onClick}
      >
        <IconArmchair size={20} />
      </ActionIcon>
    </Tooltip>
  );
}

