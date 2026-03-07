"use client";

import { 
  Title, Group, Button, Table, Badge, Text, ActionIcon, 
  TextInput, Paper, Modal, Stack, Pagination, Center, 
  Alert, LoadingOverlay, Box
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { Plus, Search, Trash, MapPin, Globe, Check, X, AlertTriangle, Pencil } from 'lucide-react';
import { useState, useTransition, useEffect } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';

// 🌟 Import the real server action
import { deleteAirportAction } from '@/actions/airport-actions';

export interface Airport {
  id: string; 
  iataCode: string;
  name: string;
  city: string;
  country: string;
  lat: number;
  lon: number;
}

interface AirportManagementProps {
  initialAirports: Airport[];
  totalPages: number;
  currentPage: number;
  userRole?: string;
}

export function AirportManagement({ initialAirports, totalPages, currentPage, userRole }: AirportManagementProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const isAdmin = userRole === 'ADMIN';

  // Initialize Search from URL
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  
  // Sync state if browser Back/Forward buttons are used
  useEffect(() => {
    setSearchTerm(searchParams.get('search') || '');
  }, [searchParams]);

  const [isPending, startTransition] = useTransition();

  // Delete Modal State
  const [deleteOpened, { open: openDelete, close: closeDelete }] = useDisclosure(false);
  const [airportToDelete, setAirportToDelete] = useState<Airport | null>(null);
  
  // 🌟 NEW: Track deletion errors explicitly
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // ────────────────────────────────────────────────
  // EXPLICIT SEARCH HANDLER (Wrapped in Transition)
  // ────────────────────────────────────────────────
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    
    startTransition(() => {
      const params = new URLSearchParams(searchParams);
      
      if (searchTerm.trim()) params.set('search', searchTerm.trim());
      else params.delete('search');

      params.set('page', '1'); // Always reset to page 1 on a new search

      router.push(`${pathname}?${params.toString()}`);
    });
  };

  const handlePageChange = (page: number) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams);
      params.set('page', page.toString());
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  const clearFilters = () => {
    setSearchTerm('');
    startTransition(() => router.push(pathname));
  };

  // ────────────────────────────────────────────────
  // Handlers
  // ────────────────────────────────────────────────
  const confirmDelete = async () => {
    if (!airportToDelete) return;
    
    setDeleteError(null); // Clear previous errors

    startTransition(async () => {
      const result = await deleteAirportAction(airportToDelete.id);
      
      if (result?.error) {
        // 🌟 NORMALIZE THE ERROR MESSAGE 🌟
        let friendlyError = result.error;
        
        // If the server throws the "in use" error, rewrite it completely to be helpful
        if (friendlyError.includes("in use")) {
          friendlyError = `Cannot delete ${airportToDelete.name} (${airportToDelete.iataCode}) because it is currently connected to active routes. You must delete those routes first.`;
        } 
        // Fallback: If it's a different error but still contains the ugly ID, swap it out
        else if (friendlyError.includes(airportToDelete.id)) {
          friendlyError = friendlyError.replace(airportToDelete.id, `${airportToDelete.name} (${airportToDelete.iataCode})`);
        }

        setDeleteError(friendlyError);
        notifications.show({ title: "Delete Failed", message: "See details in the modal.", color: "red", icon: <X size={18} /> });
      } else {
        notifications.show({ title: "Deleted", message: `${airportToDelete.iataCode} has been removed.`, color: "green", icon: <Check size={18} /> });
        closeDelete();
        setAirportToDelete(null);
        router.refresh();
      }
    });
  };

  const handleCloseDeleteModal = () => {
    if (isPending) return;
    closeDelete();
    setAirportToDelete(null);
    setDeleteError(null); // Wipe error when closing
  };

  // ────────────────────────────────────────────────
  // Render
  // ────────────────────────────────────────────────
  const rows = initialAirports.map((airport) => (
    <Table.Tr key={airport.id}>
      <Table.Td>
        <Badge variant="filled" color="blue" size="lg" radius="sm">
          {airport.iataCode}
        </Badge>
      </Table.Td>
      <Table.Td>
        <Text fw={500}>{airport.name}</Text>
        <Text size="xs" c="dimmed">{airport.lat.toFixed(4)}, {airport.lon.toFixed(4)}</Text>
      </Table.Td>
      <Table.Td>
        <Group gap="xs">
          <MapPin size={14} color="gray" />
          <Text size="sm">{airport.city}</Text>
        </Group>
      </Table.Td>
      <Table.Td>
        <Group gap="xs">
          <Globe size={14} color="gray" />
          <Text size="sm">{airport.country}</Text>
        </Group>
      </Table.Td>
      {isAdmin && (
        <Table.Td>
          <Group gap={4} justify="flex-end">
            {/* <ActionIcon component={Link} href={`/admin/dashboard/airports/${airport.id}/edit`} variant="subtle" color="blue">
               <Pencil size={16} />
            </ActionIcon> */}
            <ActionIcon 
              variant="subtle" 
              color="red" 
              onClick={() => { 
                setAirportToDelete(airport); 
                setDeleteError(null); // Reset error state on open
                openDelete(); 
              }}
            >
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
          <Title order={2}>Airport Management</Title>
          <Text c="dimmed" size="sm">Manage global destinations and base stations</Text>
        </div>
        {isAdmin && (
          <Button component={Link} href="/admin/dashboard/airports/create" leftSection={<Plus size={16} />}>
            Add Airport
          </Button>
        )}
      </Group>

      {/* ────────────────────────────────────────────────
          SEARCH BAR (Submit via Form)
          ──────────────────────────────────────────────── */}
      <Paper shadow="xs" p="md" mb="lg" withBorder>
        <form onSubmit={handleSearch}>
          <Group align="flex-end">
            <TextInput 
              label="Search Airports"
              placeholder="Search by IATA, Name, City or Country... (Press Enter)" 
              leftSection={<Search size={16} />} 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.currentTarget.value)}
              style={{ flex: 1 }}
              disabled={isPending}
            />
            <Button type="submit" color="blue" leftSection={<Search size={16} />} loading={isPending}>
              Search
            </Button>
            {searchParams.get('search') && (
              <Button variant="light" color="gray" onClick={clearFilters} disabled={isPending}>
                Clear
              </Button>
            )}
          </Group>
        </form>
      </Paper>

      {/* 🌟 SIMPLE, SAFE LOADING EXPERIENCE 🌟 */}
      <Paper shadow="xs" withBorder pos="relative">
        <Table.ScrollContainer minWidth={700}>
          <Table verticalSpacing="sm" striped highlightOnHover>
            <Table.Thead bg="gray.0">
              <Table.Tr>
                <Table.Th>IATA Code</Table.Th>
                <Table.Th>Airport Name</Table.Th>
                <Table.Th>City</Table.Th>
                <Table.Th>Country</Table.Th>
                {isAdmin && <Table.Th style={{ textAlign: 'right' }}>Actions</Table.Th>}
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {rows.length > 0 ? rows : (
                <Table.Tr>
                  <Table.Td colSpan={5}>
                    <Text ta="center" c="dimmed" py="xl">No airports found</Text>
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

      {/* --- DELETE CONFIRMATION MODAL --- */}
      <Modal 
        opened={deleteOpened} 
        onClose={handleCloseDeleteModal} 
        title={<Group gap="xs" c="red"><AlertTriangle size={20} /> Confirm Deletion</Group>} 
        centered
        closeButtonProps={{ disabled: isPending }}
      >
        <Stack>
          {/* 🌟 NEW: Show server errors cleanly right inside the modal */}
          {deleteError && (
            <Alert color="red" title="Cannot Delete Airport" icon={<X size={16} />}>
              {deleteError}
            </Alert>
          )}

          <Text size="sm">
            Are you sure you want to delete <strong>{airportToDelete?.name} ({airportToDelete?.iataCode})</strong>?
          </Text>
          <Alert variant="light" color="red" title="Cannot be undone" icon={<AlertTriangle size={16}/>}>
            If this airport is currently used in active flight routes, the deletion will be rejected by the server.
          </Alert>
          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={handleCloseDeleteModal} disabled={isPending}>Cancel</Button>
            <Button color="red" onClick={confirmDelete} loading={isPending} leftSection={!isPending && <Trash size={16} />}>
              Delete Airport
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Box>
  );
}