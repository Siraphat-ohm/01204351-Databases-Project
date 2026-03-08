"use client";

import { 
  Title, Group, Button, Table, Badge, Text, ActionIcon, 
  TextInput, Paper, Modal, Stack, Pagination, Center, Box, Alert, LoadingOverlay
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { Plus, Trash, Check, X, AlertTriangle, ArrowRight, Gauge, Clock, MapPin, Search } from 'lucide-react';
import { useState, useTransition, useEffect } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
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
  totalPages: number;
  currentPage: number;
  userRole?: string;
}

export function RouteManagement({ initialRoutes, totalPages, currentPage, userRole }: RouteManagementProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const isAdmin = userRole === 'ADMIN';

  const [originSearch, setOriginSearch] = useState(searchParams.get('origin') || '');
  const [destSearch, setDestSearch] = useState(searchParams.get('destination') || '');
  
  useEffect(() => {
    setOriginSearch(searchParams.get('origin') || '');
    setDestSearch(searchParams.get('destination') || '');
  }, [searchParams]);

  // This handles the loading state for Deletes, Searches, AND Pagination
  const [isPending, startTransition] = useTransition();

  const [deleteOpened, { open: openDelete, close: closeDelete }] = useDisclosure(false);
  const [routeToDelete, setRouteToDelete] = useState<RouteAdmin | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // ────────────────────────────────────────────────
  // EXPLICIT SEARCH HANDLER (Wrapped in Transition)
  // ────────────────────────────────────────────────
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault(); 
    
    // 🌟 NEW: Wrap router.push in startTransition to trigger the loading overlay
    startTransition(() => {
      const params = new URLSearchParams(searchParams);
      
      if (originSearch.trim()) params.set('origin', originSearch.trim());
      else params.delete('origin');

      if (destSearch.trim()) params.set('destination', destSearch.trim());
      else params.delete('destination');

      params.set('page', '1'); 

      router.push(`${pathname}?${params.toString()}`);
    });
  };

  const handlePageChange = (page: number) => {
    // 🌟 NEW: Trigger loading state during pagination
    startTransition(() => {
      const params = new URLSearchParams(searchParams);
      params.set('page', page.toString());
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  const clearFilters = () => {
    setOriginSearch('');
    setDestSearch('');
    startTransition(() => {
      router.push(pathname);
    });
  };

  // ────────────────────────────────────────────────
  // DELETE HANDLERS
  // ────────────────────────────────────────────────
  const confirmDelete = async () => {
    if (!routeToDelete) return;
    
    setDeleteError(null);

    startTransition(async () => {
      const result = await deleteRouteAction(routeToDelete.id);
      
      if (result?.error) {
        setDeleteError(result.error);
        notifications.show({ title: "Delete Failed", message: "See details in the modal.", color: "red", icon: <X size={18} /> });
      } else {
        notifications.show({ title: "Deleted", message: `Route deleted successfully.`, color: "green", icon: <Check size={18} /> });
        closeDelete();
        setRouteToDelete(null);
      }
    });
  };

  const handleCloseDeleteModal = () => {
    if (isPending) return;
    closeDelete();
    setRouteToDelete(null);
    setDeleteError(null);
  };

  const rows = initialRoutes.map((route) => (
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
      {isAdmin && (
        <Table.Td>
          <Group gap={4} justify="flex-end">
            <ActionIcon variant="subtle" color="red" onClick={() => { 
              setRouteToDelete(route); 
              setDeleteError(null); 
              openDelete(); 
            }}>
              <Trash size={16} />
            </ActionIcon>
          </Group>
        </Table.Td>
      )}
    </Table.Tr>
  ));

  return (
    <Box>
      <Group justify="space-between" mb="lg">
        <div>
          <Title order={2}>Route Management</Title>
          <Text c="dimmed" size="sm">Manage origin and destination network pairs</Text>
        </div>
        {isAdmin && (
          <Button component={Link} href="/admin/dashboard/routes/create" leftSection={<Plus size={16} />}>
            Add Route
          </Button>
        )}
      </Group>

      <Paper shadow="xs" p="md" mb="lg" withBorder>
        <form onSubmit={handleSearch}>
          <Group align="flex-end">
            <TextInput 
              label="Origin"
              placeholder="Search IATA or City... (Press Enter)" 
              leftSection={<MapPin size={16} />} 
              value={originSearch}
              onChange={(e) => setOriginSearch(e.currentTarget.value)}
              style={{ flex: 1 }}
              disabled={isPending}
            />
            <TextInput 
              label="Destination"
              placeholder="Search IATA or City... (Press Enter)" 
              leftSection={<MapPin size={16} />} 
              value={destSearch}
              onChange={(e) => setDestSearch(e.currentTarget.value)}
              style={{ flex: 1 }}
              disabled={isPending}
            />
            <Button type="submit" color="blue" leftSection={<Search size={16} />} loading={isPending}>
              Search
            </Button>
            {(searchParams.get('origin') || searchParams.get('destination')) && (
              <Button variant="light" color="gray" onClick={clearFilters} disabled={isPending}>
                Clear
              </Button>
            )}
          </Group>
        </form>
      </Paper>

      {/* 🌟 NEW: Scoped the LoadingOverlay to the Table container with a modern animation */}
      <Paper shadow="xs" withBorder pos="relative">
        <Table.ScrollContainer minWidth={700}>
          <Table verticalSpacing="sm" striped highlightOnHover>
            <Table.Thead bg="gray.0">
              <Table.Tr>
                <Table.Th>Route Path</Table.Th>
                <Table.Th>Distance</Table.Th>
                <Table.Th>Est. Duration</Table.Th>
                <Table.Th>Active Operations</Table.Th>
                {isAdmin && <Table.Th style={{ textAlign: 'right' }}>Actions</Table.Th>}
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
      
      {totalPages > 1 && (
        <Center mt="md">
           <Pagination 
             total={totalPages} 
             value={currentPage} 
             onChange={handlePageChange}
             color="blue"
             disabled={isPending}
           />
        </Center>
      )}

      {/* ──── DELETE CONFIRMATION MODAL ───── */}
      <Modal 
        opened={deleteOpened} 
        onClose={handleCloseDeleteModal} 
        title={<Group gap="xs" c="red"><AlertTriangle size={20} /> Confirm Deletion</Group>} 
        centered
        closeButtonProps={{ disabled: isPending }}
      >
        <Stack>
          {deleteError && (
            <Alert color="red" title="Cannot Delete Route" icon={<X size={16} />}>
              {deleteError}
            </Alert>
          )}

          <Text size="sm">
            Are you sure you want to delete the route <strong>{routeToDelete?.origin.iataCode} → {routeToDelete?.destination.iataCode}</strong>?
          </Text>
          <Alert variant="light" color="red" title="Cannot be undone" icon={<AlertTriangle size={16}/>}>
            If there are currently active flights scheduled on this route, deletion will be blocked by the server.
          </Alert>
          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={handleCloseDeleteModal} disabled={isPending}>Cancel</Button>
            <Button color="red" onClick={confirmDelete} loading={isPending} leftSection={!isPending && <Trash size={16} />}>
              Delete Route
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Box>
  );
}