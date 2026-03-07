"use client";

import { useState, useEffect, useMemo, useCallback, Suspense } from "react";
import React from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { 
  Container, Grid, Paper, Stack, Title, Text, Group, 
  Button, Badge, Box, Center, Loader, Divider, ActionIcon, 
  TextInput, Alert, Tooltip
} from "@mantine/core";
import { IconArmchair, IconPlane, IconUserPlus, IconUserMinus, IconCheck, IconAlertCircle, IconClock, IconMail, IconPhone, IconUser, IconArrowLeft } from "@tabler/icons-react";
import { Navbar } from "@/components/Navbar";
import { useAuthSession } from "@/services/auth-client.service";

const formatUTCTime = (dateString: string) => {
  if (!dateString) return "...";
  const d = new Date(dateString);
  return d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "UTC"
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

function SeatSelectionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const departFlightCode = searchParams.get("departFlightCode");
  const returnFlightCode = searchParams.get("returnFlightCode");
  const isRoundTrip = !!returnFlightCode;
  
  const { data: session, isPending: isAuthLoading } = useAuthSession();

  const [currentStep, setCurrentStep] = useState<"DEPART" | "RETURN">("DEPART");
  const [departPayload, setDepartPayload] = useState<any>(null);

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
    if (isAuthLoading) return; 

    if (!session) {
      router.replace(`/login`);
      return;
    }
    const fetchData = async () => {
      setLoading(true);
      try {
        const targetCode = currentStep === "DEPART" ? departFlightCode : returnFlightCode;
        if (!targetCode) throw new Error("No flight code found for this step.");
        
        const [flightRes, seatsRes] = await Promise.all([
          fetch(`/api/v1/flights/${targetCode}`, { cache: "no-store" }),
          fetch(`/api/v1/flights/${targetCode}/seats`, { cache: "no-store" })
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
  }, [departFlightCode, returnFlightCode, currentStep, session, router, isAuthLoading]);

  const getBasePriceForCabin = useCallback((cabinName: string) => {
    const cName = cabinName?.toUpperCase();
    const ecoPrice = Number(flight?.basePriceEconomy) || 1500;
    if (cName === "FIRST") return Number(flight?.basePriceFirst) || (ecoPrice * 4);
    if (cName === "BUSINESS") return Number(flight?.basePriceBusiness) || (ecoPrice * 2.5);
    return ecoPrice;
  }, [flight]);

  const getSeatDetails = useCallback((seatLabel: string) => {
    const seatObj = seatMap?.layout?.seatOverrides?.[seatLabel] || {};
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
    const surcharge = Number(seatObj.surcharge || 0);
    const trueBasePrice = seatObj.price !== undefined ? (Number(seatObj.price) - surcharge) : basePrice;
    
    const finalPrice = trueBasePrice + surcharge;
    const isOccupied = seatObj.status === "OCCUPIED";

    return { cabinClass, trueBasePrice, surcharge, finalPrice, isOccupied };
  }, [seatMap, getBasePriceForCabin]);

  const totalPrice = useMemo(() => {
    return selectedSeats.reduce((total, code) => total + getSeatDetails(code).finalPrice, 0);
  }, [selectedSeats, getSeatDetails]);

  const generatePayload = () => {
    return {
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
  };

  const handleProceed = async () => {
    if (currentStep === "DEPART" && isRoundTrip) {
      setDepartPayload(generatePayload());
      setCurrentStep("RETURN");
      setSelectedSeats([]);
      setPassengerData({});
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (isBooking) return;
    setIsBooking(true);
    
    try {
      const returnOrOneWayPayload = generatePayload();
      const payloadsToSubmit = isRoundTrip ? [departPayload, returnOrOneWayPayload] : [returnOrOneWayPayload];
      
      const bookingIds = [];

      for (const payload of payloadsToSubmit) {
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
          bookingIds.push(bookingId);
        } else {
          throw new Error("API returned Success but no booking ID was found.");
        }
      }

      router.push(`/FlightSearch/Payment?bookingId=${bookingIds.join(',')}`);
      
    } catch (err: any) {
      console.error("Booking creation failed", err);
      alert(err.message || "Failed to create booking. Please try again.");
    } finally {
      setIsBooking(false);
    }
  };

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

  if (loading || isAuthLoading) return <Center h="50vh"><Loader size="xl" /></Center>;
  
  const allPassengersFilled = selectedSeats.length === requiredSeats && selectedSeats.every(s => {
    const p = passengerData[s];
    return p?.firstName?.trim().length > 0 && p?.lastName?.trim().length > 0 && p?.email?.trim().length > 0;
  });
  const isContactFilled = contactEmail.trim().length > 0 && contactPhone.trim().length > 0;
  const canProceed = allPassengersFilled && isContactFilled;

  return (
    <Container size="xl" py="xl">
      <Title order={2} mb="md">
        {currentStep === "DEPART" ? "Select Departure Seats" : "Select Return Seats"}
        {isRoundTrip && (
          <Badge ml="sm" size="lg" color="blue" variant="light">
            Step {currentStep === "DEPART" ? "1" : "2"} of 2
          </Badge>
        )}
      </Title>
      <Paper withBorder p="xl" radius="md" mb="xl" shadow="xs">
        <Grid align="center">
          <Grid.Col span={{ base: 12, md: 5 }}>
            <Group justify="space-between" wrap="nowrap">
              <Box>
                <Text size="xs" c="dimmed" fw={700} tt="uppercase">
                  {currentStep === "DEPART" ? "Departure Flight" : "Return Flight"}
                </Text>
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
        <Grid.Col span={{ base: 12, md: 7 }}>
          <Paper withBorder p="xl" radius="lg">
            <Stack gap="xl">
              <Group justify="center" gap="xl" mb="md">
                <Group gap="xs"><IconArmchair size={20} color="var(--mantine-color-blue-6)" /><Text size="sm">Available</Text></Group>
                <Group gap="xs"><IconArmchair size={20} color="var(--mantine-color-blue-filled)" /><Text size="sm" fw={700}>Selected</Text></Group>
                <Group gap="xs"><IconArmchair size={20} color="var(--mantine-color-dark-2)" /><Text size="sm" c="dimmed">Occupied</Text></Group>
              </Group>
              
              {renderedSeatMap}
            </Stack>
          </Paper>
        </Grid.Col>

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
              <Text fw={700}>Total Amount (Current Flight)</Text>
              <Text fw={900} size="xl" c="blue.9">THB {totalPrice.toLocaleString()}</Text>
            </Group>

            <Button 
              fullWidth 
              mt="xl" 
              size="lg" 
              color={currentStep === "DEPART" && isRoundTrip ? "blue" : "green"} 
              disabled={!canProceed || isBooking}
              loading={isBooking}
              onClick={handleProceed}
              leftSection={currentStep === "DEPART" && isRoundTrip ? undefined : <IconCheck size={20} />}
            >
              {currentStep === "DEPART" && isRoundTrip ? "Select Return Seats" : "Proceed to Payment"}
            </Button>

            {currentStep === "RETURN" && (
              <Button 
                fullWidth 
                mt="sm" 
                variant="subtle" 
                color="gray"
                leftSection={<IconArrowLeft size={16} />}
                onClick={() => {
                  setCurrentStep("DEPART");
                  setSelectedSeats([]);
                  setPassengerData({});
                }}
              >
                Back to Departure Selection
              </Button>
            )}
          </Paper>
        </Grid.Col>
      </Grid>
    </Container>
  );
}

export default function SeatSelectionPage() {
  return (
    <Suspense fallback={
      <Center h="50vh">
        <Loader size="xl" />
      </Center>
    }>
      <Navbar />
      <SeatSelectionContent />
    </Suspense>
  );
}