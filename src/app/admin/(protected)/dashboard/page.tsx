import { DashboardOverview } from '@/components/DashboardOverview';
import { getServerSession } from '@/services/auth.services';
import { dashboardService } from '@/services/dashboard.services';
import { Alert, Container } from '@mantine/core';
import { AlertTriangle } from 'lucide-react';
import { redirect } from 'next/navigation';

export default async function DashboardPage() {
  const session = await getServerSession();
  
  if (!session) {
    redirect('/admin/dashboard/login'); 
  }

  try {
    const dashboardData = await dashboardService.getExecutiveOverview(session as any);
    
    // Render the Client Component and pass the data
    return <DashboardOverview data={dashboardData} userRole={session.user.role} />;

  } catch (error: any) {
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