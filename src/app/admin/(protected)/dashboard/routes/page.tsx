import { RouteManagement } from '@/components/RouteManagement';
import { routeService } from '@/services/route.services';
import { getServerSession } from '@/services/auth.services'; // Adjust path to your new auth utility
import { redirect } from 'next/navigation';

export default async function RoutesPage() {
  // 1. Authenticate Request
  const session = await getServerSession();
  if (!session) redirect('/admin/login');

  // 2. Fetch Data (Only routes needed here now!)
  const routes = await routeService.findAll(session as any);

  // 3. Pass Data to Client Component
  return (
    <RouteManagement initialRoutes={routes as any} />
  );
}