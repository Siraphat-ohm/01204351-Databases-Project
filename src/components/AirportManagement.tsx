"use client";

import { 
  Title, Group, Button, Table, Badge, Text, ActionIcon, 
  TextInput, Paper, Modal, Stack, Pagination, Center
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { Plus, Search, Pencil, Trash, MapPin, Building } from 'lucide-react';
import { useState } from 'react';

// Define Type based on Prisma Schema
export interface Airport {
  id: number;
  iataCode: string;
  name: string;
  city: string;
  country: string;
}

interface AirportManagementProps {
  initialAirports: Airport[];
}

export function AirportManagement({ initialAirports }: AirportManagementProps) {
  const [opened, { open, close }] = useDisclosure(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filter Logic
  const filteredAirports = initialAirports.filter(airport => 
    airport.iataCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    airport.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    airport.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
    airport.country.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const rows = filteredAirports.map((airport) => (
    <Table.Tr key={airport.id}>
      <Table.Td>
        <Group gap="xs">
          <Badge variant="filled" color="blue" size="lg" radius="sm">
            {airport.iataCode}
          </Badge>
        </Group>
      </Table.Td>
      <Table.Td>
        <Text fw={500}>{airport.name}</Text>
      </Table.Td>
      <Table.Td>
        <Group gap="xs">
          <MapPin size={14} color="gray" />
          <Text size="sm">{airport.city}</Text>
        </Group>
      </Table.Td>
      <Table.Td>
        <Text size="sm">{airport.country}</Text>
      </Table.Td>
      <Table.Td>
        <Group gap={4} justify="flex-end">
          <ActionIcon variant="subtle" color="blue" aria-label="Edit">
            <Pencil size={16} />
          </ActionIcon>
          <ActionIcon variant="subtle" color="red" aria-label="Delete">
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
          <Title order={2}>Airport Management</Title>
          <Text c="dimmed" size="sm">Manage global destinations and base stations</Text>
        </div>
        <Button leftSection={<Plus size={16} />} onClick={open}>
          Add Airport
        </Button>
      </Group>

      {/* Search Filter */}
      <Paper shadow="xs" p="md" mb="lg" withBorder>
        <TextInput 
          placeholder="Search by IATA, Name, City or Country..." 
          leftSection={<Search size={16} />} 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.currentTarget.value)}
        />
      </Paper>

      {/* Table */}
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
      
      <Center mt="md">
         <Pagination total={Math.ceil(initialAirports.length / 10)} color="blue" />
      </Center>

      {/* --- ADD MODAL --- */}
      <Modal opened={opened} onClose={close} title="Add New Airport" centered>
        <Stack>
          <TextInput 
            label="IATA Code" 
            placeholder="e.g. BKK" 
            required 
            description="3-letter International Air Transport Association code"
            maxLength={3}
            data-autofocus
          />
          
          <TextInput 
            label="Airport Name" 
            placeholder="e.g. Suvarnabhumi Airport" 
            required 
            leftSection={<Building size={16} />}
          />

          <TextInput 
            label="City" 
            placeholder="e.g. Bangkok" 
            required 
          />

          <TextInput 
            label="Country" 
            placeholder="e.g. Thailand" 
            required 
          />

          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={close}>Cancel</Button>
            <Button onClick={close}>Save Airport</Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}