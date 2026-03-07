"use client";

import { 
  Title, Group, Button, Table, Badge, Text, ActionIcon, 
  TextInput, Paper, Select, Pagination, Center, Avatar, Tooltip
} from '@mantine/core';
import { Search, Filter, Eye, X, Check, Ticket, User as UserIcon } from 'lucide-react';
import { useState } from 'react';

// --- Types based on your Prisma Schema ---
type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED';
type TicketClass = 'ECONOMY' | 'BUSINESS' | 'FIRST_CLASS';

interface Booking {
  id: number;
  bookingRef: string; // PNR
  status: BookingStatus;
  totalPrice: number;
  createdAt: Date;
  user: {
    username: string;
    email: string;
  };
  flight: {
    flightCode: string;
    departureTime: Date;
    route: {
      origin: { iataCode: string };
      destination: { iataCode: string };
    };
  };
  _count: {
    tickets: number; // Count of passengers
  };
}

interface BookingTableProps {
  initialBookings: Booking[];
  userRole?: string;
}

export function BookingTable({ initialBookings, userRole }: BookingTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  const isAdmin = userRole === 'ADMIN';

  // Helper: Status Colors
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CONFIRMED': return 'green';
      case 'PENDING': return 'yellow';
      case 'CANCELLED': return 'red';
      default: return 'gray';
    }
  };

  // Helper: Date Format
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-GB', {
      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
    }).format(new Date(date));
  };

  // Filter Logic
  const filteredBookings = initialBookings.filter(booking => {
    const matchesSearch = 
      booking.bookingRef.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.flight.flightCode.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter ? booking.status === statusFilter : true;

    return matchesSearch && matchesStatus;
  });

  const rows = filteredBookings.map((booking) => (
    <Table.Tr key={booking.id}>
      <Table.Td>
        <Group gap="xs">
          <Ticket size={16} color="var(--mantine-color-blue-6)" />
          <Text fw={700} ff="monospace">{booking.bookingRef}</Text>
        </Group>
      </Table.Td>
      
      <Table.Td>
        <Group gap="sm">
          <Avatar size="sm" radius="xl" color="blue">
            {booking.user.username.substring(0, 2).toUpperCase()}
          </Avatar>
          <div>
            <Text size="sm" fw={500}>{booking.user.username}</Text>
            <Text size="xs" c="dimmed">{booking.user.email}</Text>
          </div>
        </Group>
      </Table.Td>

      <Table.Td>
        <div>
          <Text size="sm" fw={600}>{booking.flight.flightCode}</Text>
          <Text size="xs" c="dimmed">
            {booking.flight.route.origin.iataCode} → {booking.flight.route.destination.iataCode}
          </Text>
        </div>
      </Table.Td>

      <Table.Td>
        <Text size="sm">{formatDate(booking.createdAt)}</Text>
      </Table.Td>

      <Table.Td>
        <Badge variant="light" color="gray">
          {booking._count.tickets} Pax
        </Badge>
      </Table.Td>

      <Table.Td>
        <Text fw={500}>${booking.totalPrice.toLocaleString()}</Text>
      </Table.Td>

      <Table.Td>
        <Badge color={getStatusColor(booking.status)} variant="light">
          {booking.status}
        </Badge>
      </Table.Td>

      {isAdmin && (
        <Table.Td>
          <Group gap={4} justify="flex-end">
            <Tooltip label="View Details">
              <ActionIcon variant="subtle" color="blue" onClick={() => alert(`View details for ${booking.bookingRef}`)}>
                <Eye size={16} />
              </ActionIcon>
            </Tooltip>
            {booking.status === 'PENDING' && (
              <>
                <ActionIcon variant="subtle" color="green" title="Confirm">
                  <Check size={16} />
                </ActionIcon>
                <ActionIcon variant="subtle" color="red" title="Cancel">
                  <X size={16} />
                </ActionIcon>
              </>
            )}
          </Group>
        </Table.Td>
      )}
    </Table.Tr>
  ));

  return (
    <>
      <Group justify="space-between" mb="lg">
        <div>
          <Title order={2}>Bookings & Reservations</Title>
          <Text c="dimmed" size="sm">Manage passenger tickets and flight reservations</Text>
        </div>
        {isAdmin && (
          <Button leftSection={<Ticket size={16} />}>
            New Booking
          </Button>
        )}
      </Group>

      {/* Filters */}
      <Paper shadow="xs" p="md" mb="lg" withBorder>
        <Group>
          <TextInput 
            placeholder="Search PNR, Email, or Flight Code..." 
            leftSection={<Search size={16} />} 
            style={{ flex: 1 }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.currentTarget.value)}
          />
          <Select 
            placeholder="Filter Status"
            data={['CONFIRMED', 'PENDING', 'CANCELLED']}
            value={statusFilter}
            onChange={setStatusFilter}
            clearable
            leftSection={<Filter size={16} />}
            style={{ width: 200 }}
          />
        </Group>
      </Paper>

      {/* Table */}
      <Paper shadow="xs" withBorder>
        <Table.ScrollContainer minWidth={1000}>
          <Table verticalSpacing="sm" striped highlightOnHover>
            <Table.Thead bg="gray.0">
              <Table.Tr>
                <Table.Th>Booking Ref (PNR)</Table.Th>
                <Table.Th>Booked By</Table.Th>
                <Table.Th>Flight Info</Table.Th>
                <Table.Th>Booked Date</Table.Th>
                <Table.Th>Passengers</Table.Th>
                <Table.Th>Total Price</Table.Th>
                <Table.Th>Status</Table.Th>
                {isAdmin && <Table.Th style={{ textAlign: 'right' }}>Actions</Table.Th>}
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {rows.length > 0 ? rows : (
                <Table.Tr>
                  <Table.Td colSpan={8}>
                    <Text ta="center" c="dimmed" py="xl">No bookings found</Text>
                  </Table.Td>
                </Table.Tr>
              )}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      </Paper>
      
      <Center mt="md">
         <Pagination total={5} color="blue" />
      </Center>
    </>
  );
}