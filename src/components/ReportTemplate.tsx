import { Paper, Title, Text, Group, Grid, Table, Divider, Box, ThemeIcon } from '@mantine/core';
import { PlaneTakeoff, Wallet, Users, Ticket } from 'lucide-react';

interface ReportTemplateProps {
  data: any; // Using your DashboardData type
}

export function ReportTemplate({ data }: ReportTemplateProps) {
  const currentDate = new Date().toLocaleDateString('en-GB', { 
    year: 'numeric', month: 'long', day: 'numeric' 
  });

  return (
    <Paper 
      p="xl" 
      bg="white" 
      radius={0}
      // A4 proportions (approx 800px width)
      style={{ width: '800px', minHeight: '1131px', color: 'black' }}
    >
      {/* HEADER */}
      <Group justify="space-between" align="flex-start" mb="xl">
        <Box>
          <Group gap="xs">
            <ThemeIcon size="lg" radius="md" color="blue"><PlaneTakeoff size={20} /></ThemeIcon>
            <Title order={2} style={{ color: '#1a1a1a' }}>YokAirlines</Title>
          </Group>
          <Text size="sm" c="dimmed" mt={4}>Executive System Summary</Text>
        </Box>
        <Box style={{ textAlign: 'right' }}>
          <Text fw={700} size="lg">Official Report</Text>
          <Text size="sm" c="dimmed">Generated: {currentDate}</Text>
        </Box>
      </Group>

      <Divider my="lg" color="gray.3" />

      {/* SECTION 1: KEY METRICS */}
      <Title order={4} mb="md" style={{ color: '#1a1a1a' }}>1. Key Performance Indicators</Title>
      <Grid mb="xl">
        <Grid.Col span={3}>
          <Paper withBorder p="md" bg="gray.0">
            <Group gap="xs" mb="xs"><Wallet size={16} color="green" /><Text size="xs" fw={700} c="dimmed">REVENUE</Text></Group>
            <Title order={3}>${data.stats.income.toLocaleString()}</Title>
          </Paper>
        </Grid.Col>
        <Grid.Col span={3}>
          <Paper withBorder p="md" bg="gray.0">
            <Group gap="xs" mb="xs"><Users size={16} color="blue" /><Text size="xs" fw={700} c="dimmed">ACTIVE USERS</Text></Group>
            <Title order={3}>{data.stats.activeUsers.toLocaleString()}</Title>
          </Paper>
        </Grid.Col>
        <Grid.Col span={3}>
          <Paper withBorder p="md" bg="gray.0">
            <Group gap="xs" mb="xs"><Ticket size={16} color="purple" /><Text size="xs" fw={700} c="dimmed">TICKETS TODAY</Text></Group>
            <Title order={3}>{data.stats.reservationsToday.toLocaleString()}</Title>
          </Paper>
        </Grid.Col>
        <Grid.Col span={3}>
          <Paper withBorder p="md" bg="gray.0">
            <Group gap="xs" mb="xs"><PlaneTakeoff size={16} color="orange" /><Text size="xs" fw={700} c="dimmed">ACTIVE FLIGHTS</Text></Group>
            <Title order={3}>{data.stats.activeFlights}</Title>
          </Paper>
        </Grid.Col>
      </Grid>

      {/* SECTION 2: POPULAR ROUTES */}
      <Title order={4} mb="md" style={{ color: '#1a1a1a' }}>2. Top Destinations</Title>
      <Table withTableBorder withColumnBorders mb="xl">
        <Table.Thead bg="gray.1">
          <Table.Tr>
            <Table.Th>Destination City</Table.Th>
            <Table.Th>IATA Code</Table.Th>
            <Table.Th>Traffic Share</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {/* 🌟 FIX: Add 'index' and use it in the key */}
          {data.popularDestinations.map((dest: any, index: number) => (
            <Table.Tr key={`${dest.code}-${index}`}>
              <Table.Td>{dest.city}</Table.Td>
              <Table.Td fw={600}>{dest.code}</Table.Td>
              <Table.Td>{dest.percentage}%</Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>

      {/* SECTION 3: UPCOMING FLIGHTS */}
      <Title order={4} mb="md" style={{ color: '#1a1a1a' }}>3. Upcoming Flight Schedule</Title>
      <Table withTableBorder withColumnBorders>
        <Table.Thead bg="gray.1">
          <Table.Tr>
            <Table.Th>Flight Code</Table.Th>
            <Table.Th>Route</Table.Th>
            <Table.Th>Time (STD)</Table.Th>
            <Table.Th>Status</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {data.upcomingFlights.slice(0, 10).map((flight: any) => (
            <Table.Tr key={flight.id}>
              <Table.Td fw={700}>{flight.code}</Table.Td>
              <Table.Td>{flight.route}</Table.Td>
              <Table.Td>{flight.time}</Table.Td>
              <Table.Td>{flight.status}</Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>

      {/* FOOTER */}
      <Box mt={100} style={{ borderTop: '1px solid #eaeaea', paddingTop: '10px' }}>
        <Text size="xs" c="dimmed" ta="center">
          CONFIDENTIAL - SkyOps Internal Document. Generated automatically by the admin dashboard.
        </Text>
      </Box>
    </Paper>
  );
}