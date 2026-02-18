'use client';

import { 
  Table, Badge, Text, ActionIcon, Group, Paper, TextInput, Button, Title, Pagination, Center, Select, UnstyledButton
} from '@mantine/core';
import { Pencil, Trash, Search, Filter, Plus, PlaneTakeoff, X, ChevronUp, ChevronDown, ArrowUpAZ } from 'lucide-react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useState, useMemo } from 'react';
import { FlightWithDetails } from "@/types/flight";
import Link from 'next/link';

// Helper for status colors
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

export function FlightTable({ data, totalPages }: { data: FlightWithDetails[], totalPages: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // --- Filter States ---
  const [originSearch, setOriginSearch] = useState(searchParams.get('origin') || '');
  const [destSearch, setDestSearch] = useState(searchParams.get('destination') || '');
  const [dateSearch, setDateSearch] = useState(searchParams.get('date') || '');
  const [statusFilter, setStatusFilter] = useState<string | null>(searchParams.get('status'));

  // --- Sorting State ---
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);

  // --- Sorting Logic (Client Side) ---
  const sortedData = useMemo(() => {
    if (!sortConfig) return data;

    return [...data].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      // Extract values based on sort key (handling nested objects)
      switch (sortConfig.key) {
        case 'flightCode':
          aValue = a.flightCode;
          bValue = b.flightCode;
          break;
        case 'aircraft':
          aValue = a.aircraft.model;
          bValue = b.aircraft.model;
          break;
        case 'route':
          aValue = a.route.origin.iataCode;
          bValue = b.route.origin.iataCode;
          break;
        case 'departureTime':
          aValue = new Date(a.departureTime).getTime();
          bValue = new Date(b.departureTime).getTime();
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        default:
          return 0;
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

    if (originSearch) params.set('origin', originSearch); else params.delete('origin');
    if (destSearch) params.set('destination', destSearch); else params.delete('destination');
    if (dateSearch) params.set('date', dateSearch); else params.delete('date');
    if (statusFilter) params.set('status', statusFilter); else params.delete('status');

    router.push(`${pathname}?${params.toString()}`);
  };

  const clearFilters = () => {
    setOriginSearch('');
    setDestSearch('');
    setDateSearch('');
    setStatusFilter(null);
    router.push(pathname);
  };

  const rows = sortedData.map((flight) => (
    <Table.Tr key={flight.id}>
      <Table.Td>
        <Group gap="xs">
          <PlaneTakeoff size={14} color="var(--mantine-color-blue-6)" />
          <Text fw={700}>{flight.flightCode}</Text>
        </Group>
        <Text size="xs" c="dimmed">{flight.aircraft.model}</Text>
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
         {/* @ts-ignore: gate property is handled in Page mapping */}
         {flight.gate ? <Text size="sm">{flight.gate}</Text> : <Text size="xs" c="dimmed">-</Text>}
      </Table.Td>

      <Table.Td>
        <Group gap={4} justify="flex-end">
          <ActionIcon 
            component={Link} 
            href={`/dashboard/flights/${flight.id}/edit`}
            variant="subtle" 
            color="blue" 
            title="Edit"
          >
            <Pencil size={16} />
          </ActionIcon>
          
          <ActionIcon variant="subtle" color="red" title="Delete">
            <Trash size={16} />
          </ActionIcon>
        </Group>
      </Table.Td>
    </Table.Tr>
  ));

  return (
    <>
      <Group justify="space-between" mb="lg">
        <div>
          <Title order={2}>Flight Operations</Title>
          <Text c="dimmed" size="sm">Monitor real-time flight status</Text>
        </div>
        <Button leftSection={<Plus size={16} />}>New Flight</Button>
      </Group>

      {/* Extended Filter Section */}
      <Paper shadow="xs" p="md" mb="lg" withBorder>
        <Group align="end" gap="sm">
          <TextInput 
            label="Origin" placeholder="BKK" 
            leftSection={<Search size={16} />} 
            value={originSearch} onChange={(e) => setOriginSearch(e.currentTarget.value)}
            style={{ flex: 1, minWidth: 120 }}
          />
          <TextInput 
            label="Destination" placeholder="NRT" 
            leftSection={<Search size={16} />} 
            value={destSearch} onChange={(e) => setDestSearch(e.currentTarget.value)}
            style={{ flex: 1, minWidth: 120 }}
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
            clearable style={{ width: 160 }}
          />

          <Button variant="filled" leftSection={<Filter size={16} />} onClick={applyFilters}>
            Filter
          </Button>
          
          {(originSearch || destSearch || dateSearch || statusFilter) && (
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
            <Table.Tbody>{rows}</Table.Tbody>
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