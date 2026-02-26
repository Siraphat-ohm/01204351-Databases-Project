import { AircraftTypeCreateForm } from '@/components/AircraftTypeCreateForm';
import { getServerSession } from '@/services/auth.services';
import { redirect } from 'next/navigation';

export default async function NewAircraftTypePage() {
  const session = await getServerSession();
  
  if (!session || session.user.role !== 'ADMIN') {
    redirect('/admin/login');
  }

  return <AircraftTypeCreateForm />;
}