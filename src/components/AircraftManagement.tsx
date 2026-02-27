"use client";

import { 
  Title, Group, Button, Table, Badge, Text, ActionIcon, 
  TextInput, Paper, Modal, Select, Stack, Alert, LoadingOverlay, Center, Pagination
} from '@mantine/core';
import { useDisclosure, useSetState } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { Plus, Search, Pencil, Trash, Plane, Filter, AlertTriangle, Check, X } from 'lucide-react';
import { useState, useEffect } from 'react'; 
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AircraftStatus } from '@/generated/prisma/client'; 
import { deleteAircraftAction } from '@/actions/aircraft-actions';

interface AircraftType {
  id: string; 
  model: string;
  iataCode: string; 
  capacityEco?: number; 
  capacityBiz?: number;
}

interface Aircraft {
  id: string; 
  tailNumber: string;
  status: AircraftStatus;
  type: AircraftType;
}

interface AircraftManagementProps {
  initialAircrafts: Aircraft[]; 
  aircraftTypes: AircraftType[];
  totalPages: number;
  currentPage: number;
}

export function AircraftManagement({ initialAircrafts, aircraftTypes, totalPages, currentPage }: AircraftManagementProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Initialize Search & Filter from URL
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState<string | null>(searchParams.get('status') || null);

  // Sync state if the user uses the browser's Back/Forward buttons
  useEffect(() => {
    setSearchTerm(searchParams.get('search') || '');
    setStatusFilter(searchParams.get('status') || null);
  }, [searchParams]);

  const [deleteOpened, { open: openDelete, close: closeDelete }] = useDisclosure(false);
  const [aircraftToDelete, setAircraftToDelete] = useState<Aircraft | null>(null);
  const [deleteState, setDeleteState] = useSetState({
    isDeleting: false,
    error: null as string | null,
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':     return 'green';
      case 'MAINTENANCE': return 'orange';
      case 'RETIRED':    return 'gray';
      default:           return 'gray';
    }
  };

  // ────────────────────────────────────────────────
  // EXPLICIT SEARCH HANDLER
  // ────────────────────────────────────────────────
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault(); // Prevent page reload
    
    const params = new URLSearchParams(searchParams);
    
    if (searchTerm.trim()) params.set('search', searchTerm.trim());
    else params.delete('search');

    if (statusFilter) params.set('status', statusFilter);
    else params.delete('status');

    params.set('page', '1'); // Always reset to page 1 on a new search

    router.push(`${pathname}?${params.toString()}`);
  };

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', page.toString());
    router.push(`${pathname}?${params.toString()}`);
  };

  // ────────────────────────────────────────────────
  // Delete flow
  // ────────────────────────────────────────────────
  const handleDeleteClick = (aircraft: Aircraft) => {
    setAircraftToDelete(aircraft);
    setDeleteState({ error: null });
    openDelete();
  };

  const confirmDelete = async () => {
    if (!aircraftToDelete) return;

    setDeleteState({ isDeleting: true, error: null });

    try {
      const result = await deleteAircraftAction(aircraftToDelete.id);

      if (result?.error) {
        throw new Error(result.error);
      }

      notifications.show({
        title: "Aircraft deleted",
        message: `${aircraftToDelete.tailNumber} has been removed`,
        color: "green",
        icon: <Check size={18} />,
        autoClose: 4000,
      });

      closeDelete();
      setAircraftToDelete(null);
      router.refresh(); 

    } catch (err: any) {
      const msg = err.message || "Something went wrong. Please try again.";
      setDeleteState({ error: msg });

      notifications.show({
        title: "Deletion failed",
        message: msg,
        color: "red",
        icon: <X size={18} />,
        autoClose: 6000,
      });
    } finally {
      setDeleteState({ isDeleting: false });
    }
  };

  const handleDeleteModalClose = () => {
    if (deleteState.isDeleting) return;
    closeDelete();
    setAircraftToDelete(null);
    setDeleteState({ error: null });
  };

  // ────────────────────────────────────────────────
  // Render
  // ────────────────────────────────────────────────
  const rows = initialAircrafts.map((ac) => (
    <Table.Tr key={ac.id}>
      <Table.Td>
        <Group gap="sm">
          <Plane size={16} color="var(--mantine-color-blue-6)" />
          <Text fw={500}>{ac.tailNumber}</Text>
        </Group>
      </Table.Td>
      <Table.Td><Text size="sm">{ac.type?.model || 'Unknown'}</Text></Table.Td>
      <Table.Td>
        <Group gap={4}>
          <Badge variant="dot" color="gray">Eco: {ac.type?.capacityEco ?? 'N/A'}</Badge>
          <Badge variant="dot" color="blue">Biz: {ac.type?.capacityBiz ?? 'N/A'}</Badge>
        </Group>
      </Table.Td>
      <Table.Td>
        <Badge color={getStatusColor(ac.status)} variant="light">
          {ac.status}
        </Badge>
      </Table.Td>
      <Table.Td>
        <Group gap={0} justify="flex-end">
          <ActionIcon
            component={Link}
            href={`/admin/dashboard/aircraft/${ac.id}/edit`}
            variant="subtle"
            color="blue"
            aria-label="Edit"
          >
            <Pencil size={16} />
          </ActionIcon>

          <ActionIcon
            variant="subtle"
            color="red"
            aria-label="Delete"
            onClick={() => handleDeleteClick(ac)}
            disabled={deleteState.isDeleting}
          >
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
          <Title order={2}>Fleet Management</Title>
          <Text c="dimmed" size="sm">Manage aircraft status and fleet additions</Text>
        </div>
        <Button 
          component={Link} 
          href="/admin/dashboard/aircraft/new" 
          leftSection={<Plus size={16} />}
        >
          Add Aircraft
        </Button>
      </Group>

      {/* ────────────────────────────────────────────────
          NEW SEARCH BAR (Submit via Form)
          ──────────────────────────────────────────────── */}
      <Paper shadow="xs" p="md" mb="lg" withBorder>
        <form onSubmit={handleSearch}>
          <Group align="flex-end">
            <TextInput
              label="Search"
              placeholder="Tail Number or Model... (Press Enter)"
              leftSection={<Search size={16} />}
              style={{ flex: 1 }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.currentTarget.value)}
            />
            <Select
              label="Status"
              placeholder="All Statuses"
              data={['ACTIVE', 'MAINTENANCE', 'RETIRED']}
              value={statusFilter}
              onChange={setStatusFilter}
              clearable
              leftSection={<Filter size={16} />}
              style={{ width: 200 }}
            />
            <Button type="submit" color="blue">
              Apply Filters
            </Button>
            {/* Optional "Clear" button if search/filter exists in URL */}
            {(searchParams.get('search') || searchParams.get('status')) && (
              <Button 
                variant="default" 
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter(null);
                  router.push(pathname); // Clear URL completely
                }}
              >
                Clear
              </Button>
            )}
          </Group>
        </form>
      </Paper>

      <Paper shadow="xs" withBorder pos="relative">
        <LoadingOverlay visible={false} /> 
        <Table.ScrollContainer minWidth={700}>
          <Table verticalSpacing="sm" striped highlightOnHover layout="fixed">
            <Table.Thead bg="gray.0">
              <Table.Tr>
                <Table.Th style={{ width: '20%' }}>Tail Number</Table.Th>
                <Table.Th style={{ width: '30%' }}>Model</Table.Th>
                <Table.Th style={{ width: '25%' }}>Capacity (Seats)</Table.Th>
                <Table.Th style={{ width: '15%' }}>Status</Table.Th>
                <Table.Th style={{ width: '10%', textAlign: 'right' }}>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {rows.length > 0 ? rows : (
                <Table.Tr>
                  <Table.Td colSpan={5}>
                    <Text c="dimmed" ta="center" py="xl">No aircraft found</Text>
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

      {/* ──── DELETE CONFIRMATION ───── */}
      <Modal
        opened={deleteOpened}
        onClose={handleDeleteModalClose}
        title={
          <Group gap="xs" c="red">
            <AlertTriangle size={20} />
            Confirm Deletion
          </Group>
        }
        centered
        closeButtonProps={{ disabled: deleteState.isDeleting }}
      >
        <Stack>
          {deleteState.error && (
            <Alert color="red" title="Error" icon={<X size={16} />}>
              {deleteState.error}
            </Alert>
          )}

          <Text size="sm">
            Are you sure you want to remove aircraft{' '}
            <strong>{aircraftToDelete?.tailNumber ?? '...'}</strong>?
          </Text>

          <Alert
            variant="light"
            color="red"
            title="This cannot be undone"
            icon={<AlertTriangle size={16} />}
          >
            Flight schedules assigned to this aircraft may need reassignment.
          </Alert>

          <Group justify="flex-end" mt="lg">
            <Button
              variant="default"
              onClick={handleDeleteModalClose}
              disabled={deleteState.isDeleting}
            >
              Cancel
            </Button>

            <Button
              color="red"
              onClick={confirmDelete}
              loading={deleteState.isDeleting}
              leftSection={deleteState.isDeleting ? undefined : <Trash size={16} />}
            >
              {deleteState.isDeleting ? 'Deleting...' : 'Delete Aircraft'}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}