'use client';

import { useState, useEffect, Suspense, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { 
  Grid, GridCol, Container, Stack, Title, Text, Card, Group, 
  Button, Badge, Box, Loader, Center, UnstyledButton, Paper 
} from '@mantine/core';
import { Navbar } from '@/components/Navbar';
import { SearchHeader } from '@/components/SearchHeader';
import { PriceStrip } from '@/components/PriceStrip';
import { IconPlaneDeparture } from '@tabler/icons-react';

function SearchResults() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // --- Live States (Drive the API calls) ---
  const [from, setFrom] = useState(searchParams.get('from') || '');
  const [to, setTo] = useState(searchParams.get('to') || '');
  const [tripType, setTripType] = useState(searchParams.get('type') || 'one-way');
  const [cabin, setCabin] = useState(searchParams.get('cabin') || 'economy');

  const [departure, setDeparture] = useState<Date | null>(() => {
    const param = searchParams.get('departure');
    if (!param) return null;
    const d = new Date(param);
    return isNaN(d.getTime()) ? null : d;
  });

  const [returnDate, setReturnDate] = useState<Date | null>(() => {
    const param = searchParams.get('return');
    if (!param) return null;
    const d = new Date(param);
    return isNaN(d.getTime()) ? null : d;
  });

  // --- UI & Data States ---
  const [flights, setFlights] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [priceHistory, setPriceHistory] = useState<Record<string, number | null>>({});
  const [loadingPrices, setLoadingPrices] = useState(false);
  const [sortBy, setSortBy] = useState<'price' | 'earliest'>('price');

  // Flight Selection States
  const [selectedDeparture, setSelectedDeparture] = useState<any | null>(null);
  const [isSelectingReturn, setIsSelectingReturn] = useState(false);

  // Local state for header inputs (Draft state)
  const [localSearch, setLocalSearch] = useState({
    from: searchParams.get('from') || '',
    to: searchParams.get('to') || '',
    departure: departure,
    return: returnDate,
    type: tripType,
    cabin: cabin
  });

  // --- Helpers ---
  const formatDuration = (totalMins: number) => {
    const hours = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    return hours === 0 ? `${mins} min` : mins === 0 ? `${hours} hours` : `${hours} hours ${mins} min`;
  };

  const getSafeISO = (dateVal: any) => {
    if (dateVal instanceof Date && !isNaN(dateVal.getTime())) return dateVal.toISOString();
    return '';
  };

  const ensureDate = (val: any): Date | null => {
  if (!val) return null;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
};
  // --- Effects ---

  // 1. Fetch Price History (PriceStrip Trend)
  useEffect(() => {
    if (!from || !to) return;

    const fetchPriceTrend = async () => {
      setLoadingPrices(true);
      // Determine direction and date based on whether we are selecting departure or return
      const baseDate = isSelectingReturn ? (returnDate || departure) : departure;
      const currentFrom = isSelectingReturn ? to : from;
      const currentTo = isSelectingReturn ? from : to;

      if (!baseDate) {
        setLoadingPrices(false);
        return;
      }

      const dateRange = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(baseDate);
        d.setDate(d.getDate() - 3 + i);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      });

      try {
        const priceMap: Record<string, number | null> = {};
        await Promise.all(dateRange.map(async (dateStr) => {
          const res = await fetch(`/api/flights?origin=${currentFrom}&destination=${currentTo}&date=${dateStr}&limit=5`);
          const json = await res.json();
          if (json.data && json.data.length > 0) {
            priceMap[dateStr] = Math.min(...json.data.map((f: any) => parseFloat(f.basePrice)));
          } else {
            priceMap[dateStr] = null;
          }
        }));
        setPriceHistory(priceMap);
      } catch (err) {
        console.error("Price trend error:", err);
      } finally {
        setLoadingPrices(false);
      }
    };

    fetchPriceTrend();
  }, [from, to, departure, returnDate, isSelectingReturn]);

  // 2. Fetch Main Flight Results & Sync URL
  useEffect(() => {
    const fetchFlights = async () => {
      setLoading(true);
      try {
        const liveDeparture = ensureDate(departure);
    const liveReturn = ensureDate(returnDate);
const currentDate = isSelectingReturn ? liveReturn : liveDeparture;
    const currentOrigin = isSelectingReturn ? to : from;
    const currentDest = isSelectingReturn ? from : to;

        if (!currentOrigin || !currentDest || !currentDate) {
          setLoading(false);
          return;
        }

        const apiParams = new URLSearchParams();
        apiParams.append("origin", currentOrigin);
        apiParams.append("destination", currentDest);
        const localDate = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
        apiParams.append("date", localDate);
        apiParams.append("limit", "20");

        const response = await fetch(`/api/flights?${apiParams.toString()}`);
        const json = await response.json();
        setFlights(Array.isArray(json.data) ? json.data : []); 
      } catch (error) {
        setFlights([]); 
      } finally {
        setLoading(false);
      }
    };

    fetchFlights();

    // URL Sync
    const urlParams = new URLSearchParams();
    if (from) urlParams.append('from', from);
    if (to) urlParams.append('to', to);
    if (tripType) urlParams.append('type', tripType);
    if (cabin) urlParams.append('cabin', cabin);
    urlParams.append('departure', getSafeISO(departure));
    urlParams.append('return', getSafeISO(returnDate));

    router.replace(`/FlightSearch?${urlParams.toString()}`, { scroll: false });
  }, [from, to, departure, returnDate, tripType, cabin, isSelectingReturn, router]);

  const sortedFlights = useMemo(() => {
    return [...flights].sort((a, b) => {
      if (sortBy === 'price') {
        const priceA = Number(a.basePrice);
        const priceB = Number(b.basePrice);
        if (priceA !== priceB) return priceA - priceB;
        return new Date(a.departureTime).getTime() - new Date(b.departureTime).getTime();
      } else {
        return new Date(a.departureTime).getTime() - new Date(b.departureTime).getTime();
      }
    });
  }, [flights, sortBy]);

  return (
    <>
      <SearchHeader 
        searchData={localSearch}
        onFromChange={(val) => setLocalSearch(prev => ({ ...prev, from: val }))}
        onToChange={(val) => setLocalSearch(prev => ({ ...prev, to: val }))}
        onDepartureChange={(val) => setLocalSearch(prev => ({ ...prev, departure: val }))}
        onReturnChange={(val) => setLocalSearch(prev => ({ ...prev, return: val }))}
        onTypeChange={(val) => setLocalSearch(prev => ({ ...prev, type: val }))}
        onCabinChange={(val) => setLocalSearch(prev => ({ ...prev, cabin: val }))}
onSearch={() => {
  // 1. Properly convert strings to Date objects before updating "Live" state
  const newDeparture = ensureDate(localSearch.departure);
  const newReturn = ensureDate(localSearch.return);

  // 2. Detect if the destination/origin changed
  const routeChanged = from !== localSearch.from || to !== localSearch.to;

  // 3. Update Live States
  setFrom(localSearch.from);
  setTo(localSearch.to);
  setDeparture(newDeparture);
  setReturnDate(newReturn);
  setTripType(localSearch.type);
  setCabin(localSearch.cabin);

  // 4. SMART SELECTION LOGIC
  if (routeChanged) {
    // If they changed the city, we HAVE to start over from departure
    setSelectedDeparture(null);
    setIsSelectingReturn(false);
  } else if (selectedDeparture) {
    // If they only changed the date, STAY on the return leg
    setIsSelectingReturn(true);
  }
}}
      />
      
      <Container size="xl" py="xl">
        <Grid gutter="xl">
          <GridCol span={{ base: 12, md: 3 }}>
            <Stack gap="xl">
              <Box>
                <Title order={4} mb="md">Sort by</Title>
                <Stack gap="xs">
                  {['price', 'earliest'].map((type) => (
                    <UnstyledButton
                      key={type}
                      onClick={() => setSortBy(type as any)}
                      p="sm"
                      style={{
                        borderRadius: '8px',
                        backgroundColor: sortBy === type ? 'var(--mantine-color-blue-0)' : 'transparent',
                        border: `1px solid ${sortBy === type ? 'var(--mantine-color-blue-filled)' : '#dee2e6'}`,
                      }}
                    >
                      <Group justify="space-between">
                        <Text size="sm" fw={sortBy === type ? 700 : 400}>
                          {type === 'price' ? 'Cheapest Price' : 'Earliest Departure'}
                        </Text>
                        {sortBy === type && <Badge size="xs" variant="filled">Active</Badge>}
                      </Group>
                    </UnstyledButton>
                  ))}
                </Stack>
              </Box>
            </Stack>
          </GridCol>

          <GridCol span={{ base: 12, md: 9 }}>
            {isSelectingReturn && selectedDeparture && (
              <Paper withBorder p="md" mb="xl" bg="teal.0" style={{ borderLeft: '5px solid var(--mantine-color-teal-6)' }}>
                <Group justify="space-between">
                  <Box>
                    <Badge color="teal" variant="filled" mb={4}>Departure Selected</Badge>
                    <Text fw={700}>{selectedDeparture.route?.origin?.city} → {selectedDeparture.route?.destination?.city}</Text>
                    <Text size="sm" c="dimmed">
                      {new Date(selectedDeparture.departureTime).toLocaleDateString()} | THB {Number(selectedDeparture.basePrice).toLocaleString()}
                    </Text>
                  </Box>
                  <Button variant="subtle" color="gray" size="xs" onClick={() => {
                    setIsSelectingReturn(false);
                    setSelectedDeparture(null);
                  }}>Change Departure</Button>
                </Group>
              </Paper>
            )}
<PriceStrip 
  // Use a string representation for the key to avoid .getTime() crashes
  key={isSelectingReturn ? `return-${String(returnDate)}` : `dept-${String(departure)}`}
  
  // Use ensureDate to guarantee the component receives a real Date object
  startDate={ensureDate(isSelectingReturn ? (returnDate || localSearch.return) : (departure || localSearch.departure))} 
  
  onDateChange={(date) => {
    const safeDate = ensureDate(date);
    if (isSelectingReturn) {
      setReturnDate(safeDate);
      setLocalSearch(prev => ({ ...prev, return: safeDate }));
    } else {
      setDeparture(safeDate);
      setLocalSearch(prev => ({ ...prev, departure: safeDate }));
    }
  }} 
  prices={priceHistory}
  loading={loadingPrices}
/>
            
            <Title order={3} my="lg">
              {loading ? 'Searching...' : isSelectingReturn ? `Select return flight to ${from}` : `Select departure flight to ${to}`}
            </Title>
            
            <Stack gap="md">
              {loading ? (
                <Center py="xl"><Loader size="md" /></Center>
              ) : sortedFlights.length > 0 ? (
                sortedFlights.map((flight) => (
                  <Card key={flight.id} withBorder radius="md" p="lg">
                    <Group justify="space-between">
                      <Group gap="xl">
                        <IconPlaneDeparture size={32} color="gray" />
                        <Stack gap={0}>
                          <Title order={4}>{new Date(flight.departureTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Title>
                          <Text size="sm" c="dimmed">{flight.route?.origin?.iataCode}</Text>
                        </Stack>
                        <Stack align="center" gap={0} style={{ minWidth: 100 }}>
                          <Text size="xs" c="dimmed">{formatDuration(flight.route?.durationMins || 0)}</Text>
                          <div style={{ width: '100%', borderBottom: '1px dashed #ccc', margin: '4px 0' }} />
                          <Text size="xs" c="orange">Direct</Text>
                        </Stack>
                        <Stack gap={0}>
                          <Title order={4}>{new Date(flight.arrivalTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Title>
                          <Text size="sm" c="dimmed">{flight.route?.destination?.iataCode}</Text>
                        </Stack>
                      </Group>

                      <Stack align="flex-end" gap={0}>
                        <Text fw={900} size="xl">THB {Number(flight.basePrice).toLocaleString()}</Text>
                        <Button 
                          color="green" radius="xl" mt="sm"
                          onClick={() => {
                            if (tripType === 'round-trip' && !isSelectingReturn) {
                              setSelectedDeparture(flight);
                              setIsSelectingReturn(true);
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            } else {
                              console.log("Proceeding to Checkout:", { departure: selectedDeparture || flight, return: isSelectingReturn ? flight : null });
                            }
                          }}
                        >
                          {tripType === 'round-trip' && !isSelectingReturn ? 'Select Departure' : 'Select Flight'}
                        </Button>
                      </Stack>
                    </Group>
                  </Card>
                ))
              ) : (
                <Card withBorder p="xl"><Text c="dimmed" ta="center">No flights found for this date.</Text></Card>
              )}
            </Stack>
          </GridCol>
        </Grid>
      </Container>
    </>
  );
}

export default function FlightSearchPage() {
  return (
    <main>
      <Navbar />
      <Suspense fallback={<Center py="xl"><Loader size="xl" /></Center>}>
        <SearchResults />
      </Suspense>
    </main>
  );
}