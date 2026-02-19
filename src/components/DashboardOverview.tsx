"use client";

import { 
  Grid, Paper, Text, Group, SimpleGrid, RingProgress, 
  Center, Table, Badge, Progress, Card, ThemeIcon, Avatar, Button,Stack,
  ActionIcon, Modal // ✅ Added ActionIcon and Modal
} from '@mantine/core';
import { useState, useEffect } from 'react';
import { useDisclosure } from '@mantine/hooks'; // ✅ Added useDisclosure hook
import { 
  Wallet, Users, Plane, Ticket, ArrowUpRight, 
  Map as MapIcon, PlaneTakeoff, AlertCircle, Clock, Maximize // ✅ Added Maximize icon
} from 'lucide-react';

import dynamic from 'next/dynamic';
import LiveRouteMap, { FlightRoute } from './LiveRouteMap';
import { fetchLiveMapData } from '@/actions/map-actions';

const LiveMapbox = dynamic(() => import('./LiveMapBox'), { 
  ssr: false,
  loading: () => <p>Loading Map...</p> 
});


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
  liveMapRoutes?: FlightRoute[]; 
}

export function DashboardOverview({ data }: { data: DashboardData }) {
  // ✅ Modal State for Fullscreen Map
  
  const [isMapExpanded, { open: openMap, close: closeMap }] = useDisclosure(false);
  
  const getStatusColor = (status: string) => {
    switch(status) {
      case 'ON TIME': return 'green';
      case 'DELAYED': return 'red';
      case 'BOARDING': return 'blue';
      default: return 'gray';
    }
  };

  const [liveRoutes, setLiveRoutes] = useState<FlightRoute[]>(data.liveMapRoutes || []);

  async function initializeLiveRoutes() {
    const initialData = await fetchLiveMapData();
    setLiveRoutes(initialData);
  }

  useEffect(() => {
    initializeLiveRoutes();
    const intervalId = setInterval(async () => {
      try {
        const freshData = await fetchLiveMapData();
        console.log("Fetched updated map data:", freshData);
        setLiveRoutes(freshData);
      } catch (error) {
        console.error("Failed to fetch updated map data:", error);
      }
    }, 60000); // 60,000 ms = 1 minute

    // Cleanup the interval when the component unmounts
    return () => clearInterval(intervalId);
  }, []);


  return (
    <div style={{ paddingBottom: 20 }}>
      {/* --- 1. Top Stats Cards --- */}
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} mb="lg">
         {/* ... Your existing 4 cards ... */}
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
          <Text c="green" size="xs" fw={500} mt="md">+12% from last month</Text>
        </Paper>

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
          <Text c="dimmed" size="xs" mt="md">Currently online</Text>
        </Paper>

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
          <Text c="green" size="xs" fw={500} mt="md">+5% target reached</Text>
        </Paper>

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
          <Text c="dimmed" size="xs" mt="md">In the air right now</Text>
        </Paper>
      </SimpleGrid>

      {/* --- 2. Middle Section: Map & Charts --- */}
      <Grid gutter="md" mb="lg">
        {/* Map Section */}
        <Grid.Col span={{ base: 12, md: 8 }}>
          <Card shadow="xs" padding="lg" radius="md" withBorder h="100%">
            <Group justify="space-between" mb="md">
              <Text fw={700}>Live Route Map</Text>
              <Group gap="xs">
                <Badge variant="dot" color="green">System Online</Badge>
                {/* ✅ EXPAND BUTTON */}
                <ActionIcon variant="default" onClick={openMap} aria-label="Expand map">
                  <Maximize size={16} />
                </ActionIcon>
              </Group>
            </Group>
            
            <div style={{ height: 350, width: '100%', borderRadius: 8, overflow: 'hidden' }}>
  <LiveMapbox 
    routes={liveRoutes} 
    defaultZoom={2.5}
    theme="dark" // Sleek, modern look for the dashboard UI
  />
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
          <Card shadow="xs" padding="lg" radius="md" withBorder h="100%">
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
            
            <Stack gap="xs">
              {data.flightLogs.map((log) => (
                 <Paper key={log.id} p="xs" bg="var(--mantine-color-gray-0)">
                    <Group align="flex-start" wrap="nowrap">
                       {log.type === 'error' ? (
                         <ThemeIcon color="red" variant="light" size="sm"><AlertCircle size={14}/></ThemeIcon>
                       ) : (
                         <ThemeIcon color="gray" variant="light" size="sm"><Clock size={14}/></ThemeIcon>
                       )}
                       <div style={{ flex: 1 }}>
                          <Text size="sm" lh={1.2}>{log.message}</Text>
                          <Text size="xs" c="dimmed" mt={4}>{log.time}</Text>
                       </div>
                    </Group>
                 </Paper>
              ))}
            </Stack>
          </Card>
        </Grid.Col>
      </Grid>

      {/* ✅ FULLSCREEN MAP MODAL */}
     <Modal 
    opened={isMapExpanded} 
    onClose={closeMap} 
    fullScreen 
    title={<Text fw={700} size="lg">Live Global Operations</Text>}
    >
    <div style={{ height: 'calc(100vh - 80px)', width: '100%' }}>
    <LiveMapbox 
      routes={liveRoutes} 
      defaultZoom={2} 
      theme="satellite" // Realistic globe when expanded!
    />
    </div>
  </Modal>

    </div>
  );
}