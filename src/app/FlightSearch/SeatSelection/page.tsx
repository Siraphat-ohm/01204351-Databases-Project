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
import { IconArmchair, IconPlane, IconUserPlus, IconCheck, IconAlertCircle } from "@tabler/icons-react";
import { Navbar } from "@/components/Navbar"; // Adjust path if needed

// Helper to format time in UTC
const formatUTCTime = (dateString: string) => {
  if (!dateString) return "...";
  const d = new Date(dateString);
  return d.toLocaleTimeString("en-US", {
    timeZone: "UTC",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }) + " UTC";
};

export default function SeatSelectionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const departFlightCode = searchParams.get("departFlightCode");
  
  // 1. Initial State
  const [loading, setLoading] = useState(true);
  const [flight, setFlight] = useState<any>(null);
  const [seatMap, setSeatMap] = useState<any>(null);
  
  // 7. Add More Seats Logic
  const initialSeats = parseInt(searchParams.get("adults") || "1") + parseInt(searchParams.get("children") || "0");
  const [requiredSeats, setRequiredSeats] = useState(initialSeats > 0 ? initialSeats : 1);
  
  // 4. Seat Selection & 6. Name Input
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [passengerNames, setPassengerNames] = useState<Record<string, string>>({});
  
  // 9. Confirmation Modal
  const [opened, { open, close }] = useDisclosure(false);

  // Fetching both APIs
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        if (!departFlightCode) throw new Error("No flight code provided in URL");

        // Fetch both the main flight data AND the seats layout simultaneously
        const [flightRes, seatsRes] = await Promise.all([
          fetch(`/api/v1/flights/${departFlightCode}`, { cache: "no-store" }),
          fetch(`/api/v1/flights/${departFlightCode}/seats`, { cache: "no-store" })
        ]);
        
        if (!flightRes.ok) throw new Error("Failed to fetch flight details");
        if (!seatsRes.ok) throw new Error("Failed to fetch seat layout");
        
        const flightJson = await flightRes.json();
        const seatsJson = await seatsRes.json();
        
        const flightData = flightJson.data || flightJson;
        const seatData = seatsJson.data || seatsJson;

        if (!flightData) throw new Error("Flight data is empty.");
        if (!seatData) throw new Error("Seat layout data is empty.");

        setSelectedSeats([]);
        setPassengerNames({});
        
        setFlight(flightData);
        setSeatMap(seatData); 
        console.log("SEAT MAP DATA:", seatData);
      } catch (err) {
        console.error("Error loading data:", err);
        setFlight(null); 
        setSeatMap(null);
      } finally {
        setLoading(false);
      }
    };

    if (departFlightCode) fetchData();
  }, [departFlightCode]);

  // Handle clicking a seat on the map
  const handleSeatClick = (seatCode: string) => {
    // Check multiple possible API structures for the occupied status
    const seatObj = seatMap?.seats?.find((s: any) => s.label === seatCode || s.code === seatCode || s.seatNumber === seatCode);
    const isOccupied = seatObj?.status === "OCCUPIED" || seatMap?.occupiedSeats?.includes(seatCode) || flight?.occupiedSeats?.includes(seatCode);

    if (isOccupied) return;

    if (selectedSeats.includes(seatCode)) {
      // Unselect
      setSelectedSeats(prev => prev.filter(s => s !== seatCode));
      const newNames = { ...passengerNames };
      delete newNames[seatCode];
      setPassengerNames(newNames);
    } else {
      // Select (Only if we haven't reached the required capacity)
      if (selectedSeats.length < requiredSeats) {
        setSelectedSeats(prev => [...prev, seatCode]);
      }
    }
  };

  const handleNameChange = (seatCode: string, name: string) => {
    setPassengerNames(prev => ({ ...prev, [seatCode]: name }));
  };

  if (loading) return <Center h="100vh"><Loader size="xl" /></Center>;
  if (!flight || !seatMap) return <Center h="100vh"><Text>Flight not found.</Text></Center>;

  // 8. Total Price Calculation
// 8. Total Price Calculation
  const baseSeatPrice = Number(flight?.basePriceEconomy) || 1500; 
  
  // Calculate total by looking up the specific price/surcharge for EACH selected seat
  const totalPrice = selectedSeats.reduce((total, seatCode) => {
    const seatObj = seatMap?.seats?.find((s: any) => s.label === seatCode || s.code === seatCode || s.seatNumber === seatCode);
    
    // Force JavaScript to treat these as numbers, not strings!
    const thisSeatPrice = seatObj?.price !== undefined 
      ? Number(seatObj.price) 
      : baseSeatPrice + Number(seatObj?.surcharge || 0);
      
    return total + thisSeatPrice;
  }, 0);

  const allNamesFilled = selectedSeats.length === requiredSeats && selectedSeats.every(seat => passengerNames[seat]?.trim().length > 0);

  return (
    <>
      <Navbar />
      <Container size="xl" py="xl">
        
        {/* HEADER: 1. From/To UTC & 5. Plane Type */}
        <Paper withBorder p="lg" radius="md" mb="xl" shadow="sm">
          <Group justify="space-between" align="center">
            <Group>
              <Box>
                <Text size="xs" c="dimmed" tt="uppercase">Departure</Text>
                <Text fw={900} size="xl">{flight.route.origin.iataCode}</Text>
                <Text size="sm">{formatUTCTime(flight.departureTime)}</Text>
              </Box>
              <IconPlane size={24} style={{ color: '#adb5bd', margin: '0 15px' }} />
              <Box>
                <Text size="xs" c="dimmed" tt="uppercase">Arrival</Text>
                <Text fw={900} size="xl">{flight.route.destination.iataCode}</Text>
                <Text size="sm">{formatUTCTime(flight.arrivalTime)}</Text>
              </Box>
            </Group>
            <Stack gap={4} align="flex-end">
              <Badge color="blue" variant="light">{flight.aircraft.model}</Badge>
              <Text size="sm" fw={600}>Economy Class</Text>
              {/* Changed seatPrice to baseSeatPrice here to fix undefined error */}
              <Text size="xs" c="dimmed">From THB {baseSeatPrice.toLocaleString()} / seat</Text>
            </Stack>
          </Group>
        </Paper>

        <Grid gutter="xl">
          {/* LEFT: 2. Seat Map */}
          <Grid.Col span={{ base: 12, md: 7 }}>
            <Paper withBorder p="xl" radius="lg" bg="gray.0">
              <Center mb="md">
                <Text fw={700}>Select {requiredSeats} Seat{requiredSeats > 1 ? 's' : ''}</Text>
              </Center>
              
              <Group justify="center" gap="xl" mb="xl">
                 <Group gap="xs"><IconArmchair size={16} color="var(--mantine-color-gray-4)" /><Text size="xs">Available</Text></Group>
                 <Group gap="xs"><IconArmchair size={16} color="var(--mantine-color-blue-6)" /><Text size="xs">Selected</Text></Group>
                 <Group gap="xs"><IconArmchair size={16} color="var(--mantine-color-yellow-6)" /><Text size="xs">Premium/Exit</Text></Group>
                 <Group gap="xs"><IconArmchair size={16} color="var(--mantine-color-red-6)" /><Text size="xs">Occupied</Text></Group>
              </Group>

              <Stack gap="xl" align="center">
                {seatMap?.layout?.cabins?.map((cabin: any) => {
                  const rowsArray = Array.from(
                    { length: cabin.rowEnd - cabin.rowStart + 1 }, 
                    (_, i) => cabin.rowStart + i
                  );

                  return (
                    <Box key={cabin.cabin} w="100%">
                      <Divider label={<Text size="xs" fw={700} c="dimmed">{cabin.cabin} CLASS</Text>} labelPosition="center" mb="md" />
                      
                      <Stack gap="sm" align="center">
                        {rowsArray.map((row) => (
                          <Group key={row} gap="xs" wrap="nowrap">
                            {cabin?.columns?.map((col: string) => {
                              const seatLabel = `${row}${col}`;
                              
                              const seatObj = seatMap?.seats?.find((s: any) => s.label === seatLabel || s.code === seatLabel || s.seatNumber === seatLabel);
                              const isOccupied = seatObj?.status === "OCCUPIED" || seatMap?.occupiedSeats?.includes(seatLabel) || flight?.occupiedSeats?.includes(seatLabel);
                              
                              return (
                                <React.Fragment key={seatLabel}>
                                  <SeatButton 
                                    seatLabel={seatLabel} 
                                    isOccupied={isOccupied}
                                    selectedSeats={selectedSeats} 
                                    seatMap={seatMap}
                                    baseSeatPrice={baseSeatPrice}
                                    onClick={() => handleSeatClick(seatLabel)} 
                                  />
                                  
                                  {cabin?.aisleAfter?.includes(col) && (
                                    <Box w={40} ta="center"><Text size="xs" c="dimmed" mt={8}>{row}</Text></Box>
                                  )}
                                </React.Fragment>
                              );
                            })}
                          </Group>
                        ))}
                      </Stack>
                    </Box>
                  );
                })}
              </Stack>
            </Paper>
          </Grid.Col>

          {/* RIGHT: 6. Passenger Names & 8. Total Price */}
          <Grid.Col span={{ base: 12, md: 5 }}>
            <Stack gap="md">
              <Paper withBorder p="md" radius="md">
                <Group justify="space-between" mb="md">
                  <Title order={4}>Passengers</Title>
                  <Button variant="light" size="xs" leftSection={<IconUserPlus size={14}/>} onClick={() => setRequiredSeats(r => r + 1)}>
                    Add Passenger
                  </Button>
                </Group>

                {selectedSeats.length === 0 ? (
                  <Alert icon={<IconAlertCircle size={16} />} color="blue" variant="light">
                    Please select {requiredSeats} seat{requiredSeats > 1 ? 's' : ''} from the map to continue.
                  </Alert>
                ) : (
                 <Stack gap="sm">
                    {selectedSeats.map((seatCode) => {
                      // Look up specific price for this input field
                      const seatObj = seatMap?.seats?.find((s: any) => s.label === seatCode || s.code === seatCode || s.seatNumber === seatCode);
                      
                      // FIX: Wrap in Number()
                      const thisSeatPrice = seatObj?.price !== undefined 
                        ? Number(seatObj.price) 
                        : baseSeatPrice + Number(seatObj?.surcharge || 0);

                      return (
                        <Group key={seatCode} wrap="nowrap" align="flex-end">
                          <Box style={{ flex: 1 }}>
                            <TextInput 
                              label={`Seat ${seatCode} (THB ${thisSeatPrice.toLocaleString()})`}
                              placeholder="e.g. John Doe"
                              value={passengerNames[seatCode] || ""}
                              onChange={(e) => handleNameChange(seatCode, e.currentTarget.value)}
                              required
                            />
                          </Box>
                          <ActionIcon color="red" variant="subtle" mb={4} onClick={() => handleSeatClick(seatCode)}>
                             ✕
                          </ActionIcon>
                        </Group>
                      );
                    })}
                  </Stack>
                )}

                <Divider my="lg" />
                
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">Seats Selected</Text>
                  <Text fw={700}>{selectedSeats.length} / {requiredSeats}</Text>
                </Group>
                <Group justify="space-between" mt="xs">
                  <Text size="lg" fw={700}>Total Price</Text>
                  <Text size="xl" fw={900} c="blue.9">THB {totalPrice.toLocaleString()}</Text>
                </Group>

                <Button 
                  mt="xl" 
                  size="lg" 
                  fullWidth 
                  color="green"
                  disabled={!allNamesFilled}
                  onClick={open}
                >
                  Proceed to Confirmation
                </Button>
              </Paper>
            </Stack>
          </Grid.Col>
        </Grid>

        {/* 9. Ask for Confirmation Modal */}
        <Modal opened={opened} onClose={close} title={<Title order={4}>Confirm Your Booking</Title>} centered>
          <Stack gap="md">
            <Text size="sm">Please verify your passenger details before proceeding to payment.</Text>
            
            <Paper withBorder p="sm" bg="gray.0">
              {selectedSeats.map(seat => (
                <Group justify="space-between" key={seat} mb={8}>
                  <Text fw={600}>{passengerNames[seat]}</Text>
                  <Badge color="dark">Seat {seat}</Badge>
                </Group>
              ))}
            </Paper>

            <Group justify="space-between">
              <Text fw={700}>Total to Pay:</Text>
              <Text fw={900} size="xl" c="blue.7">THB {totalPrice.toLocaleString()}</Text>
            </Group>

            <Group grow mt="md">
              <Button variant="default" onClick={close}>Go Back</Button>
              <Button color="blue" leftSection={<IconCheck size={16} />} onClick={() => alert("Proceeding to payment gateway...")}>
                Confirm & Pay
              </Button>
            </Group>
          </Stack>
        </Modal>

      </Container>
    </>
  );
}

// Helper Component for the Seat UI
// Helper Component for the Seat UI
function SeatButton({ seatLabel, isOccupied, selectedSeats, seatMap, baseSeatPrice, onClick }: { seatLabel: string, isOccupied: boolean, selectedSeats: string[], seatMap: any, baseSeatPrice: number, onClick: () => void }) {
  const isSelected = selectedSeats.includes(seatLabel);

  // Determine the price and seat type using Number()
  const seatObj = seatMap?.seats?.find((s: any) => s.label === seatLabel || s.code === seatLabel || s.seatNumber === seatLabel);
  const thisSeatPrice = seatObj?.price !== undefined 
    ? Number(seatObj.price) 
    : Number(baseSeatPrice) + Number(seatObj?.surcharge || 0);

  let color = "gray.4"; // Available
  let variant = "outline";

  if (isOccupied) {
    color = "red.6";
    variant = "filled";
  } else if (isSelected) {
    color = "blue.6";
    variant = "filled";
  } else if (seatObj?.type === "EXIT_ROW" || seatObj?.type === "PREMIUM" || Number(seatObj?.surcharge) > 0) {
    color = "yellow.6"; // Give premium/exit seats a yellow outline
    variant = "outline";
  }

  const tooltipLabel = isOccupied ? "Occupied" : `Seat ${seatLabel} - THB ${thisSeatPrice.toLocaleString()}`;

  return (
    <Tooltip label={tooltipLabel} withArrow>
      <ActionIcon
        variant={variant as any}
        color={color}
        size={42}
        radius="md"
        disabled={isOccupied}
        onClick={onClick}
        style={{ cursor: isOccupied ? "not-allowed" : "pointer", opacity: isOccupied ? 0.5 : 1 }}
      >
        <IconArmchair size={24} />
      </ActionIcon>
    </Tooltip>
  );
}