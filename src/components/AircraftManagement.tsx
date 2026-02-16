"use client";

import { 
  Title, Group, Button, Table, Badge, Text, ActionIcon, 
  TextInput, Paper, Modal, Select, NumberInput, Stack 
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { Plus, Search, Pencil, Trash, Plane, Settings } from 'lucide-react';
import { useState } from 'react';

// --- Types based on your Prisma Schema ---
type AircraftStatus = 'ACTIVE' | 'MAINTENANCE' | 'RETIRED';

interface AircraftType {
  id: number;
  model: string;
  capacityEco: number;
  capacityBiz: number;
}

interface Aircraft {
  id: number;
  tailNumber: string;
  status: AircraftStatus;
  type: AircraftType; // Nested relation
}

interface AircraftManagementProps {
  initialAircrafts: Aircraft[];
  aircraftTypes: AircraftType[]; // For the dropdown
}

export  function AircraftManagement({ initialAircrafts, aircraftTypes }: AircraftManagementProps) {
  const [opened, { open, close }] = useDisclosure(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Helper: Status Colors
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'green';
      case 'MAINTENANCE': return 'orange';
      case 'RETIRED': return 'gray';
      default: return 'gray';
    }
  };

  // Filter Logic
  const filteredAircrafts = initialAircrafts.filter(ac => 
    ac.tailNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ac.type.model.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const rows = filteredAircrafts.map((ac) => (
    <Table.Tr key={ac.id}>
      <Table.Td>
        <Group gap="sm">
          <Plane size={16} color="var(--mantine-color-blue-6)" />
          <Text fw={500}>{ac.tailNumber}</Text>
        </Group>
      </Table.Td>
      <Table.Td>
        <Text size="sm">{ac.type.model}</Text>
      </Table.Td>
      <Table.Td>
        <Group gap={4}>
           <Badge variant="dot" color="gray">Eco: {ac.type.capacityEco}</Badge>
           <Badge variant="dot" color="blue">Biz: {ac.type.capacityBiz}</Badge>
        </Group>
      </Table.Td>
      <Table.Td>
        <Badge color={getStatusColor(ac.status)} variant="light">
          {ac.status}
        </Badge>
      </Table.Td>
      <Table.Td>
        <Group gap={0} justify="flex-end">
          <ActionIcon variant="subtle" color="gray">
            <Pencil size={16} />
          </ActionIcon>
          <ActionIcon variant="subtle" color="red">
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
        <Button leftSection={<Plus size={16} />} onClick={open}>
          Add Aircraft
        </Button>
      </Group>

      {/* Filters */}
      <Paper shadow="xs" p="md" mb="lg" withBorder>
        <Group>
          <TextInput 
            placeholder="Search Tail Number or Model..." 
            leftSection={<Search size={16} />} 
            style={{ flex: 1 }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.currentTarget.value)}
          />
        </Group>
      </Paper>

      {/* Table */}
      <Paper shadow="xs" withBorder>
        <Table.ScrollContainer minWidth={700}>
          <Table verticalSpacing="sm" striped highlightOnHover>
            <Table.Thead bg="gray.0">
              <Table.Tr>
                <Table.Th>Tail Number</Table.Th>
                <Table.Th>Model</Table.Th>
                <Table.Th>Capacity (Seats)</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th style={{ textAlign: 'right' }}>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>{rows}</Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      </Paper>

      {/* --- ADD MODAL --- */}
      <Modal opened={opened} onClose={close} title="Add New Aircraft" centered>
        <Stack>
          <TextInput 
            label="Tail Number" 
            placeholder="e.g., HS-TBA" 
            required 
            description="Must be unique"
          />
          
          <Select 
            label="Aircraft Model"
            placeholder="Select model"
            data={aircraftTypes.map(t => ({ value: t.id.toString(), label: t.model }))}
            searchable
            required
          />

          <Select 
            label="Initial Status"
            defaultValue="ACTIVE"
            data={['ACTIVE', 'MAINTENANCE', 'RETIRED']}
          />

          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={close}>Cancel</Button>
            <Button onClick={close}>Save Aircraft</Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}