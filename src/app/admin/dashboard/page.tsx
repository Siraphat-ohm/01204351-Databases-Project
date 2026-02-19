import { DashboardOverview } from '@/components/DashboardOverview';
import { Title, Group, Button,Text } from '@mantine/core';
import { Download } from 'lucide-react';

// Mock Data Function (แทนที่การ Query Prisma จริง)
async function getDashboardData() {
  // Simulate DB Delay
  await new Promise(resolve => setTimeout(resolve, 500));

  // TODO: Prisma Query Examples
  // const totalIncome = await prisma.transaction.aggregate({ _sum: { amount: true } });
  // const activeFlights = await prisma.flight.count({ where: { status: { in: ['BOARDING', 'DEPARTED'] } } });

  return {
    stats: {
      income: 4829000,
      activeFlights: 42,
      activeUsers: 1250,
      reservationsToday: 345,
      availablePlanes: 8,
      totalPlanes: 50,
    },
    popularDestinations: [
      { city: 'Tokyo', code: 'NRT', percentage: 35, count: 1200 },
      { city: 'London', code: 'LHR', percentage: 25, count: 900 },
      { city: 'Phuket', code: 'HKT', percentage: 20, count: 750 },
      { city: 'Singapore', code: 'SIN', percentage: 15, count: 500 },
    ],
    upcomingFlights: [
      { id: '1', code: 'TG102', route: 'BKK - CNX', time: '14:30', status: 'ON TIME' },
      { id: '2', code: 'TG404', route: 'BKK - SIN', time: '15:15', status: 'DELAYED' },
      { id: '3', code: 'WE244', route: 'DMK - HDY', time: '16:00', status: 'BOARDING' },
      { id: '4', code: 'PG901', route: 'BKK - REP', time: '16:45', status: 'ON TIME' },
    ],
    flightLogs: [
      { id: 1, type: 'info', message: 'Flight TG102 landed successfully', time: '2 mins ago' },
      { id: 2, type: 'error', message: 'Maintenance Alert: Aircraft HS-TBA', time: '15 mins ago' },
      { id: 3, type: 'info', message: 'New Crew Member Registered: John Doe', time: '1 hour ago' },
      { id: 4, type: 'info', message: 'Ticket #99882 Refunded', time: '2 hours ago' },
    ]
  };
}

export default async function DashboardPage() {
  // 1. Check Admin Privilege (Pseudo Code)
  // const session = await getSession();
  // if (session.user.role !== 'ADMIN') { 
  //    redirect('/unauthorized'); 
  // }

  // 2. Fetch Data from Server
  const dashboardData = await getDashboardData();

  return (
    <>
      <Group justify="space-between" mb="lg">
        <div>
          <Title order={2}>Executive Dashboard</Title>
          <Text c="dimmed">Overview of Airline Operations & Performance</Text>
        </div>
        <Button variant="outline" leftSection={<Download size={16} />}>
          Export Report
        </Button>
      </Group>

      {/* 3. Send Data to Client Component */}
      <DashboardOverview data={dashboardData} />
    </>
  );
}