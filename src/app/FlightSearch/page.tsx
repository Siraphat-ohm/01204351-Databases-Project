"use client";
import { useAuthSession } from "@/services/auth-client.service";
import { useState, useEffect, Suspense, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Grid,
  GridCol,
  Container,
  Stack,
  Title,
  Text,
  Card,
  Group,
  Button,
  Badge,
  Box,
  Loader,
  Center,
  UnstyledButton,
  Paper,
  Divider,
} from "@mantine/core";
import { Navbar } from "@/components/Navbar";
import { SearchHeader } from "@/components/SearchHeader";
import { PriceStrip } from "@/components/PriceStrip";
import { FlightCard } from "@/components/FlightCard";
import { IconPlaneDeparture } from "@tabler/icons-react";

function SearchResults() {
  const { data: session, isPending } = useAuthSession();
  const searchParams = useSearchParams();
  const router = useRouter();
const [adults, setAdults] = useState(() => parseInt(searchParams.get('adults') || '1'));
const [children, setChildren] = useState(() => parseInt(searchParams.get('children') || '0'));  
const formatLocalTime = (dateString: string) => {
  const date = new Date(dateString);
  // Returns time in HH:MM AM/PM format ignoring local timezone shift
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'UTC', // Forces calculation based on the string's literal value
  });
};
useEffect(() => {
  const params = new URLSearchParams(window.location.search);


  
  // Only push an update if the URL is MISSING the passenger info
  if (!params.has('adults') || !params.has('children')) {
    const newParams = new URLSearchParams(searchParams.toString());
    newParams.set('adults', adults.toString());
    newParams.set('children', children.toString());
    router.replace(`?${newParams.toString()}`, { scroll: false });
  }
}, []); // Run once on mount

  
  

  // --- Live States (Drive the API calls) ---
  const [from, setFrom] = useState(searchParams.get("from") || "");
  const [to, setTo] = useState(searchParams.get("to") || "");
  const [tripType, setTripType] = useState(
    searchParams.get("type") || "one-way",
  );
  const [cabin, setCabin] = useState(searchParams.get("cabin") || "economy");

  const [departure, setDeparture] = useState<Date | null>(() => {
    const param = searchParams.get("departure");
    if (!param) return null;
    const d = new Date(param);
    return isNaN(d.getTime()) ? null : d;
  });

  const [returnDate, setReturnDate] = useState<Date | null>(() => {
    const param = searchParams.get("return");
    if (!param) return null;
    const d = new Date(param);
    return isNaN(d.getTime()) ? null : d;
  });

  // --- UI & Data States ---
  const [flights, setFlights] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [priceHistory, setPriceHistory] = useState<
    Record<string, number | null>
  >({});
  const [loadingPrices, setLoadingPrices] = useState(false);
  const [sortBy, setSortBy] = useState<"price" | "earliest">("price");

  // Flight Selection States
  const [selectedDeparture, setSelectedDeparture] = useState<any | null>(null);
  const [isSelectingReturn, setIsSelectingReturn] = useState(false);

  // Local state for header inputs (Draft state)
 const [localSearch, setLocalSearch] = useState({
  from: searchParams.get("from") || from, // Use the live state as fallback
  to: searchParams.get("to") || to,
  departure: departure,
  return: returnDate,
  type: tripType,
  cabin: cabin,
  adults: adults,
  children: children,
});


useEffect(() => {
  setLocalSearch({
    from,
    to,
    departure,
    return: returnDate,
    type: tripType,
    cabin,
    adults,
    children,
  });
}, [from, to, departure, returnDate, tripType, cabin, adults, children]);
  // --- Helpers ---
  const formatDuration = (totalMins: number) => {
    const hours = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    return hours === 0
      ? `${mins} min`
      : mins === 0
        ? `${hours} hours`
        : `${hours} hours ${mins} min`;
  };
  

  const getSafeISO = (dateVal: any) => {
    if (dateVal instanceof Date && !isNaN(dateVal.getTime()))
      return dateVal.toISOString();
    return "";
  };

  const ensureDate = (val: any): Date | null => {
    if (!val) return null;
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  };
  // --- Effects ---
  

  // 1. Fetch Price History (PriceStrip Trend)
// 1. Fetch Price History (PriceStrip Trend)


const handleFinalSearch = () => {
  // Sync Draft -> Live
  setFrom(localSearch.from);
  setTo(localSearch.to);
  setDeparture(ensureDate(localSearch.departure));
  setReturnDate(ensureDate(localSearch.return));
  setTripType(localSearch.type);
  setCabin(localSearch.cabin);
  setAdults(localSearch.adults);
  setChildren(localSearch.children);

  // If they were in the middle of a selection and changed parameters, reset them
  setSelectedDeparture(null);
  setIsSelectingReturn(false);
  
  // The useEffect with [from, to, departure...] will now automatically fire
};
useEffect(() => {
  if (!from || !to) return;

  const fetchPriceTrend = async () => {
    setLoadingPrices(true);
    const baseDate = isSelectingReturn ? returnDate || departure : departure;
    const currentFrom = isSelectingReturn ? to : from;
    const currentTo = isSelectingReturn ? from : to;

    if (!baseDate || !currentFrom || !currentTo) {
      setLoadingPrices(false);
      return;
    }

    const dateRange = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(baseDate);
      d.setDate(d.getDate() - 3 + i);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    });

    try {
      const priceMap: Record<string, number | null> = {};
      
      await Promise.all(
        dateRange.map(async (dateStr) => {
          try {
         const res = await fetch(
          `/api/v1/flights?originIataCode=${currentFrom}&destinationIataCode=${currentTo}&departureDate=${dateStr}&limit=5`
          );
          if (!res.ok) throw new Error();

          const json = await res.json(); 

          // 🚨 FIX: Safely extract flight data here too
          const flightData = json.data || (Array.isArray(json) ? json : []);

          if (flightData && flightData.length > 0) {
          const cabinKey = cabin?.toLowerCase();
          const pricesFound = flightData.map((f: any) => {
          if (cabinKey === 'business') return parseFloat(f.basePriceBusiness);
          if (cabinKey.includes('first')) return parseFloat(f.basePriceFirst);
          return parseFloat(f.basePriceEconomy);
          }).filter((p: number) => !isNaN(p));

          priceMap[dateStr] = pricesFound.length > 0 ? Math.min(...pricesFound) : null;
          } else {
          priceMap[dateStr] = null;
          }
          } catch {
            priceMap[dateStr] = null;
          }
        })
      );
      setPriceHistory(priceMap);
    } catch (err) {
      console.error("Price trend error:", err);
    } finally {
      setLoadingPrices(false);
    }
  };

  fetchPriceTrend();
}, [from, to, departure, returnDate, isSelectingReturn, cabin]); // Added cabin as dependency
useEffect(() => {
  // If user just logged in and we have a pending flight
  const pendingRaw = localStorage.getItem('pendingSelection');
  
  if (session && pendingRaw) {
    const pending = JSON.parse(pendingRaw);
    
    // Clear it so it doesn't trigger again
    localStorage.removeItem('pendingSelection');

    // Restore the state for the UI (optional, but good for consistency)
    if (pending.selectedDeparture) {
        setSelectedDeparture(pending.selectedDeparture);
        setIsSelectingReturn(pending.isSelectingReturn);
    }

    // Automatically trigger the navigation
    proceedToSeats(pending.flight, pending.selectedDeparture);
  }
}, [session]); // Triggers as soon as session is truthy

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
        apiParams.append("originIataCode", currentOrigin);
        apiParams.append("destinationIataCode", currentDest);
        
        const dateStr = currentDate.toISOString().split('T')[0]; 
        apiParams.append("departureDate", dateStr);
        apiParams.append("limit", "20");

        const response = await fetch(`/api/v1/flights?${apiParams.toString()}`);
        const json = await response.json();
        
        // 🚨 FIX: Safely handle both { data: [...] } and raw [...] arrays
        const flightData = json.data || (Array.isArray(json) ? json : []);
        setFlights(Array.isArray(flightData) ? flightData : []);
        
      } catch (error) {
        setFlights([]);
      } finally {
        setLoading(false);
      }
    };

    fetchFlights();

    // URL Sync
    const urlParams = new URLSearchParams();
    if (from) urlParams.append("from", from);
    if (to) urlParams.append("to", to);
    if (tripType) urlParams.append("type", tripType);
    if (cabin) urlParams.append("cabin", cabin);


    urlParams.append("adults", adults.toString());
  urlParams.append("children", children.toString());
    urlParams.append("departure", getSafeISO(departure));
    urlParams.append("return", getSafeISO(returnDate));

    router.replace(`/FlightSearch?${urlParams.toString()}`, { scroll: false });
  },[from, to, departure, returnDate, isSelectingReturn, adults, children])

 const sortedFlights = useMemo(() => {
    return [...flights].sort((a, b) => {
      const timeA = new Date(a.departureTime).getTime();
      const timeB = new Date(b.departureTime).getTime();

      if (sortBy === "price") {
        // 🚨 FIX: Dynamically grab the correct price based on cabin state
        const cabinKey = cabin?.toLowerCase() || 'economy';
        const getPrice = (f: any) => {
          if (cabinKey === 'business') return Number(f.basePriceBusiness);
          if (cabinKey.includes('first')) return Number(f.basePriceFirst);
          return Number(f.basePriceEconomy);
        };

        const priceA = getPrice(a);
        const priceB = getPrice(b);
        
        if (priceA !== priceB) return priceA - priceB;
        return timeA - timeB;
      } else {
        // "Earliest" logic
        return timeA - timeB;
      }
    });
  }, [flights, sortBy, cabin]);

// Inside your FlightSearch.tsx handleSelect or Button onClick
const handleSelect = (flight: any) => {
  // 1. Handle the first leg of a round trip (No auth check needed yet)
  if (tripType === 'round-trip' && !isSelectingReturn) {
    localStorage.setItem('selectedDepartureFlight', JSON.stringify(flight));
    setSelectedDeparture(flight);
    setIsSelectingReturn(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }

  // 2. AUTH CHECK: Before finalized selection
  if (!session) {
    const currentPath = window.location.pathname + window.location.search;
    
    // Save everything needed to reconstruct the final URL
    localStorage.setItem('pendingSelection', JSON.stringify({
      flight, // This is either the One-Way flight or the Return flight
      selectedDeparture, // This is the already selected departure (if round-trip)
      isSelectingReturn
    }));

    router.push(`/login?callbackURL=${encodeURIComponent(currentPath)}`);
    return;
  }

  // 3. Logic for authenticated users (Proceed to Seat Selection)
  proceedToSeats(flight, selectedDeparture);
};

// Extract the navigation logic to a helper to keep it DRY
// Inside FlightSearch.tsx
const proceedToSeats = (currentFlight: any, departureFlight: any) => {
  if (isSelectingReturn) {
    localStorage.setItem('selectedReturnFlight', JSON.stringify(currentFlight));
  } else {
    localStorage.setItem('selectedDepartureFlight', JSON.stringify(currentFlight));
  }

  const params = new URLSearchParams();
  
  // ---> CHANGE IS HERE: Grab .flightCode instead of .id <---
  params.append('departFlightCode', departureFlight?.flightCode || currentFlight.flightCode);
  
  if (tripType === 'round-trip') {
    params.append('returnFlightCode', currentFlight.flightCode);
  }
  
  params.append('adults', adults.toString());
  params.append('children', children.toString());
  
  router.push(`/FlightSearch/SeatSelection?${params.toString()}`);
};


const availableFlights = useMemo(() => {
  return sortedFlights.filter((flight) => {
    const cabinKey = cabin?.toLowerCase();
    let seatCategory = "ECONOMY";
    if (cabinKey === 'business') seatCategory = "BUSINESS";
    if (cabinKey === 'first class' || cabinKey === 'first') seatCategory = "FIRST";

    const availability = flight.seatAvailability?.[seatCategory];
    // Only show flights that have this cabin class configuration on the plane
    return availability && availability.total > 0;
  });
}, [sortedFlights, cabin]);
  

  return (
    <>
     <SearchHeader
  searchData={localSearch}
  onFromChange={(val) => setLocalSearch((prev) => ({ ...prev, from: val }))}
  onToChange={(val) => setLocalSearch((prev) => ({ ...prev, to: val }))}
  onDepartureChange={(val) => setLocalSearch((prev) => ({ ...prev, departure: val }))}
  onReturnChange={(val) => setLocalSearch((prev) => ({ ...prev, return: val }))}
  onTypeChange={(val) => setLocalSearch((prev) => ({ ...prev, type: val }))}
  onCabinChange={(val) => setLocalSearch((prev) => ({ ...prev, cabin: val }))}
  onAdultsChange={(val) => setLocalSearch((prev) => ({ ...prev, adults: val }))}
  onChildrenChange={(val) => setLocalSearch((prev) => ({ ...prev, children: val }))}
  onSearch={() => {
    // 1. Properly convert strings to Date objects before updating "Live" state
    const newDeparture = ensureDate(localSearch.departure);
    const newReturn = ensureDate(localSearch.return);

    // 2. Update Live States
    setAdults(localSearch.adults);
    setChildren(localSearch.children);
    setFrom(localSearch.from);
    setTo(localSearch.to);
    setDeparture(newDeparture);
    setReturnDate(newReturn);
    setTripType(localSearch.type);
    setCabin(localSearch.cabin);

    // 3. THE FIX: Treat every search click as a brand new search
    // Reset the selection UI so it doesn't stay stuck on the return leg
    setSelectedDeparture(null);
    setIsSelectingReturn(false);

    // 4. Wipe the old "ghost" selections from the browser memory
    localStorage.removeItem('selectedDepartureFlight');
    localStorage.removeItem('selectedReturnFlight');
    localStorage.removeItem('pendingSelection');
  }}
/>

      <Container size="xl" py="xl">
        <Grid gutter="xl">
          <GridCol span={{ base: 12, md: 3 }}>
            <Stack gap="xl">
              <Box>
                <Title order={4} mb="md">
                  Sort by
                </Title>
                <Stack gap="xs">
                  {["price", "earliest"].map((type) => (
                    <UnstyledButton
                      key={type}
                      onClick={() => setSortBy(type as any)}
                      p="sm"
                      style={{
                        borderRadius: "8px",
                        backgroundColor:
                          sortBy === type
                            ? "var(--mantine-color-blue-0)"
                            : "transparent",
                        border: `1px solid ${sortBy === type ? "var(--mantine-color-blue-filled)" : "#dee2e6"}`,
                      }}
                    >
                      <Group justify="space-between">
                        <Text size="sm" fw={sortBy === type ? 700 : 400}>
                          {type === "price"
                            ? "Cheapest Price"
                            : "Earliest Departure"}
                        </Text>
                        {sortBy === type && (
                          <Badge size="xs" variant="filled">
                            Active
                          </Badge>
                        )}
                      </Group>
                    </UnstyledButton>
                  ))}
                </Stack>
              </Box>
            </Stack>
          </GridCol>

          <GridCol span={{ base: 12, md: 9 }}>
            {isSelectingReturn && selectedDeparture && (
              <Paper
                withBorder
                p="md"
                mb="xl"
                bg="teal.0"
                style={{ borderLeft: "5px solid var(--mantine-color-teal-6)" }}
              >
                <Group justify="space-between">
                  <Box>
                    <Badge color="teal" variant="filled" mb={4}>
                      Departure Selected
                    </Badge>
                    <Text fw={700}>
                      {selectedDeparture.route?.origin?.city} →{" "}
                      {selectedDeparture.route?.destination?.city}
                    </Text>
                    <Text size="sm" c="dimmed">
                      {new Date(
                        selectedDeparture.departureTime,
                      ).toLocaleDateString()}{" "}
                      | THB{" "}
                      {Number(selectedDeparture.basePrice).toLocaleString()}
                    </Text>
                  </Box>
                  <Button
                    variant="subtle"
                    color="gray"
                    size="xs"
                    onClick={() => {
                      setIsSelectingReturn(false);
                      setSelectedDeparture(null);
                    }}
                  >
                    Change Departure
                  </Button>
                </Group>
              </Paper>
            )}
            <PriceStrip
              // Use a string representation for the key to avoid .getTime() crashes
              key={
                isSelectingReturn
                  ? `return-${String(returnDate)}`
                  : `dept-${String(departure)}`
              }
              // Use ensureDate to guarantee the component receives a real Date object
              startDate={ensureDate(
                isSelectingReturn
                  ? returnDate || localSearch.return
                  : departure || localSearch.departure,
              )}
              onDateChange={(date) => {
                const safeDate = ensureDate(date);
                if (isSelectingReturn) {
                  setReturnDate(safeDate);
                  setLocalSearch((prev) => ({ ...prev, return: safeDate }));
                } else {
                  setDeparture(safeDate);
                  setLocalSearch((prev) => ({ ...prev, departure: safeDate }));
                }
              }}
              prices={priceHistory}
              loading={loadingPrices}
            />

            <Title order={3} my="lg">
              {loading
                ? "Searching..."
                : isSelectingReturn
                  ? `Select return flight to ${from}`
                  : `Select departure flight to ${to}`}
            </Title>

          <Stack gap="md">
  {loading ? (
    <Center py="xl">
      <Loader size="md" />
    </Center>
  ) : (
    availableFlights.map((flight) => (
      <FlightCard
        key={flight.id}
        flight={flight}
        cabin={cabin}
        adults={adults}
        children={children}
        isSelectingReturn={isSelectingReturn}
        tripType={tripType}
        onSelect={handleSelect}
        formatLocalTime={formatLocalTime}
        formatDuration={formatDuration}
      />
    ))
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
      <Suspense
        fallback={
          <Center py="xl">
            <Loader size="xl" />
          </Center>
        }
      >
        <SearchResults />
      </Suspense>
    </main>
  );
}
