'use client';

import { useState,useEffect } from 'react';
import { 
  Paper, Radio, Group, Select, Button, Stack, NumberInput, Popover, Text, Loader 
} from '@mantine/core';
import { useRouter } from 'next/navigation';
import { DateInput } from '@mantine/dates';
import { IconPlaneDeparture, IconPlaneArrival, IconUsers } from '@tabler/icons-react';

import '@mantine/dates/styles.css';

export function FlightSearchBox() {
  const router = useRouter();
  
  const [tripType, setTripType] = useState<string>('one-way');
  const [from, setFrom] = useState<string | null>(null);
  const [to, setTo] = useState<string | null>(null);
  const [departureDate, setDepartureDate] = useState<Date | null>(null);
  const [returnDate, setReturnDate] = useState<Date | null>(null);
  const [adults, setAdults] = useState<number | string>(1);
  const [children, setChildren] = useState<number | string>(0);
  const [errors, setErrors] = useState<{ [key: string]: boolean }>({});
  const [airportOptions, setAirportOptions] = useState<{ value: string; label: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  useEffect(() => {
    const fetchAirports = async () => {
      if (searchValue.length < 2) {
        setAirportOptions([]);
        return;
      }

      setLoading(true);
      try {
        const res = await fetch(`/api/v1/airports?search=${encodeURIComponent(searchValue)}`);
        const data = await res.json();
        
        // Map Prisma data to Mantine Select format
        const formatted = data.map((ap: any) => ({
          value: ap.iataCode,
          label: `${ap.city} (${ap.iataCode}) - ${ap.name}`
        }));
        
        setAirportOptions(formatted);
      } catch (error) {
        console.error("Failed to fetch airports", error);
      } finally {
        setLoading(false);
      }
    };

    // Simple debounce to avoid spamming the API
    const timeoutId = setTimeout(fetchAirports, 300);
    return () => clearTimeout(timeoutId);
  }, [searchValue]);
  

  const getMinReturnDate = () => {
    if (!departureDate) return new Date();
    const nextDay = new Date(departureDate);
    nextDay.setDate(nextDay.getDate() + 1);
    return nextDay;
  };

 const handleSearch = () => {
  // 1. Validation Logic
  const newErrors: { [key: string]: boolean } = {
    from: !from,
    to: !to,
    departureDate: !departureDate,
    returnDate: tripType === 'round-trip' && !returnDate,
  };

  setErrors(newErrors);
  if (Object.values(newErrors).some((v) => v)) return;

  // 2. THE FIX: Safety Helper Function
  const safeISO = (dateValue: any) => {
    if (!dateValue) return '';
    
    // If it's already a Date object, use it
    if (dateValue instanceof Date && !isNaN(dateValue.getTime())) {
      return dateValue.toISOString();
    }

    // If it's a string, convert it to a Date first
    const parsedDate = new Date(dateValue);
    if (!isNaN(parsedDate.getTime())) {
      return parsedDate.toISOString();
    }

    return '';
  };

  // 3. Use the helper for both dates
  const params = new URLSearchParams({
    from: from || '',
    to: to || '',
    type: tripType,
    departure: safeISO(departureDate), 
    return: safeISO(returnDate),
    adults: adults.toString(),   // Added
    children: children.toString(), // Added
    cabin: 'economy'
  });

  router.push(`/FlightSearch?${params.toString()}`);
};

  return (
    <Paper withBorder p="xl" radius="md" shadow="md" style={{ maxWidth: '500px' }}>
      <Stack gap="md">
        <Radio.Group value={tripType} onChange={setTripType} label="Select trip type">
          <Group mt="xs">
            <Radio value="one-way" label="One way" />
            <Radio value="round-trip" label="Round trip" />
          </Group>
        </Radio.Group>

       <Group grow>
          <Select
            label="From"
            placeholder="Search city or IATA"
            data={airportOptions}
            searchable
            onSearchChange={setSearchValue}
            rightSection={loading ? <Loader size="xs" /> : null}
            leftSection={<IconPlaneDeparture size={16} />}
            value={from}
            onChange={setFrom}
            error={errors.from}
            // Ensure the value stays in the list even if it's not in the current search results
            nothingFoundMessage="No airports found"
          />
          
          <Select
            label="To"
            placeholder="Search city or IATA"
            data={airportOptions}
            searchable
            onSearchChange={setSearchValue}
            rightSection={loading ? <Loader size="xs" /> : null}
            leftSection={<IconPlaneArrival size={16} />}
            value={to}
            onChange={setTo}
            error={errors.to}
            nothingFoundMessage="No airports found"
          />
        </Group>

        <Group grow>
     <DateInput 
  label="Departure Date" 
  placeholder="Pick date" 
  value={departureDate}
  minDate={new Date()} 
  onChange={(val: Date | null) => { // Added explicit type here
    setDepartureDate(val);
    // Safety check: if the new departure is after the existing return, reset return
    if (val && returnDate && returnDate <= val) {
      setReturnDate(null);
    }
  }}
  error={errors.departureDate}
/>
          {tripType === 'round-trip' && (
            <DateInput 
              label="Return Date" 
              placeholder="Pick date" 
              value={returnDate}
              minDate={getMinReturnDate()} 
              disabled={!departureDate}
              onChange={(e) => setReturnDate(e? new Date(e) : null)}
              error={errors.returnDate}
            />
          )}
        </Group>

        <Popover width={300} trapFocus position="bottom" withArrow shadow="md">
          <Popover.Target>
            <Button variant="outline" leftSection={<IconUsers size={16} />} color="gray" fullWidth>
              Passengers: {Number(adults) + Number(children)}
            </Button>
          </Popover.Target>
          <Popover.Dropdown>
            <Stack gap="sm">
              <Group justify="space-between">
                <Text size="sm" fw={500}>Adults</Text>
                  <NumberInput value={adults} onChange={setAdults} min={1} max={9} size="xs" />

              </Group>

              <Group justify="space-between">

                <Text size="sm" fw={500}>Children</Text>

                <NumberInput value={children} onChange={setChildren} min={0} max={9} size="xs" />
              </Group>
            </Stack>
          </Popover.Dropdown>
        </Popover>

        <Button fullWidth size="md" color="blue" onClick={handleSearch}>
          Search Flights
        </Button>
      </Stack>
    </Paper>
  );
}