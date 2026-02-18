'use client';

import { 
  Table, Badge, Text, ActionIcon, Group, Paper, TextInput, Button, Title, 
  Pagination, Center, Select, UnstyledButton, Grid, Avatar, ThemeIcon, 
  Divider, Autocomplete 
} from '@mantine/core';
import { 
  Pencil, Trash, Search, Filter, Plus, PlaneTakeoff, X, ChevronUp, 
  ChevronDown, User, Users, Clock, ChevronRight 
} from 'lucide-react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useState, useMemo, Fragment } from 'react';
import Link from 'next/link';
import { FlightStatus } from '@/generated/prisma/client';

// --- UI TYPE DEFINITION ---
// This matches exactly what we map in page.tsx
export interface FlightTableRow {
  id: number;
  flightCode: string;
  status: FlightStatus;
  gate: string;
  departureTime: Date;
  arrivalTime: Date;
  basePrice: number; 
  route: {
    origin: { iataCode: string; city: string };
    destination: { iataCode: string; city: string };
    durationMins: number;
  };
  aircraft: {
    tailNumber: string;
    model: string; 
  };
}

// --- MOCK AIRPORT DATA FOR AUTOCOMPLETE ---
const AIRPORT_SUGGESTIONS = [
  'BKK - Suvarnabhumi', 'DMK - Don Mueang', 'HKT - Phuket', 'CNX - Chiang Mai', 'KBV - Krabi', 
  'HDY - Hat Yai', 'NRT - Narita', 'HND - Haneda', 'KIX - Kansai', 'SIN - Changi', 
  'HKG - Hong Kong', 'LHR - Heathrow', 'CDG - Charles de Gaulle', 'JFK - John F. Kennedy',
  'AER - Sochi', 'KZN - Kazan'
];

const getStatusColor = (status: string) => {
  switch (status) {
    case 'SCHEDULED': return 'blue';
    case 'BOARDING': return 'green';
    case 'DELAYED': return 'red';
    case 'DEPARTED': return 'cyan';
    case 'ARRIVED': return 'gray';
    case 'CANCELLED': return 'dark';
    default: return 'gray';
  }
};

const formatTime = (date: Date | string) => {
  return new Intl.DateTimeFormat('en-GB', { 
    hour: '2-digit', minute: '2-digit' 
  }).format(new Date(date));
};

interface SortConfig {
  key: string;
  direction: 'asc' | 'desc';
}

// Mock Captain names since they aren't in the provided service data yet
const getMockCaptain = (id: number) => {
  const captains = ['Capt. James Maverick', 'Capt. Sarah Connor', 'Capt. Ellen Ripley', 'Capt. Han Solo', 'Capt. Jean-Luc Picard'];
  return captains[id % captains.length];
};

export function FlightTable({ data, totalPages }: { data: FlightTableRow[], totalPages: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [expandedRows, setExpandedRows] = useState<number[]>([]);

  // --- Filter States ---
  const [flightCodeSearch, setFlightCodeSearch] = useState(searchParams.get('flightCode') || '');
  
  // For Autocomplete, we might want to just store the Code part (e.g. "BKK") 
  // but display "BKK - Suvarnabhumi". For simplicity here, we use the value directly.
  const [originSearch, setOriginSearch] = useState(searchParams.get('origin') || '');
  const [destSearch, setDestSearch] = useState(searchParams.get('destination') || '');
  
  const [dateSearch, setDateSearch] = useState(searchParams.get('date') || '');
  const [statusFilter, setStatusFilter] = useState<string | null>(searchParams.get('status'));

  // --- Sorting State ---
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);

  const toggleRow = (id: number) => {
    setExpandedRows((current) =>
      current.includes(id) ? current.filter((rowId) => rowId !== id) : [...current, id]
    );
  };

  // --- Sorting Logic ---
  const sortedData = useMemo(() => {
    if (!sortConfig) return data;
    return [...data].sort((a, b) => {
      let aValue: any;
      let bValue: any;
      switch (sortConfig.key) {
        case 'flightCode': aValue = a.flightCode; bValue = b.flightCode; break;
        case 'aircraft': aValue = a.aircraft.model; bValue = b.aircraft.model; break;
        case 'route': aValue = a.route.origin.iataCode; bValue = b.route.origin.iataCode; break;
        case 'departureTime': aValue = new Date(a.departureTime).getTime(); bValue = new Date(b.departureTime).getTime(); break;
        case 'status': aValue = a.status; bValue = b.status; break;
        default: return 0;
      }
      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, sortConfig]);

  const handleSort = (key: string) => {
    setSortConfig((current) => {
      if (current?.key === key) {
        return { key, direction: current.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'asc' };
    });
  };

  const SortIcon = ({ columnKey }: { columnKey: string }) => {
    if (sortConfig?.key !== columnKey) return null;
    return sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />;
  };

  // --- Filter Logic ---
  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', page.toString());
    router.push(`${pathname}?${params.toString()}`);
  };

  const applyFilters = () => {
    const params = new URLSearchParams(searchParams);
    params.set('page', '1');

    if (flightCodeSearch) params.set('flightCode', flightCodeSearch); else params.delete('flightCode');
    
    // Extract just the IATA code if user selected "BKK - Suvarnabhumi" -> "BKK"
    const cleanOrigin = originSearch.split(' ')[0];
    const cleanDest = destSearch.split(' ')[0];

    if (cleanOrigin) params.set('origin', cleanOrigin); else params.delete('origin');
    if (cleanDest) params.set('destination', cleanDest); else params.delete('destination');
    
    if (dateSearch) params.set('date', dateSearch); else params.delete('date');
    if (statusFilter) params.set('status', statusFilter); else params.delete('status');

    router.push(`${pathname}?${params.toString()}`);
  };

  const clearFilters = () => {
    setFlightCodeSearch(''); 
    setOriginSearch(''); 
    setDestSearch(''); 
    setDateSearch(''); 
    setStatusFilter(null);
    router.push(pathname);
  };

  const rows = sortedData.map((flight) => {
    const isExpanded = expandedRows.includes(flight.id);
    return (
      <Fragment key={flight.id}>
        {/* Main Row */}
        <Table.Tr 
          onClick={() => toggleRow(flight.id)}
          style={{ cursor: 'pointer', backgroundColor: isExpanded ? 'var(--mantine-color-blue-0)' : undefined }}
        >
          <Table.Td>
            <Group gap="xs">
              <ThemeIcon variant="transparent" color="gray" size="xs">
                 {isExpanded ? <ChevronDown size={14}/> : <ChevronRight size={14}/>}
              </ThemeIcon>
              <PlaneTakeoff size={14} color="var(--mantine-color-blue-6)" />
              <Text fw={700}>{flight.flightCode}</Text>
            </Group>
            <Text size="xs" c="dimmed" pl={34}>{flight.aircraft.model}</Text>
          </Table.Td>
          <Table.Td>
            <Group gap="xs" align="center">
              <div style={{ textAlign: 'right' }}>
                <Text fw={700} lh={1}>{flight.route.origin.iataCode}</Text>
                <Text size="xs" c="dimmed">{flight.route.origin.city}</Text>
              </div>
              <Text c="dimmed">→</Text>
              <div>
                <Text fw={700} lh={1}>{flight.route.destination.iataCode}</Text>
                <Text size="xs" c="dimmed">{flight.route.destination.city}</Text>
              </div>
            </Group>
          </Table.Td>
          <Table.Td>
            <Text fw={500}>{formatTime(flight.departureTime)}</Text>
            <Text size="xs" c="dimmed">
                 {new Date(flight.departureTime).toLocaleDateString('en-GB', { day: 'numeric', month: 'short'})}
            </Text>
          </Table.Td>
          <Table.Td>
            <Badge color={getStatusColor(flight.status)} variant="light" size="sm">
              {flight.status}
            </Badge>
          </Table.Td>
          <Table.Td>
             {flight.gate ? <Text size="sm">{flight.gate}</Text> : <Text size="xs" c="dimmed">-</Text>}
          </Table.Td>
          <Table.Td>
            <Group gap={4} justify="flex-end">
              <ActionIcon 
                component={Link} 
                href={`/dashboard/flights/${flight.id}/edit`}
                variant="subtle" color="blue" title="Edit"
                onClick={(e) => e.stopPropagation()}
              >
                <Pencil size={16} />
              </ActionIcon>
              <ActionIcon variant="subtle" color="red" title="Delete" onClick={(e) => e.stopPropagation()}>
                <Trash size={16} />
              </ActionIcon>
            </Group>
          </Table.Td>
        </Table.Tr>

        {/* Expanded Details */}
        {isExpanded && (
          <Table.Tr>
            <Table.Td colSpan={6} p={0}>
              <Paper p="lg" bg="gray.0" radius={0} shadow="inner" withBorder style={{ borderTop: 0 }}>
                <Grid>
                  <Grid.Col span={4}>
                    <Group align="flex-start">
                      <Avatar color="blue" radius="xl"><User size={20}/></Avatar>
                      <div>
                        <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Captain In Command</Text>
                        <Text fw={600} size="sm">{getMockCaptain(flight.id)}</Text>
                        <Badge size="xs" variant="outline" mt={4} color="blue">Senior Pilot</Badge>
                      </div>
                    </Group>
                  </Grid.Col>
                  <Grid.Col span={4}>
                      <Group align="flex-start">
                      <ThemeIcon variant="light" color="orange" size="lg"><Users size={18}/></ThemeIcon>
                      <div>
                        <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Passenger Load</Text>
                        <Text fw={600} size="sm">142 / 180 Seats</Text>
                        <Text size="xs" c="dimmed">Economy: 120 | Business: 22</Text>
                      </div>
                    </Group>
                  </Grid.Col>
                  <Grid.Col span={4}>
                    <Group align="flex-start">
                      <ThemeIcon variant="light" color="gray" size="lg"><Clock size={18}/></ThemeIcon>
                      <div>
                        <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Duration</Text>
                        <Text fw={600} size="sm">{flight.route.durationMins || 'N/A'} Minutes</Text>
                        <Text size="xs" c="dimmed">Arrival: {formatTime(flight.arrivalTime)}</Text>
                      </div>
                    </Group>
                  </Grid.Col>
                </Grid>
              </Paper>
            </Table.Td>
          </Table.Tr>
        )}
      </Fragment>
    );
  });

  return (
    <>
      <Group justify="space-between" mb="lg">
        <div>
          <Title order={2}>Flight Operations</Title>
          <Text c="dimmed" size="sm">Monitor real-time flight status</Text>
        </div>
        <Button 
          component={Link} 
          href="/dashboard/flights/create" 
          leftSection={<Plus size={16} />}
        >
          New Flight
        </Button>
      </Group>

      {/* Extended Filter Section */}
      <Paper shadow="xs" p="md" mb="lg" withBorder>
        <Group align="end" gap="sm">
          
          <TextInput 
            label="Flight Code" placeholder="TG101" 
            leftSection={<Search size={16} />} 
            value={flightCodeSearch} onChange={(e) => setFlightCodeSearch(e.currentTarget.value)}
            style={{ width: 140 }}
          />

          <Autocomplete
            label="Origin" placeholder="BKK"
            data={AIRPORT_SUGGESTIONS}
            leftSection={<Search size={16} />}
            value={originSearch} onChange={setOriginSearch}
            style={{ width: 160 }}
          />

          <Autocomplete
            label="Dest" placeholder="NRT"
            data={AIRPORT_SUGGESTIONS}
            leftSection={<Search size={16} />}
            value={destSearch} onChange={setDestSearch}
            style={{ width: 160 }}
          />

          <TextInput
            label="Date" type="date"
            value={dateSearch} onChange={(e) => setDateSearch(e.currentTarget.value)}
            style={{ width: 140 }}
          />
          
          <Select
            label="Status" placeholder="Status"
            data={['SCHEDULED', 'BOARDING', 'DELAYED', 'DEPARTED', 'ARRIVED', 'CANCELLED']}
            value={statusFilter} onChange={setStatusFilter}
            clearable style={{ width: 150 }}
          />

          <Button variant="filled" leftSection={<Filter size={16} />} onClick={applyFilters}>
            Filter
          </Button>
          
          {(flightCodeSearch || originSearch || destSearch || dateSearch || statusFilter) && (
             <Button variant="subtle" color="red" onClick={clearFilters} leftSection={<X size={16}/>}>
               Clear
             </Button>
          )}
        </Group>
      </Paper>

      <Paper shadow="xs" withBorder mb="lg">
        <Table.ScrollContainer minWidth={800}>
          <Table verticalSpacing="sm" striped highlightOnHover>
            <Table.Thead bg="gray.0">
              <Table.Tr>
                <Table.Th onClick={() => handleSort('flightCode')} style={{ cursor: 'pointer' }}>
                  <Group gap={4}>Flight / Aircraft <SortIcon columnKey="flightCode" /></Group>
                </Table.Th>
                <Table.Th onClick={() => handleSort('route')} style={{ cursor: 'pointer' }}>
                  <Group gap={4}>Route <SortIcon columnKey="route" /></Group>
                </Table.Th>
                <Table.Th onClick={() => handleSort('departureTime')} style={{ cursor: 'pointer' }}>
                  <Group gap={4}>STD <SortIcon columnKey="departureTime" /></Group>
                </Table.Th>
                <Table.Th onClick={() => handleSort('status')} style={{ cursor: 'pointer' }}>
                  <Group gap={4}>Status <SortIcon columnKey="status" /></Group>
                </Table.Th>
                <Table.Th>Gate</Table.Th>
                <Table.Th style={{ textAlign: 'right' }}>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {rows.length > 0 ? rows : (
                <Table.Tr>
                  <Table.Td colSpan={6} align="center" py="xl">
                    <Text c="dimmed">No flights found matching your criteria</Text>
                  </Table.Td>
                </Table.Tr>
              )}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      </Paper>

      <Center>
        <Pagination 
          total={totalPages} 
          value={Number(searchParams.get('page')) || 1} 
          onChange={handlePageChange} 
          color="blue"
          radius="md"
          withEdges
        />
      </Center>
    </>
  );
}