import { DashboardOverview } from '@/components/DashboardOverview';
import { getServerSession } from '@/services/auth.services';
import { dashboardService } from '@/services/dashboard.services';
import { Title, Group, Button, Text, Alert, Container } from '@mantine/core';
import { Download, AlertTriangle } from 'lucide-react';
import { redirect } from 'next/navigation'; // ✅ Correct import for Server Components

export default async function DashboardPage() {
  // 1. Authenticate user using getServerSession (avoids throwing unhandled errors)
  const session = await getServerSession();
  
  if (!session) {
    // ✅ Use redirect() on the server instead of window.location.href
    redirect('/admin/dashboard/login'); 
  }

  try {
    // 2. Fetch data from the real service using the authenticated session
    const dashboardData = await dashboardService.getExecutiveOverview(session as any);
    
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

        {/* 3. Send Real Data to Client Component */}
        <DashboardOverview data={dashboardData} />
      </>
    );
  } catch (error: any) {
    // 4. Graceful Error Handling (e.g., if user lacks ADMIN/MANAGER roles)
    return (
      <Container mt="xl">
        <Alert 
          icon={<AlertTriangle size={24} />} 
          title="Access Denied / Error" 
          color="red" 
          variant="light"
        >
          {error.message || 'Failed to load dashboard data. Please verify your permissions.'}
        </Alert>
      </Container>
    );
  }
}