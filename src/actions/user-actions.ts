'use server'

import { userService } from '@/services/user.services'; // Adjust path if needed
import { getServerSession } from '@/services/auth.services'; // Adjust path if needed
import { revalidatePath } from 'next/cache';
import { UpdateUserRoleInput } from '@/types/user.type';

export async function adminUpdateUserRoleAction(userId: string, roleData: UpdateUserRoleInput) {
  const session = await getServerSession();
  
  if (!session || session.user.role !== 'ADMIN') {
    return { error: 'Unauthorized: Admins only' };
  }

  try {
    // Safely update the role via your service
    await userService.updateRole(userId, roleData, session);

    revalidatePath('/admin/dashboard/users');
    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'Failed to update user role' };
  }
}