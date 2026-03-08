"use client";

import { 
  Title, Group, Button, Table, Badge, Text, ActionIcon, 
  TextInput, Paper, Select, Modal, Stack, Alert, Avatar, Switch
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
// ✅ IMPORT ArrowLeft
import { Search, Filter, Pencil, CheckCircle, Clock, Plane, Armchair, ArrowLeft } from 'lucide-react';
import { useState, useTransition } from 'react';
import { mockUpdateTicketAction } from '@/actions/ticket-actions';
// ✅ IMPORT Link
import Link from 'next/link';

interface ClientTicket {
  id: string;
  bookingId: string;
  firstName: string;
  lastName: string;
  class: string;
  seatNumber: string | null;
  checkedIn: boolean;
  boardingPass: string | null;
}

interface FlightTicketManagementProps {
  flightId: string;
  initialTickets: ClientTicket[];
}

export function FlightTicketManagement({ flightId, initialTickets }: FlightTicketManagementProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [classFilter, setClassFilter] = useState<string | null>(null);
  
  // Modal State
  const [opened, { open, close }] = useDisclosure(false);
  const [selectedTicket, setSelectedTicket] = useState<ClientTicket | null>(null);
  
  // Mock Edit State
  const [editSeat, setEditSeat] = useState('');
  const [editCheckedIn, setEditCheckedIn] = useState(false);
  
  // Update State
  const [isPending, startTransition] = useTransition();

  // Helpers
  const getClassColor = (ticketClass: string) => {
    switch (ticketClass) {
      case 'FIRST': return 'yellow';
      case 'BUSINESS': return 'blue';
      case 'ECONOMY': return 'gray';
      default: return 'gray';
    }
  };

  const handleEditClick = (ticket: ClientTicket) => {
    setSelectedTicket(ticket);
    setEditSeat(ticket.seatNumber || '');
    setEditCheckedIn(ticket.checkedIn);
    open();
  };

  const handleMockSave = () => {
    if (!selectedTicket) return;

    startTransition(async () => {
      await mockUpdateTicketAction(selectedTicket.id, {
        seatNumber: editSeat,
        checkedIn: editCheckedIn
      });
      
      // Optimistic update for UI feel
      setSelectedTicket({ ...selectedTicket, seatNumber: editSeat, checkedIn: editCheckedIn });
      close();
    });
  };

  // Filter Logic
  const filteredTickets = initialTickets.filter(ticket => {
    const searchLower = searchTerm.toLowerCase();
    const fullName = `${ticket.firstName} ${ticket.lastName}`.toLowerCase();
    
    const matchesSearch = 
      fullName.includes(searchLower) ||
      ticket.bookingId.toLowerCase().includes(searchLower) ||
      (ticket.seatNumber || '').toLowerCase().includes(searchLower);
    
    const matchesClass = classFilter ? ticket.class === classFilter : true;

    return matchesSearch && matchesClass;
  });

  const rows = filteredTickets.map((ticket) => (
    <Table.Tr key={ticket.id}>
      <Table.Td>
        <Group gap="xs">
          <Avatar radius="xl" color="blue" size="sm">
            {ticket.firstName.charAt(0)}{ticket.lastName.charAt(0)}
          </Avatar>
          <div>
            <Text size="sm" fw={500}>{ticket.firstName} {ticket.lastName}</Text>
            <Text size="xs" c="dimmed" style={{ fontFamily: 'monospace' }}>Booking: {ticket.bookingId.substring(0,8)}</Text>
          </div>
        </Group>
      </Table.Td>

      <Table.Td>
        <Badge color={getClassColor(ticket.class)} variant="light">
          {ticket.class}
        </Badge>
      </Table.Td>

      <Table.Td>
        {ticket.seatNumber ? (
          <Badge variant="outline" color="dark" leftSection={<Armchair size={12}/>}>
            {ticket.seatNumber}
          </Badge>
        ) : (
          <Text size="xs" c="dimmed">Unassigned</Text>
        )}
      </Table.Td>

      <Table.Td>
        {ticket.checkedIn ? (
          <Badge color="green" variant="filled" leftSection={<CheckCircle size={12}/>}>Checked In</Badge>
        ) : (
          <Badge color="yellow" variant="light" leftSection={<Clock size={12}/>}>Pending</Badge>
        )}
      </Table.Td>

      <Table.Td>
        <Group gap={0} justify="flex-end">
          <Button variant="subtle" size="xs" color="blue" leftSection={<Pencil size={14} />} onClick={() => handleEditClick(ticket)}>
            Modify
          </Button>
        </Group>
      </Table.Td>
    </Table.Tr>
  ));

  return (
    <>
      <Group justify="space-between" mb="lg">
        <div>
          <Title order={2}>Flight Manifest</Title>
          <Text c="dimmed" size="sm">Flight ID: {flightId.substring(0,8)} • Passenger and ticketing details</Text>
        </div>
        {/* ✅ ADDED BACK BUTTON */}
        <Button 
          component={Link} 
          href="/admin/dashboard/flights" 
          variant="default" 
          leftSection={<ArrowLeft size={16} />}
        >
          Back to Flights
        </Button>
      </Group>

      {/* Filters */}
      <Paper shadow="xs" p="md" mb="lg" withBorder>
        <Group>
          <TextInput 
            placeholder="Search Passenger, Booking, or Seat..." 
            leftSection={<Search size={16} />} 
            style={{ flex: 1, minWidth: '250px' }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.currentTarget.value)}
          />
          <Select 
            placeholder="Ticket Class"
            data={['ECONOMY', 'BUSINESS', 'FIRST']}
            value={classFilter}
            onChange={setClassFilter}
            clearable
            leftSection={<Filter size={16} />}
            style={{ width: 180 }}
          />
        </Group>
      </Paper>

      {/* Table */}
      <Paper shadow="xs" withBorder>
        <Table.ScrollContainer minWidth={800}>
          <Table verticalSpacing="sm" striped highlightOnHover>
            <Table.Thead bg="gray.0">
              <Table.Tr>
                <Table.Th style={{ width: '35%' }}>Passenger / Booking</Table.Th>
                <Table.Th style={{ width: '15%' }}>Class</Table.Th>
                <Table.Th style={{ width: '15%' }}>Seat</Table.Th>
                <Table.Th style={{ width: '20%' }}>Status</Table.Th>
                <Table.Th style={{ width: '15%', textAlign: 'right' }}>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {rows.length > 0 ? rows : (
                <Table.Tr>
                  <Table.Td colSpan={5}>
                    <Text ta="center" c="dimmed" py="xl">No tickets found for this flight.</Text>
                  </Table.Td>
                </Table.Tr>
              )}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      </Paper>

      {/* --- MODIFY MODAL --- */}
      <Modal 
        opened={opened} 
        onClose={close} 
        title={<Group gap="xs"><Plane size={20} /><Text fw={700}>Modify Ticket</Text></Group>}
      >
        {selectedTicket && (
          <Stack>
            <Paper p="sm" bg="gray.0" radius="md">
              <Text size="sm" fw={600}>{selectedTicket.firstName} {selectedTicket.lastName}</Text>
              <Text size="xs" c="dimmed">Booking Ref: {selectedTicket.bookingId}</Text>
            </Paper>

            <TextInput 
              label="Seat Number"
              placeholder="e.g. 12A"
              value={editSeat}
              onChange={(e) => setEditSeat(e.currentTarget.value.toUpperCase())}
              description="Must match format: 1-2 digits followed by a letter (e.g. 12A)"
              disabled={isPending}
            />

            <Switch
              label="Passenger Checked In"
              checked={editCheckedIn}
              onChange={(event) => setEditCheckedIn(event.currentTarget.checked)}
              disabled={isPending}
              size="md"
            />

            <Button 
              fullWidth 
              mt="md" 
              onClick={handleMockSave} 
              loading={isPending}
            >
              Save Changes
            </Button>
          </Stack>
        )}
      </Modal>
    </>
  );
}