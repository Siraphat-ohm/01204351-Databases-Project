'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useState, useEffect, Suspense } from 'react';
import { 
  Container, Paper, Stack, Group, Title, Text, Badge, 
  Divider, Center, Loader, Grid, Button, Box, ScrollArea 
} from '@mantine/core';
import { 
  IconPlaneDeparture, IconArmchair, IconChevronRight, IconArrowLeft
} from '@tabler/icons-react';

function SeatSelectionContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const returnId = searchParams.get('returnId');

  // --- States ---
  const [loading, setLoading] = useState(true);
  const [flightData, setFlightData] = useState<{departure: any, return: any} | null>(null);
  const [currentStep, setCurrentStep] = useState<'depart' | 'return'>('depart');
  const [selectedSeats, setSelectedSeats] = useState<{depart: string | null, return: string | null}>({
    depart: null,
    return: null
  });

  // Mock Plane Config
  const rows = 15;
  const cols = ['A', 'B', 'C', 'D', 'E', 'F'];
  const occupiedSeats = ['1A', '2B', '5E', '10F']; 

  // Helper to convert minutes to "X hours Y mins"
  const formatDuration = (totalMins: number) => {
    if (!totalMins) return "0 mins";
    const hours = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    
    if (hours === 0) return `${mins} mins`;
    if (mins === 0) return `${hours} hours`;
    return `${hours} hours ${mins} mins`;
  };

  useEffect(() => {
    const loadFlightData = () => {
      setLoading(true);
      try {
        const departRaw = localStorage.getItem('selectedDepartureFlight');
        const returnRaw = localStorage.getItem('selectedReturnFlight');

        const departure = departRaw ? JSON.parse(departRaw) : null;
        const returnFlight = returnRaw ? JSON.parse(returnRaw) : null;

        console.log("✈️ Data Loaded into SeatSelection:", { departure, return: returnFlight });

        if (departure) {
          setFlightData({ departure, return: returnFlight });
        }
      } catch (error) {
        console.error("Error parsing local storage data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadFlightData();
  }, []);

  if (loading) return <Center h="100vh"><Loader size="xl" color="blue" /></Center>;

  const currentFlight = currentStep === 'depart' ? flightData?.departure : flightData?.return;
  const currentSelection = currentStep === 'depart' ? selectedSeats.depart : selectedSeats.return;

  if (!currentFlight) {
    return (
      <Center h="100vh">
        <Stack align="center">
          <Text size="lg" fw={500}>No flight selection found.</Text>
          <Button variant="outline" onClick={() => router.push('/FlightSearch')}>Back to Search</Button>
        </Stack>
      </Center>
    );
  }

  const handleSeatClick = (seatId: string) => {
    setSelectedSeats(prev => ({ ...prev, [currentStep]: seatId }));
  };

  const handleNext = () => {
    if (currentStep === 'depart' && returnId) {
      setCurrentStep('return');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      console.log("Final Selection:", { flightData, selectedSeats });
      // router.push('/Checkout');
    }
  };

  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        
        {/* --- NAVIGATION --- */}
        <Group justify="space-between">
          <Button 
            variant="subtle" 
            leftSection={<IconArrowLeft size={16}/>}
            onClick={() => currentStep === 'return' ? setCurrentStep('depart') : router.back()}
          >
            Back
          </Button>
          <Group gap="xs">
            <Badge size="lg" variant={currentStep === 'depart' ? "filled" : "light"}>1. Departure Seat</Badge>
            {returnId && <Badge size="lg" variant={currentStep === 'return' ? "filled" : "light"}>2. Return Seat</Badge>}
          </Group>
        </Group>

        {/* --- FLIGHT HEADER --- */}
        <Paper withBorder p="xl" radius="md" shadow="sm">
          <Grid align="center">
            <Grid.Col span={{ base: 12, md: 8 }}>
              <Group gap="xl">
                <Box>
                  <Title order={3}>{currentFlight.route?.origin?.iataCode}</Title>
                  <Text size="sm" c="dimmed">{currentFlight.route?.origin?.city}, {currentFlight.route?.origin?.country}</Text>
                  <Text fw={700} size="xl" c="blue">
                    {new Date(currentFlight.departureTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </Box>
                
                <Stack gap={0} align="center">
                  <Text size="xs" fw={700} c="dimmed">{currentFlight.flightCode}</Text>
                  <Divider w={60} my={4} color="blue" size="md" />
                  {/* Updated Duration Display */}
                  <Text size="xs" c="dimmed" fw={500} style={{ whiteSpace: 'nowrap' }}>
                    {formatDuration(currentFlight.route?.durationMins)}
                  </Text>
                </Stack>

                <Box>
                  <Title order={3}>{currentFlight.route?.destination?.iataCode}</Title>
                  <Text size="sm" c="dimmed">{currentFlight.route?.destination?.city}, {currentFlight.route?.destination?.country}</Text>
                  <Text fw={700} size="xl">
                    {new Date(currentFlight.arrivalTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </Box>
              </Group>
            </Grid.Col>

            <Grid.Col span={{ base: 12, md: 4 }}>
              <Paper withBorder p="md" bg="gray.0" ta="center">
                <Text size="xs" fw={700} c="dimmed">AIRCRAFT</Text>
                <Text fw={600} mb="xs">{currentFlight.aircraft?.type?.model}</Text>
                <Badge size="xl" radius="md" variant="filled" color="blue" fullWidth h={45}>
                  Seat: {currentSelection || 'None'}
                </Badge>
              </Paper>
            </Grid.Col>
          </Grid>
        </Paper>

        <Grid gutter="xl">
          <Grid.Col span={{ base: 12, md: 8 }}>
            <Paper withBorder p="xl" radius="lg">
              <Center mb="xl">
                <Box py="xs" px="xl" style={{ border: '2px solid #eee', borderRadius: '50px 50px 10px 10px', width: '250px', textAlign: 'center' }}>
                  <Text size="xs" fw={800} c="dimmed">FRONT OF PLANE</Text>
                </Box>
              </Center>

              <ScrollArea h={500} offsetScrollbars>
                <Stack gap="xs" align="center">
                  {Array.from({ length: rows }).map((_, rowIndex) => (
                    <Group key={rowIndex + 1} gap="xl" wrap="nowrap">
                      <Text size="xs" w={20} c="dimmed" fw={700}>{rowIndex + 1}</Text>
                      <Group gap="xs">
                        {cols.map((col, idx) => {
                          const seatId = `${rowIndex + 1}${col}`;
                          const isOccupied = occupiedSeats.includes(seatId);
                          const isSelected = currentSelection === seatId;
                          return (
                            <Group key={seatId} gap={0}>
                              <Button
                                p={0}
                                variant={isSelected ? "filled" : "light"}
                                color={isOccupied ? "gray" : isSelected ? "blue" : "green"}
                                disabled={isOccupied}
                                onClick={() => handleSeatClick(seatId)}
                                style={{ width: 40, height: 40 }}
                              >
                                <IconArmchair size={20} />
                              </Button>
                              {idx === 2 && <Box w={40} />}
                            </Group>
                          );
                        })}
                      </Group>
                    </Group>
                  ))}
                </Stack>
              </ScrollArea>
            </Paper>
          </Grid.Col>

          <Grid.Col span={{ base: 12, md: 4 }}>
            <Stack gap="md" style={{ position: 'sticky', top: '20px' }}>
              <Paper withBorder p="md" radius="md">
                <Title order={4} mb="sm">Selection Details</Title>
                <Group justify="space-between" mb="xs">
                  <Text size="sm">Flight:</Text>
                  <Text size="sm" fw={700}>{currentFlight.flightCode}</Text>
                </Group>
                <Group justify="space-between" mb="xs">
                  <Text size="sm">Base Price:</Text>
                  <Text size="sm" fw={700}>THB {parseFloat(currentFlight.basePrice).toLocaleString()}</Text>
                </Group>
                <Divider my="sm" />
                <Button 
                  size="xl" 
                  fullWidth 
                  rightSection={<IconChevronRight size={20}/>}
                  disabled={!currentSelection}
                  onClick={handleNext}
                >
                  {currentStep === 'depart' && returnId ? "Next Flight" : "Confirm Selection"}
                </Button>
              </Paper>
            </Stack>
          </Grid.Col>
        </Grid>
      </Stack>
    </Container>
  );
}

export default function SeatSelectionPage() {
  return (
    <Suspense fallback={<Center h="100vh"><Loader /></Center>}>
      <SeatSelectionContent />
    </Suspense>
  );
}