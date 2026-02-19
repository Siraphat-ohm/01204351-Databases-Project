"use client";

import { 
  Title, Group, Button, Table, Badge, Text, ActionIcon, 
  TextInput, Paper, Select, Pagination, Center, Avatar, Tooltip, Stack 
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { Search, Filter, Plus, Pencil, Trash, UserCog, ShieldCheck, MapPin } from 'lucide-react';
import { useState } from 'react';

// --- Types based on Schema ---
type Role = 'PASSENGER' | 'ADMIN' | 'PILOT' | 'CABIN_CREW' | 'GROUND_STAFF' | 'MECHANIC';
type Rank = 'CAPTAIN' | 'FIRST_OFFICER' | 'PURSER' | 'CREW' | 'MANAGER' | 'SUPERVISOR' | 'STAFF';

interface StaffProfile {
  employeeId: string;
  rank: Rank | null;
  baseAirport: { iataCode: string; city: string } | null;
}

interface User {
  id: number;
  username: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: Role;
  staffProfile: StaffProfile | null;
}

interface UserManagementProps {
  initialUsers: User[];
}

export function UserManagement({ initialUsers }: UserManagementProps) {
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

  // Helper: Formatted Name
  const getFullName = (user: User) => {
    if (user.firstName && user.lastName) return `${user.firstName} ${user.lastName}`;
    return user.username;
  };

  // Filter Logic
  const filteredUsers = initialUsers.filter(user => {
    const matchesSearch = 
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.staffProfile?.employeeId || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = roleFilter ? user.role === roleFilter : true;

    return matchesSearch && matchesRole;
  });

  const rows = filteredUsers.map((user) => (
    <Table.Tr key={user.id}>
      <Table.Td>
        <Group gap="sm">
          <Avatar radius="xl" color="blue" src={null} alt={user.username}>
            {user.username.substring(0, 2).toUpperCase()}
          </Avatar>
          <div>
            <Text size="sm" fw={500}>{getFullName(user)}</Text>
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
          <Group gap={4}>
            <Badge variant="outline" color="gray" size="sm">
              {user.staffProfile.employeeId}
            </Badge>
          </Group>
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
         {user.staffProfile?.baseAirport ? (
            <Group gap={4}>
               <MapPin size={14} color="gray" />
               <Text size="sm">{user.staffProfile.baseAirport.iataCode}</Text>
            </Group>
         ) : (
            <Text size="xs" c="dimmed">-</Text>
         )}
      </Table.Td>

      <Table.Td>
        <Group gap={4} justify="flex-end">
          <Tooltip label="Manage Roles">
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
  ));

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
            data={['ADMIN', 'PILOT', 'CABIN_CREW', 'GROUND_STAFF', 'PASSENGER']}
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
      
      <Center mt="md">
         <Pagination total={1} color="blue" />
      </Center>
    </>
  );
}