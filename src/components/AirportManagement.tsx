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

// import { deleteAirportAction } from '@/actions/airport-actions'; // Uncomment when ready

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
}

export function AirportManagement({ initialAirports, totalPages, currentPage }: AirportManagementProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Initialize Search from URL
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [isPending, startTransition] = useTransition();

  // Delete Modal State
  const [deleteOpened, { open: openDelete, close: closeDelete }] = useDisclosure(false);
  const [airportToDelete, setAirportToDelete] = useState<Airport | null>(null);

  // ────────────────────────────────────────────────
  // URL Sync for Search (Debounced)
  // ────────────────────────────────────────────────
  useEffect(() => {
    const handler = setTimeout(() => {
      const params = new URLSearchParams(searchParams);
      
      if (searchTerm) params.set('search', searchTerm);
      else params.delete('search');

      // Reset to page 1 if searching
      if (searchTerm !== (searchParams.get('search') || '') && currentPage !== 1) {
         params.set('page', '1');
      }

      router.push(`${pathname}?${params.toString()}`);
    }, 400); // 400ms debounce

    return () => clearTimeout(handler);
  }, [searchTerm, pathname, router, searchParams, currentPage]);

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', page.toString());
    router.push(`${pathname}?${params.toString()}`);
  };

  // ────────────────────────────────────────────────
  // Handlers
  // ────────────────────────────────────────────────
  const confirmDelete = async () => {
    if (!airportToDelete) return;
    
    startTransition(async () => {
      // const result = await deleteAirportAction(airportToDelete.id);
      const result = { error: null }; // Mock result
      
      if (result?.error) {
        notifications.show({ title: "Delete Failed", message: result.error, color: "red", icon: <X size={18} /> });
      } else {
        notifications.show({ title: "Deleted", message: `${airportToDelete.iataCode} has been removed.`, color: "green", icon: <Check size={18} /> });
        closeDelete();
        setAirportToDelete(null);
        router.refresh();
      }
    });
  };

  // ────────────────────────────────────────────────
  // Render (No client-side filter needed!)
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
      <Table.Td>
        <Group gap={4} justify="flex-end">
          <ActionIcon component={Link} href={`/admin/dashboard/airports/${airport.id}/edit`} variant="subtle" color="blue">
             <Pencil size={16} />
          </ActionIcon>
          <ActionIcon variant="subtle" color="red" onClick={() => { setAirportToDelete(airport); openDelete(); }}>
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
          <Title order={2}>Airport Management</Title>
          <Text c="dimmed" size="sm">Manage global destinations and base stations</Text>
        </div>
        <Button component={Link} href="/admin/dashboard/airports/create" leftSection={<Plus size={16} />}>
          Add Airport
        </Button>
      </Group>

      <Paper shadow="xs" p="md" mb="lg" withBorder>
        <TextInput 
          placeholder="Search by IATA, Name, City or Country..." 
          leftSection={<Search size={16} />} 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.currentTarget.value)}
        />
      </Paper>

      <Paper shadow="xs" withBorder>
        <Table.ScrollContainer minWidth={700}>
          <Table verticalSpacing="sm" striped highlightOnHover>
            <Table.Thead bg="gray.0">
              <Table.Tr>
                <Table.Th>IATA Code</Table.Th>
                <Table.Th>Airport Name</Table.Th>
                <Table.Th>City</Table.Th>
                <Table.Th>Country</Table.Th>
                <Table.Th style={{ textAlign: 'right' }}>Actions</Table.Th>
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
           />
        </Center>
      )}

      {/* --- DELETE CONFIRMATION MODAL --- */}
      <Modal opened={deleteOpened} onClose={closeDelete} title={<Group gap="xs" c="red"><AlertTriangle size={20} /> Confirm Deletion</Group>} centered>
        <Stack>
          <Text size="sm">
            Are you sure you want to delete <strong>{airportToDelete?.name} ({airportToDelete?.iataCode})</strong>?
          </Text>
          <Alert variant="light" color="red" title="Cannot be undone" icon={<AlertTriangle size={16}/>}>
            If this airport is currently used in active flight routes, the deletion will be rejected by the server.
          </Alert>
          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={closeDelete} disabled={isPending}>Cancel</Button>
            <Button color="red" onClick={confirmDelete} loading={isPending} leftSection={!isPending && <Trash size={16} />}>
              Delete Airport
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Box>
  );
}