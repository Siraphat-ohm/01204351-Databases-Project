import { UserEditForm } from '@/components/UserEditForm';
import { userService } from '@/services/user.services';
import { getServerSession } from '@/services/auth.services';
import { redirect, notFound } from 'next/navigation';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditUserPage({ params }: PageProps) {
  const session = await getServerSession();
  
  if (!session || session.user.role !== 'ADMIN') {
    redirect('/admin/login');
  }

  const { id } = await params;

  let user;
  try {
    user = await userService.findById(id, session);
  } catch (error) {
    // If the user doesn't exist, show a 404 page
    notFound();
  }

  return <UserEditForm user={user} />;
}