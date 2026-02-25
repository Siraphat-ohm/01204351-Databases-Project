"use client";

import { 
  Title, Group, Button, Table, Badge, Text, ActionIcon, 
  TextInput, Paper, Select, Pagination, Center, Avatar, Tooltip 
} from '@mantine/core';
import { Search, Filter, Plus, Pencil, Trash, ShieldCheck, MapPin } from 'lucide-react';
import { useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

// ✅ IMPORT YOUR REAL TYPES HERE
import { UserAdmin } from '@/types/user.type'; 

interface UserManagementProps {
  initialUsers: UserAdmin[];
  totalPages: number;
  currentPage: number;
}

export function UserManagement({ initialUsers, totalPages, currentPage }: UserManagementProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Local state for client-side filtering of the CURRENT page
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string | null>(null);

  // Helper: Role Colors
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

  // Helper: Formatted Name (Fall back to email prefix if name is missing)
  const getDisplayName = (user: UserAdmin) => {
    if (user.name) return user.name;
    return user.email.split('@')[0];
  };

  // Pagination Handler
  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', page.toString());
    router.push(`${pathname}?${params.toString()}`);
  };

  // Filter Logic (Client-side on current page data)
  const filteredUsers = initialUsers.filter(user => {
    const searchLower = searchTerm.toLowerCase();
    
    const matchesSearch = 
      (user.name || '').toLowerCase().includes(searchLower) ||
      user.email.toLowerCase().includes(searchLower) ||
      (user.staffProfile?.employeeId || '').toLowerCase().includes(searchLower);
    
    const matchesRole = roleFilter ? user.role === roleFilter : true;

    return matchesSearch && matchesRole;
  });

  const rows = filteredUsers.map((user) => {
    const displayName = getDisplayName(user);
    
    // Determine the relevant location (baseAirport or station)
    const location = user.staffProfile?.baseAirport || user.staffProfile?.station;

    return (
      <Table.Tr key={user.id}>
        <Table.Td>
          <Group gap="sm">
            {/* ✅ Uses Real Image if available, otherwise uses initials */}
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
              <ActionIcon variant="subtle" color="blue">
                <ShieldCheck size={16} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Edit Profile">
              <ActionIcon variant="subtle" color="gray">
                <Pencil size={16} />
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

      {/* Filters */}
      <Paper shadow="xs" p="md" mb="lg" withBorder>
        <Group>
          <TextInput 
            placeholder="Search Name, Email, or Employee ID..." 
            leftSection={<Search size={16} />} 
            style={{ flex: 1 }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.currentTarget.value)}
          />
          <Select 
            placeholder="Filter Role"
            data={['ADMIN', 'PILOT', 'CABIN_CREW', 'GROUND_STAFF', 'MECHANIC', 'PASSENGER']}
            value={roleFilter}
            onChange={setRoleFilter}
            clearable
            leftSection={<Filter size={16} />}
            style={{ width: 200 }}
          />
        </Group>
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
      
      {/* Real Pagination */}
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
    </>
  );
}