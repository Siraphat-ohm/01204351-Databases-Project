import { getServerSession } from '@/services/auth.services';
import { userService } from '@/services/user.services';
import { redirect } from 'next/navigation';
import { SettingsForm } from '@/components/SettingsForm';

export default async function SettingsPage() {
  const session = await getServerSession();
  
  if (!session) {
    redirect('/admin/login');
  }

  // Fetch the current user's profile with staff information
  const user = await userService.findMe(session as any);

  return <SettingsForm user={user as any} />;
}
