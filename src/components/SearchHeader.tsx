'use client';
import { useState, useEffect } from 'react';
import { 
  Group, Select, ActionIcon, Button, Paper, Container, 
  Stack, Popover, Text, Divider, Box ,NumberInput,Loader
} from '@mantine/core';
import { DateInput } from '@mantine/dates';

// Direct imports to prevent Next.js / Tabler icon resolution errors
import { IconArrowsExchange } from '@tabler/icons-react';
import { IconSearch } from '@tabler/icons-react';
import { IconMapPin } from '@tabler/icons-react';
import { IconUsers } from '@tabler/icons-react';
import { IconPlus } from '@tabler/icons-react';
import { IconMinus } from '@tabler/icons-react';


interface SearchHeaderProps {
  searchData: any;
  onFromChange: (val: string) => void;
  onToChange: (val: string) => void;
  onDepartureChange: (val: Date | null) => void;
  onReturnChange: (val: Date | null) => void;
  onTypeChange: (val: string) => void;
  onCabinChange: (val: string) => void;
  onAdultsChange: (val: number) => void;
  onChildrenChange: (val: number) => void;
  onSearch: () => void;
}

export function SearchHeader({ 
  searchData, 
  onFromChange, 
  onToChange, 
  onDepartureChange, 
  onReturnChange, 
  onTypeChange, 
  onCabinChange,
  onAdultsChange,
  onChildrenChange,
  onSearch
}: SearchHeaderProps) {
  const [options, setOptions] = useState<{ value: string; label: string }[]>(() => {
    const initial = [];
    if (searchData.from) initial.push({ value: searchData.from, label: searchData.from });
    if (searchData.to) initial.push({ value: searchData.to, label: searchData.to });
    return initial;
  });
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const minReturnDate = searchData.departure ? new Date(searchData.departure) : today;
  useEffect(() => {
    const fetchAirports = async () => {
      if (query.length < 2) return;
      
      setLoading(true);
      try {
        const res = await fetch(`/api/v1/airports?search=${encodeURIComponent(query)}`);
        const data = await res.json();
        const formatted = data.map((ap: any) => ({
          value: ap.iataCode,
          label: `${ap.city} (${ap.iataCode}) - ${ap.name}`
        }));
        setOptions(formatted);
      } catch (err) {
        console.error("Airport fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    

    const timer = setTimeout(fetchAirports, 300);
    return () => clearTimeout(timer);
  }, [query]);
useEffect(() => {
  setOptions(prev => {
    const newOptions = [...prev];
    
    // Helper to ensure an IATA code has its full descriptive label in the dropdown list
    const syncOption = (iataCode: string) => {
      if (!iataCode) return;
      
      // If the code exists but the label is just the code, we need a better label
      const existing = newOptions.find(o => o.value === iataCode);
      
      // If it doesn't exist at all, we add it. 
      // Note: Ideally, you'd pass the full name from the parent, 
      // but this placeholder prevents the "BKK" only issue.
      if (!existing) {
        newOptions.push({ value: iataCode, label: iataCode });
      }
    };

    syncOption(searchData.from);
    syncOption(searchData.to);
    return newOptions;
  });
}, [searchData.from, searchData.to]);

  return (
    <Paper withBorder p="md" radius={0} bg="var(--mantine-color-gray-0)">
      <Container size="xl">
        <Stack gap="xs">
          {/* Trip Type & Cabin */}
          <Group gap="xl" align="flex-end">
            <Select 
              variant="unstyled" 
              data={['Round-trip', 'One-way']} 
              value={searchData.type === 'round-trip' ? 'Round-trip' : 'One-way'}
              onChange={(val) => onTypeChange(val === 'Round-trip' ? 'round-trip' : 'one-way')}
              style={{ width: 120 }}
            />
            <Select 
              variant="unstyled" 
              data={['Economy', 'Business', 'First Class']} 
              value={searchData.cabin === 'first class' ? 'First Class' : searchData.cabin.charAt(0).toUpperCase() + searchData.cabin.slice(1)}
              onChange={(val) => onCabinChange(val?.toLowerCase() || 'economy')}
              style={{ width: 150 }}
            />
            <Group gap="xl" style={{ flex: 1.5 }}>
              <NumberInput
                label="Adults"
                value={searchData.adults}
                onChange={(val) => onAdultsChange(Number(val))}
                min={1}
                max={9}
                style={{ width: 70 }}
              />
              <NumberInput
                label="Children"
                value={searchData.children}
                onChange={(val) => onChildrenChange(Number(val))}
                min={0}
                max={9}
                style={{ width: 70 }}
              />
            </Group>
          </Group>

          <Group grow align="flex-end">
            {/* Origin & Destination */}
           <Group gap={0} style={{ flex: 3 }}>
              <Select 
                label="From" 
                placeholder="Origin"
                data={options}
                value={searchData.from}
                onSearchChange={setQuery}
                onChange={(val) => onFromChange(val || '')}
                searchable
                nothingFoundMessage={loading ? 'Searching...' : 'No airports found'}
                rightSection={loading ? <Loader size="xs" /> : null}
                leftSection={<IconMapPin size={16} />} 
                style={{ flex: 1 }}
              />
<ActionIcon 
  variant="subtle" 
  size="lg" 
  mt={20} 
  color="gray"
  onClick={() => {
    // 1. Capture current values
    const currentFrom = searchData.from;
    const currentTo = searchData.to;

    // 2. Perform the swap
    onFromChange(currentTo);
    onToChange(currentFrom);
    
    // 3. IMPORTANT: Ensure the labels exist in the options array
    // We don't clear the query here because we want the labels to stay visible
  }}
>
  <IconArrowsExchange size={20} />
</ActionIcon>

              <Select 
                label="To" 
                placeholder="Destination"
                data={options}
                value={searchData.to}
                onSearchChange={setQuery}
                onChange={(val) => onToChange(val || '')}
                searchable
                nothingFoundMessage={loading ? 'Searching...' : 'No airports found'}
                rightSection={loading ? <Loader size="xs" /> : null}
                leftSection={<IconMapPin size={16} />} 
                style={{ flex: 1 }}
              />
            </Group>
            {/* Dates */}
            <Group gap={0} style={{ flex: 2 }}>
              <DateInput 
                label="Depart" 
                value={searchData.departure}
                onChange={(val) => {
                  onDepartureChange(val);
                  if (val && searchData.return && val > searchData.return) {
                    onReturnChange(val);
                  }
                }}
                minDate={today}
                style={{ flex: 1 }} 
              />
              <DateInput 
                label="Return" 
                value={searchData.returnDate || searchData.return} 
                onChange={onReturnChange}
                minDate={minReturnDate} 
                style={{ flex: 1 }} 
                disabled={searchData.type === 'one-way'}
              />
            </Group>

            

            <Button 
              onClick={onSearch} 
              leftSection={<IconSearch size={18} />}
              color="blue"
              radius="md"
            >
              Search
            </Button>
          </Group>
        </Stack>
      </Container>
    </Paper>
  );
}