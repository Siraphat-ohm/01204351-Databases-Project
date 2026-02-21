"use client";

import { 
  Title, Group, Button, Table, Badge, Text, ActionIcon, 
  TextInput, Paper, Modal, Stack, Pagination, Center, Box, Alert, LoadingOverlay, Grid
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { Plus, Search, Trash, Check, X, AlertTriangle, ArrowRight, Gauge, Clock, MapPin, Filter } from 'lucide-react';
import { useState, useTransition, useMemo } from 'react';
import Link from 'next/link';

import { deleteRouteAction } from '@/actions/route-actions';

export interface RouteAdmin {
  id: string;
  distanceKm: number;
  durationMins: number | null;
  origin: { id: string; iataCode: string; city: string; name: string };
  destination: { id: string; iataCode: string; city: string; name: string };
  flights?: any[];
}

interface RouteManagementProps {
  initialRoutes: RouteAdmin[];
}

export function RouteManagement({ initialRoutes }: RouteManagementProps) {
  // Replace single search with Origin and Destination states
  const [originSearch, setOriginSearch] = useState('');
  const [destSearch, setDestSearch] = useState('');
  
  const [isPending, startTransition] = useTransition();

  const [deleteOpened, { open: openDelete, close: closeDelete }] = useDisclosure(false);
  const [routeToDelete, setRouteToDelete] = useState<RouteAdmin | null>(null);

  const confirmDelete = async () => {
    if (!routeToDelete) return;
    startTransition(async () => {
      const result = await deleteRouteAction(routeToDelete.id);
      if (result?.error) {
        notifications.show({ title: "Delete Failed", message: result.error, color: "red", icon: <X size={18} /> });
      } else {
        notifications.show({ title: "Deleted", message: `Route deleted successfully.`, color: "green", icon: <Check size={18} /> });
        closeDelete();
        setRouteToDelete(null);
      }
    });
  };

  // Update filter logic to handle both origin and destination independently (AND condition)
  const filteredRoutes = useMemo(() => {
    return initialRoutes.filter(route => {
      const oTerm = originSearch.toLowerCase();
      const dTerm = destSearch.toLowerCase();

      // Check if origin matches (if search is empty, it's an automatic match)
      const matchesOrigin = !oTerm || 
        route.origin.iataCode.toLowerCase().includes(oTerm) ||
        route.origin.city.toLowerCase().includes(oTerm);

      // Check if destination matches
      const matchesDest = !dTerm || 
        route.destination.iataCode.toLowerCase().includes(dTerm) ||
        route.destination.city.toLowerCase().includes(dTerm);

      // Must match BOTH conditions
      return matchesOrigin && matchesDest;
    });
  }, [initialRoutes, originSearch, destSearch]);

  const clearFilters = () => {
    setOriginSearch('');
    setDestSearch('');
  };

  const rows = filteredRoutes.map((route) => (
    <Table.Tr key={route.id}>
      <Table.Td>
        <Group gap="sm" wrap="nowrap" align="center">
          <Box w={80} style={{ textAlign: 'right' }}>
            <Text fw={700} size="md">{route.origin.iataCode}</Text>
            <Text size="xs" c="dimmed" truncate>{route.origin.city}</Text>
          </Box>
          <ArrowRight size={16} className="text-gray-400" />
          <Box w={80}>
            <Text fw={700} size="md">{route.destination.iataCode}</Text>
            <Text size="xs" c="dimmed" truncate>{route.destination.city}</Text>
          </Box>
        </Group>
      </Table.Td>
      <Table.Td>
        <Group gap="xs">
          <Gauge size={16} className="text-gray-500" />
          <Text size="sm">{route.distanceKm.toLocaleString()} km</Text>
        </Group>
      </Table.Td>
      <Table.Td>
        <Group gap="xs">
          <Clock size={16} className="text-gray-500" />
          <Text size="sm">{route.durationMins ? `${route.durationMins} mins` : '-'}</Text>
        </Group>
      </Table.Td>
      <Table.Td>
        <Badge variant="light" color={route.flights && route.flights.length > 0 ? 'blue' : 'gray'}>
          {route.flights?.length || 0} Flights
        </Badge>
      </Table.Td>
      <Table.Td>
        <Group gap={4} justify="flex-end">
          <ActionIcon variant="subtle" color="red" onClick={() => { setRouteToDelete(route); openDelete(); }}>
            <Trash size={16} />
          </ActionIcon>
        </Group>
      </Table.Td>
    </Table.Tr>
  ));

  return (
    <Box pos="relative">
      <LoadingOverlay visible={isPending} overlayProps={{ radius: "sm", blur: 2 }} />

      <Group justify="space-between" mb="lg">
        <div>
          <Title order={2}>Route Management</Title>
          <Text c="dimmed" size="sm">Manage origin and destination network pairs</Text>
        </div>
        <Button component={Link} href="/admin/dashboard/routes/create" leftSection={<Plus size={16} />}>
          Add Route
        </Button>
      </Group>

      {/* UPDATED SEARCH BAR */}
      <Paper shadow="xs" p="md" mb="lg" withBorder>
        <Group align="flex-end">
          <TextInput 
            label="Origin"
            placeholder="Search IATA or City..." 
            leftSection={<MapPin size={16} />} 
            value={originSearch}
            onChange={(e) => setOriginSearch(e.currentTarget.value)}
            style={{ flex: 1 }}
          />
          <TextInput 
            label="Destination"
            placeholder="Search IATA or City..." 
            leftSection={<MapPin size={16} />} 
            value={destSearch}
            onChange={(e) => setDestSearch(e.currentTarget.value)}
            style={{ flex: 1 }}
          />
          {(originSearch || destSearch) && (
            <Button variant="light" color="gray" onClick={clearFilters}>
              Clear
            </Button>
          )}
        </Group>
      </Paper>

      <Paper shadow="xs" withBorder>
        <Table.ScrollContainer minWidth={700}>
          <Table verticalSpacing="sm" striped highlightOnHover>
            <Table.Thead bg="gray.0">
              <Table.Tr>
                <Table.Th>Route Path</Table.Th>
                <Table.Th>Distance</Table.Th>
                <Table.Th>Est. Duration</Table.Th>
                <Table.Th>Active Operations</Table.Th>
                <Table.Th style={{ textAlign: 'right' }}>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {rows.length > 0 ? rows : (
                <Table.Tr>
                  <Table.Td colSpan={5}>
                    <Text ta="center" c="dimmed" py="xl">No routes found matching your search</Text>
                  </Table.Td>
                </Table.Tr>
              )}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      </Paper>
      
      <Center mt="md">
         <Pagination total={Math.ceil(filteredRoutes.length / 10) || 1} color="blue" />
      </Center>

      <Modal opened={deleteOpened} onClose={closeDelete} title={<Group gap="xs" c="red"><AlertTriangle size={20} /> Confirm Deletion</Group>} centered>
        <Stack>
          <Text size="sm">
            Are you sure you want to delete the route <strong>{routeToDelete?.origin.iataCode} → {routeToDelete?.destination.iataCode}</strong>?
          </Text>
          <Alert variant="light" color="red" title="Cannot be undone" icon={<AlertTriangle size={16}/>}>
            If there are currently active flights scheduled on this route, deletion will be blocked by the server.
          </Alert>
          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={closeDelete} disabled={isPending}>Cancel</Button>
            <Button color="red" onClick={confirmDelete} loading={isPending} leftSection={!isPending && <Trash size={16} />}>
              Delete Route
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Box>
  );
}