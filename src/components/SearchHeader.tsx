'use client';

import { Group, Select, ActionIcon, Button, Paper, Container, Stack } from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { IconArrowsExchange, IconSearch, IconMapPin } from '@tabler/icons-react';
import { airportOptions, airportFilter } from '@/utils/airports';

interface SearchHeaderProps {
  searchData: any;
  onFromChange: (val: string) => void;
  onToChange: (val: string) => void;
  onDepartureChange: (val: Date | null) => void;
  onReturnChange: (val: Date | null) => void;
  onTypeChange: (val: string) => void;
  onCabinChange: (val: string) => void;
  onSearch: () => void; // <--- Make sure this is in your interface
}

export function SearchHeader({ 
  searchData, 
  onFromChange, 
  onToChange, 
  onDepartureChange, 
  onReturnChange, 
  onTypeChange, 
  onCabinChange ,
  onSearch
}: SearchHeaderProps) {
  // 1. Define "Today" at the start of the day for Depart validation
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 2. Define the minimum Return date (must be same day or after Depart)
  // If no departure is selected, default to today
  const minReturnDate = searchData.departure 
    ? new Date(searchData.departure) 
    : today;
  return (
    <Paper withBorder p="md" radius={0} bg="var(--mantine-color-gray-0)">
      <Container size="xl">
        <Stack gap="xs">
          {/* Trip Type & Cabin Selection */}
          <Group gap="xl">
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
              value={searchData.cabin.charAt(0).toUpperCase() + searchData.cabin.slice(1)}
              onChange={(val) => onCabinChange(val?.toLowerCase() || 'economy')}
              style={{ width: 150 }}
            />
          </Group>

          <Group grow align="flex-end">
            {/* Origin & Destination */}
            <Group gap={0} style={{ flex: 3 }}>
              <Select 
                label="From" 
                placeholder="City or IATA"
                data={airportOptions}
                filter={airportFilter}
                value={searchData.from}
                onChange={(val) => onFromChange(val || '')}
                searchable
                nothingFoundMessage="No airports found"
                leftSection={<IconMapPin size={16} />} 
                style={{ flex: 1 }}
              />

              <ActionIcon 
                variant="subtle" size="lg" mt={20} color="gray"
                onClick={() => {
                  const currentFrom = searchData.from;
                  const currentTo = searchData.to;
                  onFromChange(currentTo);
                  onToChange(currentFrom);
                }}
              >
                <IconArrowsExchange size={20} />
              </ActionIcon>

              <Select 
                label="To" 
                placeholder="City or IATA"
                data={airportOptions}
                filter={airportFilter}
                value={searchData.to}
                onChange={(val) => onToChange(val || '')}
                searchable
                nothingFoundMessage="No airports found"
                leftSection={<IconMapPin size={16} />} 
                style={{ flex: 1 }}
              />
            </Group>

{/* Dates */}
            <Group gap={0} style={{ flex: 2 }}>
              <DateInput 
                label="Depart" 
                placeholder="Pick date"
                value={searchData.departure}
                onChange={(val) => {
                  onDepartureChange(val);
                  // 3. Logic: If the new Depart date is AFTER the current Return date,
                  // reset or update the Return date to keep it valid.
                  if (val && searchData.return && val > searchData.return) {
                    onReturnChange(val);
                  }
                }}
                minDate={today} // 🛠️ Prevents picking past dates
                popoverProps={{ withinPortal: true }}
                style={{ flex: 1 }} 
              />
    <DateInput 
  label="Return" 
  placeholder="Pick date"
  // CHANGE THIS: Ensure it matches the key in your searchData object
  value={searchData.returnDate || searchData.return} 
  onChange={onReturnChange}
  minDate={minReturnDate} 
  popoverProps={{ withinPortal: true }}
  style={{ flex: 1 }} 
  disabled={searchData.type === 'one-way'}
/>
            </Group>

       <Button 
        onClick={onSearch} // <--- This MUST be here
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