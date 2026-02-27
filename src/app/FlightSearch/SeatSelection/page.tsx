"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import React from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { 
  Container, Grid, Paper, Stack, Title, Text, Group, 
  Button, Badge, Box, Center, Loader, Divider, ActionIcon, 
  TextInput, Alert, Tooltip
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconArmchair, IconPlane, IconUserPlus, IconUserMinus, IconCheck, IconAlertCircle, IconClock, IconMail, IconPhone, IconUser } from "@tabler/icons-react";
import { Navbar } from "@/components/Navbar";
import { useAuthSession } from "@/services/auth-client.service";

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

type PassengerDetails = {
  firstName: string;
  lastName: string;
  email: string;
};

// 1. Memoized the SeatButton component so it doesn't needlessly re-render
const SeatButton = React.memo(function SeatButton({ label, isOccupied, isSelected, price, onClick }: any) {
  return (
    <Tooltip label={isOccupied ? `Seat ${label} - Occupied` : `Seat ${label} - THB ${price.toLocaleString()}`}>
      <ActionIcon 
        size={40} 
        onClick={() => !isOccupied && onClick()} 
        style={{
          backgroundColor: isSelected 
            ? 'var(--mantine-color-blue-filled)' 
            : isOccupied 
              ? 'var(--mantine-color-dark-5)'
              : 'var(--mantine-color-gray-1)',
          color: isSelected 
            ? 'white' 
            : isOccupied 
              ? 'var(--mantine-color-dark-2)'
              : 'var(--mantine-color-blue-6)',
          border: isSelected || isOccupied ? 'none' : '1px solid var(--mantine-color-gray-4)',
          cursor: isOccupied ? 'not-allowed' : 'pointer',
          opacity: isOccupied ? 0.9 : 1
        }}
      >
        <IconArmchair size={20} />
      </ActionIcon>
    </Tooltip>
  );
});

export default function SeatSelectionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const departFlightCode = searchParams.get("departFlightCode");
  
  const { data: session, isPending: isAuthLoading } = useAuthSession();

  const [loading, setLoading] = useState(true);
  const [isBooking, setIsBooking] = useState(false);
  const [flight, setFlight] = useState<any>(null);
  const [seatMap, setSeatMap] = useState<any>(null);
  
  const initialSeats = parseInt(searchParams.get("adults") || "1");
  const [requiredSeats, setRequiredSeats] = useState(initialSeats > 0 ? initialSeats : 1);
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  
  const [passengerData, setPassengerData] = useState<Record<string, PassengerDetails>>({});
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");

  useEffect(() => {
    // 🚨 1. Add this line: If auth is still checking, do absolutely nothing yet.
    if (isAuthLoading) return; 

    // 2. NOW check if they are missing a session
    if (!session) {
      router.replace(`/login`);
      return;
    }
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
  }, [departFlightCode, session, router]);

  // 2. useCallback to cache math functions so they don't rebuild on every keystroke
  const getBasePriceForCabin = useCallback((cabinName: string) => {
    const cName = cabinName?.toUpperCase();
    const ecoPrice = Number(flight?.basePriceEconomy) || 1500;
    if (cName === "FIRST") return Number(flight?.basePriceFirst) || (ecoPrice * 4);
    if (cName === "BUSINESS") return Number(flight?.basePriceBusiness) || (ecoPrice * 2.5);
    return ecoPrice;
  }, [flight]);

  const getSeatDetails = useCallback((seatLabel: string) => {
    const seatObj = seatMap?.layout?.seats?.find((s: any) => s.label === seatLabel);
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
    const surcharge = Number(seatObj?.surcharge || 0);
    const trueBasePrice = seatObj?.price !== undefined ? (Number(seatObj.price) - surcharge) : basePrice;
    const finalPrice = trueBasePrice + surcharge;
    const isOccupied = seatObj?.status === "OCCUPIED";

    return { cabinClass, trueBasePrice, surcharge, finalPrice, isOccupied };
  }, [seatMap, getBasePriceForCabin]);

  // 3. useMemo to only calculate total price when selected seats ACTUALLY change
  const totalPrice = useMemo(() => {
    return selectedSeats.reduce((total, code) => total + getSeatDetails(code).finalPrice, 0);
  }, [selectedSeats, getSeatDetails]);

  const handleProceedToPayment = async () => {
    if (isBooking) return;
    setIsBooking(true);
    
    const payload = {
      userId: session?.user?.id,
      flightId: flight?.id || "",
      totalPrice: Number(totalPrice),
      currency: "THB",
      contactEmail: contactEmail.trim(),
      contactPhone: contactPhone.trim(),
      tickets: selectedSeats.map(code => {
        const { cabinClass, trueBasePrice, surcharge } = getSeatDetails(code);
        let backendClass = "ECONOMY";
        if (cabinClass.toUpperCase().includes("FIRST")) backendClass = "FIRST_CLASS";
        else if (cabinClass.toUpperCase().includes("BUSINESS")) backendClass = "BUSINESS";
        
        return {
          class: backendClass,
          seatNumber: code,
          price: Number(trueBasePrice),
          seatSurcharge: Number(surcharge),
          firstName: passengerData[code]?.firstName?.trim() || "",
          lastName: passengerData[code]?.lastName?.trim() || "",
          email: passengerData[code]?.email?.trim() || ""
        };
      })
    };
    
    try {
      const res = await fetch('/api/v1/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      let result;
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        result = await res.json();
      } else {
        const text = await res.text();
        throw new Error(text || `Server responded with status ${res.status}`);
      }

      if (!res.ok) {
        if (result.validationCode) throw new Error(`Booking Error (${result.validationCode}): ${result.error}`);
        if (result?.error?.details || result?.details) {
          const zodErrors = Object.entries(result.error.details || result.details)
            .map(([field, msg]) => `- ${field}: ${msg}`).join("\n");
          throw new Error(`Form Validation Error:\n${zodErrors}`);
        }
        throw new Error(result?.error?.message || result?.error || result?.message || "Failed to create booking");
      }

      const bookingId = result?.data?.id || result?.id;
      if (bookingId) {
        router.push(`/FlightSearch/Payment?bookingId=${bookingId}`);
      } else {
        throw new Error("API returned Success but no booking ID was found.");
      }
    } catch (err: any) {
      console.error("Booking creation failed", err);
      alert(err.message || "Failed to create booking. Please try again.");
    } finally {
      setIsBooking(false);
    }
  };

  // 4. Wrap handlers in useCallback so they don't recreate on every typing stroke
  const handleSeatClick = useCallback((seatCode: string) => {
    const { isOccupied } = getSeatDetails(seatCode);
    if (isOccupied) return;

    if (selectedSeats.includes(seatCode)) {
      setSelectedSeats(prev => prev.filter(s => s !== seatCode));
      setPassengerData(prev => {
        const newData = { ...prev };
        delete newData[seatCode];
        return newData;
      });
    } else if (selectedSeats.length < requiredSeats) {
      setSelectedSeats(prev => [...prev, seatCode]);
      setPassengerData(prev => ({
        ...prev,
        [seatCode]: { firstName: "", lastName: "", email: "" }
      }));
    }
  }, [selectedSeats, requiredSeats, getSeatDetails]);

  const decreasePassengers = () => {
    if (requiredSeats > 1) {
      const newCount = requiredSeats - 1;
      if (selectedSeats.length > newCount) {
        const seatToRemove = selectedSeats[selectedSeats.length - 1];
        setSelectedSeats(prev => prev.slice(0, -1));
        setPassengerData(prev => {
          const newData = { ...prev };
          delete newData[seatToRemove];
          return newData;
        });
      }
      setRequiredSeats(newCount);
    }
  };

  const updatePassengerField = (seatCode: string, field: keyof PassengerDetails, value: string) => {
    setPassengerData(prev => ({
      ...prev,
      [seatCode]: {
        ...prev[seatCode],
        [field]: value
      }
    }));
  };

  // 5. THE MAGIC: Cache the ENTIRE Seat Map grid rendering
  // It will now ONLY re-render if seatMap or selectedSeats change. Typing ignores this block!
  const renderedSeatMap = useMemo(() => {
    return seatMap?.layout?.cabins?.map((cabin: any) => (
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
    ));
  }, [seatMap, selectedSeats, getSeatDetails, handleSeatClick]);

  if (loading || isAuthLoading) return <Center h="100vh"><Loader size="xl" /></Center>;
  
  const allPassengersFilled = selectedSeats.length === requiredSeats && selectedSeats.every(s => {
    const p = passengerData[s];
    return p?.firstName?.trim().length > 0 && p?.lastName?.trim().length > 0 && p?.email?.trim().length > 0;
  });
  const isContactFilled = contactEmail.trim().length > 0 && contactPhone.trim().length > 0;
  const canProceed = allPassengersFilled && isContactFilled;

  return (
    <>
      <Navbar />
      <Container size="xl" py="xl">
        <Paper withBorder p="xl" radius="md" mb="xl" shadow="xs">
          <Grid align="center">
            <Grid.Col span={{ base: 12, md: 5 }}>
              <Group justify="space-between" wrap="nowrap">
                <Box>
                  <Text size="xs" c="dimmed" fw={700} tt="uppercase">Departure</Text>
                  <Text fw={900} size="xl">{flight?.route?.origin?.iataCode}</Text>
                  <Text size="sm" fw={500}>{formatUTCTime(flight?.departureTime)}</Text>
                  <Text size="xs" c="dimmed">{formatDate(flight?.departureTime)}</Text>
                </Box>
                
                <Stack align="center" gap={0} flex={1}>
                  <IconPlane size={20} color="var(--mantine-color-blue-6)" />
                  <Divider w="60%" color="gray.3" />
                </Stack>

                <Box ta="right">
                  <Text size="xs" c="dimmed" fw={700} tt="uppercase">Arrival</Text>
                  <Text fw={900} size="xl">{flight?.route?.destination?.iataCode}</Text>
                  <Text size="sm" fw={500}>{formatUTCTime(flight?.arrivalTime)}</Text>
                  <Text size="xs" c="dimmed">{formatDate(flight?.arrivalTime)}</Text>
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
          {/* Seat Map - NOW MEMOIZED */}
          <Grid.Col span={{ base: 12, md: 7 }}>
            <Paper withBorder p="xl" radius="lg">
              <Stack gap="xl">
                {renderedSeatMap}
              </Stack>
            </Paper>
          </Grid.Col>

          {/* Passenger & Contact Sidebar */}
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
                <Stack gap="lg">
                  {selectedSeats.map(code => {
                    const { cabinClass, finalPrice } = getSeatDetails(code);
                    return (
                      <Paper withBorder p="sm" radius="md" key={code} bg="gray.0">
                        <Group justify="space-between" mb="sm">
                          <Group gap="xs">
                            <Badge size="md" variant="filled" color={cabinClass === "FIRST" ? "gold" : cabinClass === "BUSINESS" ? "indigo" : "blue"}>
                              Seat {code} ({cabinClass})
                            </Badge>
                          </Group>
                          <Group gap="sm">
                            <Text size="sm" fw={700} c="blue.9">THB {finalPrice.toLocaleString()}</Text>
                            <ActionIcon color="red" variant="subtle" size="sm" onClick={() => handleSeatClick(code)}>
                              ✕
                            </ActionIcon>
                          </Group>
                        </Group>

                        <Stack gap="xs">
                          <Group grow>
                            <TextInput 
                              placeholder="First Name"
                              leftSection={<IconUser size={16} />}
                              value={passengerData[code]?.firstName || ""}
                              onChange={(e) => updatePassengerField(code, 'firstName', e.target.value)}
                              required
                            />
                            <TextInput 
                              placeholder="Last Name"
                              value={passengerData[code]?.lastName || ""}
                              onChange={(e) => updatePassengerField(code, 'lastName', e.target.value)}
                              required
                            />
                          </Group>
                          <TextInput 
                            placeholder="Passenger Email"
                            leftSection={<IconMail size={16} />}
                            value={passengerData[code]?.email || ""}
                            onChange={(e) => updatePassengerField(code, 'email', e.target.value)}
                            required
                          />
                        </Stack>
                      </Paper>
                    );
                  })}

                  <Paper withBorder p="sm" radius="md" bg="blue.0" style={{ borderColor: 'var(--mantine-color-blue-2)' }}>
                    <Text fw={700} size="sm" mb="xs" c="blue.9">Booking Contact Information</Text>
                    <Stack gap="xs">
                      <TextInput 
                        placeholder="Primary Email Address"
                        leftSection={<IconMail size={16} />}
                        value={contactEmail}
                        onChange={(e) => setContactEmail(e.target.value)}
                        required
                      />
                      <TextInput 
                        placeholder="Primary Phone Number"
                        leftSection={<IconPhone size={16} />}
                        value={contactPhone}
                        onChange={(e) => setContactPhone(e.target.value)}
                        required
                      />
                    </Stack>
                  </Paper>
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
                disabled={!canProceed || isBooking}
                loading={isBooking}
                onClick={handleProceedToPayment}
                leftSection={<IconCheck size={20} />}
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