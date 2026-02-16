"use client";

import { 
  Grid, Paper, Text, Group, SimpleGrid, RingProgress, 
  Center, Table, Badge, Progress, Card, ThemeIcon, Avatar ,Button
} from '@mantine/core';
import { 
  Wallet, Users, Plane, Ticket, ArrowUpRight, 
  Map as MapIcon, PlaneTakeoff, AlertCircle, Clock 
} from 'lucide-react';

// Define Types ที่รับมาจาก Server
interface DashboardData {
  stats: {
    income: number;
    activeFlights: number;
    activeUsers: number;
    reservationsToday: number;
    availablePlanes: number;
    totalPlanes: number;
  };
  popularDestinations: { city: string; code: string; percentage: number; count: number }[];
  upcomingFlights: { id: string; code: string; route: string; time: string; status: string }[];
  flightLogs: { id: number; message: string; time: string; type: string }[];
}

export function DashboardOverview({ data }: { data: DashboardData }) {
  
  // Helper สำหรับสี Status
  const getStatusColor = (status: string) => {
    switch(status) {
      case 'ON TIME': return 'green';
      case 'DELAYED': return 'red';
      case 'BOARDING': return 'blue';
      default: return 'gray';
    }
  };

  return (
    <div style={{ paddingBottom: 20 }}>
      {/* --- 1. Top Stats Cards --- */}
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} mb="lg">
        {/* Overall Income */}
        <Paper shadow="xs" p="md" radius="md" withBorder>
          <Group justify="space-between">
            <div>
              <Text c="dimmed" tt="uppercase" fw={700} size="xs">Overall Income</Text>
              <Text fw={700} size="xl">${data.stats.income.toLocaleString()}</Text>
            </div>
            <ThemeIcon color="green" variant="light" size={38} radius="md">
              <Wallet size={20} />
            </ThemeIcon>
          </Group>
          <Text c="green" size="xs" fw={500} mt="md">
            +12% from last month
          </Text>
        </Paper>

        {/* Active Users */}
        <Paper shadow="xs" p="md" radius="md" withBorder>
          <Group justify="space-between">
            <div>
              <Text c="dimmed" tt="uppercase" fw={700} size="xs">Active Users</Text>
              <Text fw={700} size="xl">{data.stats.activeUsers.toLocaleString()}</Text>
            </div>
            <ThemeIcon color="blue" variant="light" size={38} radius="md">
              <Users size={20} />
            </ThemeIcon>
          </Group>
          <Text c="dimmed" size="xs" mt="md">
            Currently online
          </Text>
        </Paper>

        {/* Today Reservations */}
        <Paper shadow="xs" p="md" radius="md" withBorder>
          <Group justify="space-between">
            <div>
              <Text c="dimmed" tt="uppercase" fw={700} size="xs">Tickets Today</Text>
              <Text fw={700} size="xl">{data.stats.reservationsToday}</Text>
            </div>
            <ThemeIcon color="grape" variant="light" size={38} radius="md">
              <Ticket size={20} />
            </ThemeIcon>
          </Group>
          <Text c="green" size="xs" fw={500} mt="md">
            +5% target reached
          </Text>
        </Paper>

        {/* Active Flights */}
        <Paper shadow="xs" p="md" radius="md" withBorder>
          <Group justify="space-between">
            <div>
              <Text c="dimmed" tt="uppercase" fw={700} size="xs">Active Flights</Text>
              <Text fw={700} size="xl">{data.stats.activeFlights}</Text>
            </div>
            <ThemeIcon color="orange" variant="light" size={38} radius="md">
              <PlaneTakeoff size={20} />
            </ThemeIcon>
          </Group>
          <Text c="dimmed" size="xs" mt="md">
            In the air right now
          </Text>
        </Paper>
      </SimpleGrid>

      {/* --- 2. Middle Section: Map & Charts --- */}
      <Grid gutter="md" mb="lg">
        {/* Map Section */}
        <Grid.Col span={{ base: 12, md: 8 }}>
          <Card shadow="xs" padding="lg" radius="md" withBorder h="100%">
            <Group justify="space-between" mb="md">
              <Text fw={700}>Live Route Map</Text>
              <Badge variant="dot" color="green">System Online</Badge>
            </Group>
            
            {/* Mock Map Container */}
            <div style={{ 
              backgroundColor: '#e9ecef', 
              borderRadius: 8, 
              height: 300, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              position: 'relative',
              overflow: 'hidden'
            }}>
               {/* World Map Background Placeholder */}
               <MapIcon size={64} color="#adb5bd" />
               <Text c="dimmed" mt="sm">Interactive Map Component</Text>
               
               {/* Mock Planes overlay */}
               <div style={{ position: 'absolute', top: '30%', left: '40%' }}>
                 <Plane size={16} fill="black" style={{ transform: 'rotate(45deg)' }} />
               </div>
               <div style={{ position: 'absolute', top: '50%', left: '60%' }}>
                 <Plane size={16} fill="black" style={{ transform: 'rotate(-15deg)' }} />
               </div>
            </div>
          </Card>
        </Grid.Col>

        {/* Fleet & Destinations */}
        <Grid.Col span={{ base: 12, md: 4 }}>
          <Card shadow="xs" padding="lg" radius="md" withBorder h="100%">
            <Text fw={700} mb="md">Fleet Availability</Text>
            
            <Center>
              <RingProgress
                size={140}
                roundCaps
                thickness={8}
                sections={[{ value: (data.stats.availablePlanes / data.stats.totalPlanes) * 100, color: 'blue' }]}
                label={
                  <Center>
                    <div>
                      <Text ta="center" fz="lg" fw={700}>{data.stats.availablePlanes}/{data.stats.totalPlanes}</Text>
                      <Text ta="center" c="dimmed" size="xs">Available</Text>
                    </div>
                  </Center>
                }
              />
            </Center>

            <Text fw={700} mt="lg" mb="sm">Popular Destinations</Text>
            {data.popularDestinations.map((dest) => (
              <div key={dest.code} style={{ marginBottom: 10 }}>
                <Group justify="space-between" mb={5}>
                  <Text size="xs">{dest.city} ({dest.code})</Text>
                  <Text size="xs" fw={500}>{dest.percentage}%</Text>
                </Group>
                <Progress value={dest.percentage} color="cyan" size="sm" />
              </div>
            ))}
          </Card>
        </Grid.Col>
      </Grid>

      {/* --- 3. Bottom Section: Upcoming Flights & Logs --- */}
      <Grid gutter="md">
        {/* Upcoming Flights Table */}
        <Grid.Col span={{ base: 12, md: 7 }}>
          <Card shadow="xs" padding="lg" radius="md" withBorder>
            <Group justify="space-between" mb="md">
               <Text fw={700}>Upcoming Flights</Text>
               <Button variant="subtle" size="xs" rightSection={<ArrowUpRight size={14} />}>View All</Button>
            </Group>
            
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Flight</Table.Th>
                  <Table.Th>Route</Table.Th>
                  <Table.Th>STD</Table.Th>
                  <Table.Th>Status</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {data.upcomingFlights.map((flight) => (
                  <Table.Tr key={flight.id}>
                    <Table.Td>
                       <Group gap="xs">
                          <Avatar size="sm" radius="xl" color="blue"><Plane size={14} /></Avatar>
                          <Text size="sm" fw={500}>{flight.code}</Text>
                       </Group>
                    </Table.Td>
                    <Table.Td>{flight.route}</Table.Td>
                    <Table.Td>{flight.time}</Table.Td>
                    <Table.Td>
                      <Badge size="sm" variant="light" color={getStatusColor(flight.status)}>
                        {flight.status}
                      </Badge>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Card>
        </Grid.Col>

        {/* Flight Logs */}
        <Grid.Col span={{ base: 12, md: 5 }}>
          <Card shadow="xs" padding="lg" radius="md" withBorder h="100%">
            <Text fw={700} mb="md">Recent System Logs</Text>
            
            <SimpleGrid cols={1} spacing="xs">
              {data.flightLogs.map((log) => (
                 <Paper key={log.id} p="xs" bg="var(--mantine-color-gray-0)">
                    <Group align="flex-start">
                       {log.type === 'error' ? (
                         <ThemeIcon color="red" variant="light" size="sm"><AlertCircle size={14}/></ThemeIcon>
                       ) : (
                         <ThemeIcon color="gray" variant="light" size="sm"><Clock size={14}/></ThemeIcon>
                       )}
                       <div style={{ flex: 1 }}>
                          <Text size="sm">{log.message}</Text>
                          <Text size="xs" c="dimmed">{log.time}</Text>
                       </div>
                    </Group>
                 </Paper>
              ))}
            </SimpleGrid>
          </Card>
        </Grid.Col>
      </Grid>
    </div>
  );
}