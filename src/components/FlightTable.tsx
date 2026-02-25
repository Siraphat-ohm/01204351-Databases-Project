'use client';
import { useDisclosure } from '@mantine/hooks';
import { 
  Table, Badge, Text, ActionIcon, Group, Paper, TextInput, Button, Title, 
  Pagination, Center, Select, Avatar, ThemeIcon, Divider, Autocomplete, Stack, Box, Grid, Modal, Alert,Tooltip
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { notifications } from '@mantine/notifications';
import { 
  Pencil, Trash, Search, Filter, Plus, PlaneTakeoff, X, ChevronUp, 
  ChevronDown, User, Clock, ChevronRight, MapPin, Gauge, DollarSign, Plane, Calendar, AlertTriangle, Check,Ticket
} from 'lucide-react';
import { useRouter, useSearchParams, usePathname} from 'next/navigation';
import { useState, useMemo, Fragment, useTransition } from 'react';
import Link from 'next/link';
import { FlightStatus } from '@/generated/prisma/client';
import '@mantine/dates/styles.css';
import { deleteFlightAction } from '@/actions/flight-actions';

// --- Types (Fixed ID to string) ---
export interface FlightTableRow {
  id: string; 
  flightCode: string;
  status: FlightStatus;
  gate: string | null;
  departureTime: Date;
  arrivalTime: Date;
  basePrice: number;
  captainId: string | null;
  route: {
    distanceKm: number;
    durationMins: number;
    origin: { iataCode: string; city: string; name: string; country: string };
    destination: { iataCode: string; city: string; name: string; country: string };
  };
  aircraft: {
    tailNumber: string;
    model: string;
    status: string;
  };
}

const AIRPORT_SUGGESTIONS = [
  'BKK', 'DMK', 'HKT', 'CNX', 'KBV', 'HDY', 'NRT', 'HND', 'KIX', 'SIN', 
  'HKG', 'LHR', 'CDG', 'JFK', 'AER', 'KZN'
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

const getMockCaptain = (id: string | null) => {
  if (!id) return "Unassigned"; 
  const captains = ['Capt. James Maverick', 'Capt. Sarah Connor', 'Capt. Ellen Ripley', 'Capt. Han Solo'];
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash += id.charCodeAt(i);
  return captains[hash % captains.length];
};

export function FlightTable({ data, totalPages }: { data: FlightTableRow[], totalPages: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [expandedRows, setExpandedRows] = useState<string[]>([]);
  
  // Filter States
  const [flightCodeSearch, setFlightCodeSearch] = useState(searchParams.get('flightCode') || '');
  const [originSearch, setOriginSearch] = useState(searchParams.get('origin') || '');
  const [destSearch, setDestSearch] = useState(searchParams.get('destination') || '');
  
  const [dateValue, setDateValue] = useState<Date | null>(
    searchParams.get('date') ? new Date(searchParams.get('date')!) : null
  );

  const [statusFilter, setStatusFilter] = useState<string | null>(searchParams.get('status'));

  // Sorting State
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);

  const [deleteOpened, { open: openDelete, close: closeDelete }] = useDisclosure(false);
  const [flightToDelete, setFlightToDelete] = useState<FlightTableRow | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleDeleteClick = (flight: FlightTableRow, e: React.MouseEvent) => {
    e.stopPropagation(); 
    setFlightToDelete(flight);
    setDeleteError(null);
    openDelete();
  };

  const confirmDelete = () => {
    if (!flightToDelete) return;

    startDeleteTransition(async () => {
      const result = await deleteFlightAction(flightToDelete.id);
      if (result?.error) {
        setDeleteError(result.error);
      } else {
        notifications.show({
          title: "Flight Deleted",
          message: `${flightToDelete.flightCode} has been successfully removed.`,
          color: "green",
          icon: <Check size={18} />,
        });
        closeDelete();
        setFlightToDelete(null);
      }
    });
  };

  const toggleRow = (id: string) => {
    setExpandedRows((current) =>
      current.includes(id) ? current.filter((rowId) => rowId !== id) : [...current, id]
    );
  };

  const handleSort = (key: string) => {
    setSortConfig((current) => {
      if (!current || current.key !== key) return { key, direction: 'asc' };
      if (current.direction === 'asc') return { key, direction: 'desc' };
      return null;
    });
  };

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

  const SortIcon = ({ columnKey }: { columnKey: string }) => {
    if (sortConfig?.key !== columnKey) return null; 
    return sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />;
  };

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', page.toString());
    router.push(`${pathname}?${params.toString()}`);
  };

  const applyFilters = () => {
    const params = new URLSearchParams(searchParams);
    params.set('page', '1');
    if (flightCodeSearch) params.set('flightCode', flightCodeSearch); else params.delete('flightCode');
    if (originSearch) params.set('origin', originSearch); else params.delete('origin');
    if (destSearch) params.set('destination', destSearch); else params.delete('destination');
    
    if (dateValue) {
      const offset = dateValue.getTimezoneOffset();
      const localDate = new Date(dateValue.getTime() - (offset*60*1000));
      params.set('date', localDate.toISOString().split('T')[0]);
    } else {
      params.delete('date');
    }

    if (statusFilter) params.set('status', statusFilter); else params.delete('status');
    router.push(`${pathname}?${params.toString()}`);
  };

  const clearFilters = () => {
    setFlightCodeSearch(''); setOriginSearch(''); setDestSearch(''); setDateValue(null); setStatusFilter(null);
    router.push(pathname);
  };

  const rows = sortedData.map((flight) => {
    const isExpanded = expandedRows.includes(flight.id);
    return (
      <Fragment key={flight.id}>
        <Table.Tr onClick={() => toggleRow(flight.id)} style={{ cursor: 'pointer', backgroundColor: isExpanded ? 'var(--mantine-color-blue-0)' : undefined }}>
          <Table.Td>
            <Group gap="xs">
              <ThemeIcon variant="transparent" color="gray" size="xs">
                 {isExpanded ? <ChevronDown size={14}/> : <ChevronRight size={14}/>}
              </ThemeIcon>
              <PlaneTakeoff size={14} color="var(--mantine-color-blue-6)" />
              <Text fw={700}>{flight.flightCode}</Text>
            </Group>
            <Text size="xs" c="dimmed" pl={34}>{flight.aircraft?.model}</Text>
          </Table.Td>
          
          <Table.Td>
            {/* 🔒 FIX: LOCKED ROUTE COLUMN WITH FIXED WIDTHS */}
            <Group gap="sm" align="center" wrap="nowrap">
              <Box w={80} style={{ textAlign: 'right' }}>
                <Text fw={700} lh={1}>{flight.route?.origin?.iataCode}</Text>
                <Text size="xs" c="dimmed" truncate>{flight.route?.origin?.city}</Text>
              </Box>
              <Text c="dimmed">→</Text>
              <Box w={80}>
                <Text fw={700} lh={1}>{flight.route?.destination?.iataCode}</Text>
                <Text size="xs" c="dimmed" truncate>{flight.route?.destination?.city}</Text>
              </Box>
            </Group>
          </Table.Td>
          
          <Table.Td>
            <Text fw={500}>{formatTime(flight.departureTime)}</Text>
            <Text size="xs" c="dimmed">{new Date(flight.departureTime).toLocaleDateString('en-GB', { day: 'numeric', month: 'short'})}</Text>
          </Table.Td>
          <Table.Td>
            <Badge color={getStatusColor(flight.status)} variant="light" size="sm">{flight.status}</Badge>
          </Table.Td>
          <Table.Td>
             {flight.gate ? <Text size="sm">{flight.gate}</Text> : <Text size="xs" c="dimmed">-</Text>}
          </Table.Td>
          <Table.Td>
            <Group gap={4} justify="flex-end">
              {/* ✅ ADDED TICKETS BUTTON HERE */}
              <Tooltip label="View Tickets">
                <ActionIcon 
                  component={Link} 
                  href={`/admin/dashboard/flights/${flight.id}/tickets`} 
                  variant="subtle" 
                  color="grape" 
                  onClick={(e) => e.stopPropagation()}
                >
                  <Ticket size={16} />
                </ActionIcon>
              </Tooltip>

              <Tooltip label="Edit Flight">
                <ActionIcon 
                  component={Link} 
                  href={`/admin/dashboard/flights/${flight.id}/edit`} 
                  variant="subtle" 
                  color="blue" 
                  onClick={(e) => e.stopPropagation()}
                >
                  <Pencil size={16} />
                </ActionIcon>
              </Tooltip>

              <Tooltip label="Delete Flight">
                <ActionIcon 
                  variant="subtle" 
                  color="red" 
                  onClick={(e) => handleDeleteClick(flight, e)}
                >
                  <Trash size={16} />
                </ActionIcon>
              </Tooltip>
            </Group>
          </Table.Td>
        </Table.Tr>

        {isExpanded && (
          <Table.Tr>
            <Table.Td colSpan={6} p={0}>
              <Paper p="lg" bg="gray.0" radius={0} shadow="inner" withBorder style={{ borderTop: 0 }}>
                <Grid gutter="xl">
                  {/* Column 1: Detailed Route Info */}
                  <Grid.Col span={{ base: 12, md: 5 }}>
                    <Text size="xs" c="dimmed" tt="uppercase" fw={700} mb="sm">Route Details</Text>
                    <Stack gap="sm">
                      <Group align="flex-start" wrap="nowrap">
                        <ThemeIcon size="sm" color="blue" variant="light" mt={2}><MapPin size={12}/></ThemeIcon>
                        <Box>
                          <Text size="sm" fw={600}>{flight.route?.origin?.city} ({flight.route?.origin?.iataCode})</Text>
                          <Text size="xs" c="dimmed">{flight.route?.origin?.name}, {flight.route?.origin?.country}</Text>
                        </Box>
                      </Group>
                      <Box ml={11} h={16} style={{ borderLeft: '1px dashed var(--mantine-color-gray-5)' }} />
                      <Group align="flex-start" wrap="nowrap">
                        <ThemeIcon size="sm" color="orange" variant="light" mt={2}><MapPin size={12}/></ThemeIcon>
                        <Box>
                          <Text size="sm" fw={600}>{flight.route?.destination?.city} ({flight.route?.destination?.iataCode})</Text>
                          <Text size="xs" c="dimmed">{flight.route?.destination?.name}, {flight.route?.destination?.country}</Text>
                        </Box>
                      </Group>
                      <Divider my="xs" label="Stats" labelPosition="left" />
                      <Group gap="xl">
                        <Group gap="xs">
                          <Gauge size={16} className="text-gray-500" />
                          <div><Text size="xs" c="dimmed">Distance</Text><Text size="sm" fw={500}>{flight.route?.distanceKm?.toLocaleString()} km</Text></div>
                        </Group>
                        <Group gap="xs">
                          <Clock size={16} className="text-gray-500" />
                          <div><Text size="xs" c="dimmed">Duration</Text><Text size="sm" fw={500}>{flight.route?.durationMins || '-'} mins</Text></div>
                        </Group>
                      </Group>
                    </Stack>
                  </Grid.Col>
                  {/* Column 2: Aircraft */}
                  <Grid.Col span={{ base: 12, md: 4 }}>
                    <Text size="xs" c="dimmed" tt="uppercase" fw={700} mb="sm">Aircraft & Operations</Text>
                    <Stack gap="md">
                      <Group align="flex-start">
                        <Avatar color="gray" radius="sm"><Plane size={20} /></Avatar>
                        <div>
                          <Text size="sm" fw={600}>{flight.aircraft?.model}</Text>
                          <Text size="xs" c="dimmed">Tail: {flight.aircraft?.tailNumber}</Text>
                          <Badge size="xs" variant="outline" color={flight.aircraft?.status === 'ACTIVE' ? 'green' : 'red'} mt={4}>Fleet: {flight.aircraft?.status}</Badge>
                        </div>
                      </Group>
                      <Group gap="xl">
                         <div><Text size="xs" c="dimmed">Gate</Text><Text size="sm" fw={900}>{flight.gate || 'Not Assigned'}</Text></div>
                         <div><Text size="xs" c="dimmed">Arrival Time</Text><Text size="sm" fw={600}>{formatTime(flight.arrivalTime)}</Text></div>
                      </Group>
                    </Stack>
                  </Grid.Col>
                  {/* Column 3: Crew */}
                  <Grid.Col span={{ base: 12, md: 3 }}>
                    <Text size="xs" c="dimmed" tt="uppercase" fw={700} mb="sm">Crew & Ticket</Text>
                    <Stack gap="md">
                      <Group align="flex-start">
                        <Avatar color={flight.captainId ? "blue" : "gray"} radius="xl"><User size={20}/></Avatar>
                        <div>
                          <Text size="xs" c="dimmed">Captain</Text>
                          <Text size="sm" fw={600}>{flight.captainId ? getMockCaptain(flight.captainId) : "Not Assigned"}</Text>
                        </div>
                      </Group>
                      <Paper withBorder p="xs" radius="md" bg="white">
                        <Group justify="space-between">
                          <Group gap="xs"><DollarSign size={16} className="text-green-600" /><Text size="sm" c="dimmed">Base Price</Text></Group>
                          <Text fw={700} size="lg">${flight.basePrice?.toLocaleString()}</Text>
                        </Group>
                      </Paper>
                    </Stack>
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
        <Button component={Link} href="/admin/dashboard/flights/create" leftSection={<Plus size={16} />}>
          New Flight
        </Button>
      </Group>

      {/* --- SEARCH BAR --- */}
      <Paper shadow="xs" p="md" mb="lg" withBorder>
        <Group align="end" gap="sm" w="100%">
          <TextInput 
            label="Flight Code" 
            placeholder="TG101" 
            leftSection={<Search size={16} />} 
            value={flightCodeSearch} 
            onChange={(e) => setFlightCodeSearch(e.currentTarget.value)}
            style={{ flex: 1, minWidth: '110px' }} 
          />
          <Autocomplete
            label="Origin" 
            placeholder="BKK"
            data={AIRPORT_SUGGESTIONS}
            leftSection={<MapPin size={16} />}
            value={originSearch} 
            onChange={setOriginSearch}
            style={{ flex: 1, minWidth: '110px' }}
          />
          <Autocomplete
            label="Dest" 
            placeholder="NRT"
            data={AIRPORT_SUGGESTIONS}
            leftSection={<MapPin size={16} />}
            value={destSearch} 
            onChange={setDestSearch}
            style={{ flex: 1, minWidth: '110px' }}
          />
          <DatePickerInput
            label="Date"
            placeholder="Select date"
            leftSection={<Calendar size={16} />}
            value={dateValue}
            onChange={(e) => setDateValue(e ? new Date(e) : null)}
            clearable
            style={{ flex: 1, minWidth: '130px' }}
          />
          <Select
            label="Status" 
            placeholder="All"
            data={['SCHEDULED', 'BOARDING', 'DELAYED', 'DEPARTED', 'ARRIVED', 'CANCELLED']}
            value={statusFilter} 
            onChange={setStatusFilter}
            clearable 
            style={{ flex: 1, minWidth: '130px' }}
          />
          <Group justify="flex-end" gap="xs">
            {(flightCodeSearch || originSearch || destSearch || dateValue || statusFilter) && (
              <Button variant="default" color="gray" onClick={clearFilters}>
                Clear
              </Button>
            )}
            <Button variant="filled" leftSection={<Filter size={16} />} onClick={applyFilters}>
              Filter
            </Button>
          </Group>
        </Group>
      </Paper>

      <Paper shadow="xs" withBorder mb="lg">
        <Table.ScrollContainer minWidth={900}>
          <Table verticalSpacing="sm" striped highlightOnHover>
            <Table.Thead bg="gray.0">
              <Table.Tr>
                <Table.Th onClick={() => handleSort('flightCode')} style={{ cursor: 'pointer' }}><Group gap={4}>Flight / Aircraft <SortIcon columnKey="flightCode" /></Group></Table.Th>
                <Table.Th onClick={() => handleSort('route')} style={{ cursor: 'pointer', minWidth: '220px' }}><Group gap={4} ml={50}>Route <SortIcon columnKey="route" /></Group></Table.Th>
                <Table.Th onClick={() => handleSort('departureTime')} style={{ cursor: 'pointer' }}><Group gap={4}>STD <SortIcon columnKey="departureTime" /></Group></Table.Th>
                <Table.Th onClick={() => handleSort('status')} style={{ cursor: 'pointer' }}><Group gap={4}>Status <SortIcon columnKey="status" /></Group></Table.Th>
                <Table.Th>Gate</Table.Th>
                <Table.Th style={{ textAlign: 'right' }}>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>{rows.length ? rows : <Table.Tr><Table.Td colSpan={6} align="center" py="xl"><Text c="dimmed">No flights found matching your criteria</Text></Table.Td></Table.Tr>}</Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      </Paper>

      <Center>
        <Pagination total={totalPages} value={Number(searchParams.get('page')) || 1} onChange={handlePageChange} color="blue" radius="md" withEdges />
      </Center>

      {/* ──── DELETE CONFIRMATION ───── */}
      <Modal 
        opened={deleteOpened} 
        onClose={closeDelete} 
        title={<Group gap="xs" c="red"><AlertTriangle size={20} /> Confirm Flight Deletion</Group>}
        centered
      >
        <Stack>
          <Text size="sm">
            Are you sure you want to delete flight <strong>{flightToDelete?.flightCode}</strong>?
          </Text>
          
          <Alert variant="light" color="red" title="Warning" icon={<AlertTriangle size={16}/>}>
            This action cannot be undone. Associated bookings and data will be removed.
          </Alert>

          {deleteError && (
            <Alert color="red" title="Error" icon={<X size={16} />}>
              {deleteError}
            </Alert>
          )}
          
          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={closeDelete} disabled={isDeleting}>
              Cancel
            </Button>
            <Button 
              color="red" 
              onClick={confirmDelete} 
              loading={isDeleting}
            >
              Delete Flight
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}