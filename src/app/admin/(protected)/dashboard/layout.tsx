import { redirect } from 'next/navigation';
import { getServerSession } from '@/services/auth.services';
import { userService } from '@/services/user.services';
import DashboardShellClient from '@/components/DashboardShellClient'; // We will create this next

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 1. Fetch Session securely
  const session = await getServerSession();
  
  if (!session) {
    redirect('/admin/login');
  }

  // 2. Fetch User Profile Data
  let userProfile;
  try {
    userProfile = await userService.findMe(session as any);
  } catch (error) {
    console.error("Failed to load user profile:", error);
    redirect('/admin/login');
  }

  // 3. Pass data to the interactive client component
  return (
    <DashboardShellClient user={userProfile}>
      {children}
    </DashboardShellClient>
  );
}