'use server'

import { userService } from '@/services/user.services';
import { getServerSession } from '@/services/auth.services';
import { revalidatePath } from 'next/cache';
import { UpdateMyProfileInput, updateMyProfileSchema, UpdateUserRoleInput } from '@/types/user.type';

export async function adminUpdateUserRoleAction(userId: string, roleData: UpdateUserRoleInput) {
  const session = await getServerSession();
  
  if (!session || session.user.role !== 'ADMIN') {
    return { error: 'Unauthorized: Admins only' };
  }

  try {
    await userService.updateRole(userId, roleData, session);
    revalidatePath('/admin/dashboard/users');
    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'Failed to update user role' };
  }
}

export async function updateMyProfileAction(data: UpdateMyProfileInput) {
  try {
    const session = await getServerSession();
    if (!session) return { error: "Unauthorized" };

    // 🌟 USE safeParse instead of parse to handle validation errors gracefully
    const parsed = updateMyProfileSchema.safeParse(data);
    
    if (!parsed.success) {
      // Return structured field errors that the client expects
      return { 
        error: "Validation failed. Please check the highlighted fields.", 
        fieldErrors: parsed.error.flatten().fieldErrors 
      };
    }
    
    await userService.updateMyProfile(parsed.data, session as any);

    // Revalidate the entire dashboard layout so the Navbar avatar refreshes instantly
    revalidatePath('/admin/dashboard', 'layout'); 
    
    return { success: true };
  } catch (error: any) {
    return { error: error.message || "An unexpected error occurred while saving." };
  }
}