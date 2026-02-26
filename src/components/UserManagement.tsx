"use client";

import { 
  Title, Group, Button, Table, Badge, Text, ActionIcon, 
  TextInput, Paper, Select, Pagination, Center, Avatar, Tooltip,
  Modal, Stack, Alert
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { Search, Filter, Plus, Trash, ShieldCheck, MapPin, Check } from 'lucide-react';
import { useState, useTransition, useEffect } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

import { UserAdmin } from '@/types/user.type'; 
import { Role } from '@/generated/prisma/client';
import { adminUpdateUserRoleAction } from '@/actions/user-actions';

interface UserManagementProps {
  initialUsers: UserAdmin[];
  totalPages: number;
  currentPage: number;
}

export function UserManagement({ initialUsers, totalPages, currentPage }: UserManagementProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Initialize Search & Filter from URL
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [roleFilter, setRoleFilter] = useState<string | null>(searchParams.get('role') || null);

  // Sync state if the user uses the browser's Back/Forward buttons
  useEffect(() => {
    setSearchTerm(searchParams.get('search') || '');
    setRoleFilter(searchParams.get('role') || null);
  }, [searchParams]);

  // --- ROLE EDIT MODAL STATE ---
  const [opened, { open, close }] = useDisclosure(false);
  const [editingUser, setEditingUser] = useState<UserAdmin | null>(null);
  const [editRole, setEditRole] = useState<string>('');
  
  const [isPending, startTransition] = useTransition();
  const [updateError, setUpdateError] = useState<string | null>(null);

  // ────────────────────────────────────────────────
  // EXPLICIT SEARCH HANDLER
  // ────────────────────────────────────────────────
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault(); 
    
    const params = new URLSearchParams(searchParams);
    
    if (searchTerm.trim()) params.set('search', searchTerm.trim());
    else params.delete('search');

    if (roleFilter) params.set('role', roleFilter);
    else params.delete('role');

    params.set('page', '1'); // Always reset to page 1 on a new search

    router.push(`${pathname}?${params.toString()}`);
  };

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', page.toString());
    router.push(`${pathname}?${params.toString()}`);
  };

  // ────────────────────────────────────────────────
  // ROLE EDIT HANDLERS
  // ────────────────────────────────────────────────
  const handleEditRoleClick = (user: UserAdmin) => {
    setEditingUser(user);
    setEditRole(user.role);
    setUpdateError(null);
    open();
  };

  const handleSaveRole = () => {
    if (!editingUser) return;

    startTransition(async () => {
      const result = await adminUpdateUserRoleAction(
        editingUser.id,
        { role: editRole as Role }
      );

      if (result?.error) {
        setUpdateError(result.error);
      } else {
        close();
        router.refresh(); 
      }
    });
  };

  // Helpers
  const getRoleColor = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'red';
      case 'PILOT': return 'blue';
      case 'CABIN_CREW': return 'grape';
      case 'GROUND_STAFF': return 'orange';
      case 'MECHANIC': return 'gray';
      default: return 'gray';
    }
  };

  const getDisplayName = (user: UserAdmin) => {
    if (user.name) return user.name;
    return user.email.split('@')[0];
  };

  // ────────────────────────────────────────────────
  // RENDER ROWS (Directly from Server Payload)
  // ────────────────────────────────────────────────
  const rows = initialUsers.map((user) => {
    const displayName = getDisplayName(user);
    const location = user.staffProfile?.baseAirport || user.staffProfile?.station;

    return (
      <Table.Tr key={user.id}>
        <Table.Td>
          <Group gap="sm">
            <Avatar radius="xl" color="blue" src={user.image || null} alt={displayName}>
              {displayName.charAt(0).toUpperCase()}
            </Avatar>
            <div>
              <Text size="sm" fw={500}>{displayName}</Text>
              <Text size="xs" c="dimmed">{user.email}</Text>
            </div>
          </Group>
        </Table.Td>

        <Table.Td>
          <Badge color={getRoleColor(user.role)} variant="light">
            {user.role.replace('_', ' ')}
          </Badge>
        </Table.Td>

        <Table.Td>
          {user.staffProfile ? (
            <Badge variant="outline" color="gray" size="sm">
              {user.staffProfile.employeeId}
            </Badge>
          ) : (
            <Text size="xs" c="dimmed">-</Text>
          )}
        </Table.Td>

        <Table.Td>
          {user.staffProfile?.rank ? (
             <Text size="sm" fw={500}>{user.staffProfile.rank.replace('_', ' ')}</Text>
          ) : (
             <Text size="xs" c="dimmed">-</Text>
          )}
        </Table.Td>

        <Table.Td>
           {location ? (
              <Group gap={4}>
                 <MapPin size={14} color="gray" />
                 <Text size="sm">{location.iataCode}</Text>
              </Group>
           ) : (
              <Text size="xs" c="dimmed">-</Text>
           )}
        </Table.Td>

        <Table.Td>
          <Group gap={4} justify="flex-end">
            <Tooltip label="Manage Role">
              <ActionIcon variant="subtle" color="blue" onClick={() => handleEditRoleClick(user)}>
                <ShieldCheck size={16} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Deactivate">
              <ActionIcon variant="subtle" color="red">
                <Trash size={16} />
              </ActionIcon>
            </Tooltip>
          </Group>
        </Table.Td>
      </Table.Tr>
    );
  });

  return (
    <>
      <Group justify="space-between" mb="lg">
        <div>
          <Title order={2}>Users & Crew</Title>
          <Text c="dimmed" size="sm">Manage system access and staff profiles</Text>
        </div>
        <Button leftSection={<Plus size={16} />}>
          Add User
        </Button>
      </Group>

      {/* ────────────────────────────────────────────────
          SEARCH BAR (Submit via Form)
          ──────────────────────────────────────────────── */}
      <Paper shadow="xs" p="md" mb="lg" withBorder>
        <form onSubmit={handleSearch}>
          <Group align="flex-end">
            <TextInput 
              label="Search"
              placeholder="Name, Email, or Employee ID... (Press Enter)" 
              leftSection={<Search size={16} />} 
              style={{ flex: 1 }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.currentTarget.value)}
            />
            <Select 
              label="Role"
              placeholder="All Roles"
              data={['ADMIN', 'PILOT', 'CABIN_CREW', 'GROUND_STAFF', 'MECHANIC', 'PASSENGER']}
              value={roleFilter}
              onChange={setRoleFilter}
              clearable
              leftSection={<Filter size={16} />}
              style={{ width: 200 }}
            />
            <Button type="submit" color="blue">
              Apply Filters
            </Button>
            
            {(searchParams.get('search') || searchParams.get('role')) && (
              <Button 
                variant="default" 
                onClick={() => {
                  setSearchTerm('');
                  setRoleFilter(null);
                  router.push(pathname); 
                }}
              >
                Clear
              </Button>
            )}
          </Group>
        </form>
      </Paper>

      {/* Table */}
      <Paper shadow="xs" withBorder>
        <Table.ScrollContainer minWidth={800}>
          <Table verticalSpacing="sm" striped highlightOnHover>
            <Table.Thead bg="gray.0">
              <Table.Tr>
                <Table.Th>User Details</Table.Th>
                <Table.Th>System Role</Table.Th>
                <Table.Th>Employee ID</Table.Th>
                <Table.Th>Rank / Position</Table.Th>
                <Table.Th>Base Station</Table.Th>
                <Table.Th style={{ textAlign: 'right' }}>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {rows.length > 0 ? rows : (
                <Table.Tr>
                  <Table.Td colSpan={6}>
                    <Text ta="center" c="dimmed" py="xl">No users found</Text>
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

      {/* --- ROLE EDIT MODAL --- */}
      <Modal
        opened={opened} 
        onClose={close} 
        title={<Group gap="xs"><ShieldCheck size={20} /><Text fw={700} size="lg">Manage User Role</Text></Group>}
        centered
      >
        {editingUser && (
          <Stack>
            {updateError && (
              <Alert color="red" title="Error">
                {updateError}
              </Alert>
            )}

            <Paper p="sm" bg="gray.0" radius="md" mb="xs">
              <Text size="xs" c="dimmed" fw={600}>USER DETAILS</Text>
              <Text size="sm" fw={500}>{getDisplayName(editingUser)}</Text>
              <Text size="sm" c="dimmed">{editingUser.email}</Text>
            </Paper>

            <Select
              label="System Role"
              description="Warning: Changing a user's role alters their dashboard access."
              data={['ADMIN', 'PILOT', 'CABIN_CREW', 'GROUND_STAFF', 'MECHANIC', 'PASSENGER']}
              value={editRole}
              onChange={(val) => setEditRole(val || '')}
              allowDeselect={false}
              disabled={isPending}
            />

            <Button 
              mt="md" 
              fullWidth 
              onClick={handleSaveRole} 
              loading={isPending}
              leftSection={!isPending && <Check size={16} />}
            >
              Update Role
            </Button>
          </Stack>
        )}
      </Modal>
    </>
  );
}