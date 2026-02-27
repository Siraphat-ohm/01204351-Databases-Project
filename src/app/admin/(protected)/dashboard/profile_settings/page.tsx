import { ProfileSettingsForm } from '@/components/ProfileSettingsForm';
import { userService } from '@/services/user.services';
import { getServerSession } from '@/services/auth.services';
import { redirect } from 'next/navigation';

export default async function ProfileSettingsPage() {
  const session = await getServerSession();
  
  if (!session) {
    redirect('/admin/login');
  }

  // Fetch the current user's full profile
  const user = await userService.findMe(session as any);

  return <ProfileSettingsForm user={user as any} />;
}