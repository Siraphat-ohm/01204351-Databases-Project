'use client';

import { useState } from 'react';
import { 
  Paper, Radio, Group, Select, Button, Stack, NumberInput, Popover, Text 
} from '@mantine/core';
import { useRouter } from 'next/navigation';
import { DateInput } from '@mantine/dates';
import { IconPlaneDeparture, IconPlaneArrival, IconUsers } from '@tabler/icons-react';
import { airportOptions, airportFilter } from '@/utils/airports'; // 1. Use your real data
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
            placeholder="Origin"
            data={airportOptions} // 2. Real Airport Data
            filter={airportFilter} // 3. Smart Filter (IATA/City)
            leftSection={<IconPlaneDeparture size={16} />}
            searchable
            value={from}
            onChange={setFrom}
            error={errors.from}
          />
          <Select
            label="To"
            placeholder="Destination"
            data={airportOptions}
            filter={airportFilter}
            leftSection={<IconPlaneArrival size={16} />}
            searchable
            value={to}
            onChange={setTo}
            error={errors.to}
          />
        </Group>

        <Group grow>
          <DateInput 
            label="Departure Date" 
            placeholder="Pick date" 
            value={departureDate}
            minDate={new Date()} 
            onChange={(val) => {
              console.log("Selected Date:", val);
              setDepartureDate(val);
              if (returnDate && val && returnDate <= val) setReturnDate(null);
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
              onChange={setReturnDate}
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