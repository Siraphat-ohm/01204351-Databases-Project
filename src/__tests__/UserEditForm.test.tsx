import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { UserEditForm } from '@/components/UserEditForm';
import { Role } from '@/generated/prisma/client';
import '@testing-library/jest-dom';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    refresh: jest.fn(),
    back: jest.fn(),
  }),
}));

// Mock actions
jest.mock('@/actions/user-actions', () => ({
  adminUpdateUserAction: jest.fn(),
}));

const mockUser = {
  id: 'user-1',
  email: 'test@example.com',
  name: 'Test User',
  role: 'PILOT' as Role,
  phone: '1234567890',
  image: 'https://example.com/image.jpg',
  staffProfile: null,
};

describe('UserEditForm Component', () => {
  const renderComponent = (user = mockUser as any) => {
    return render(
      <MantineProvider>
        <UserEditForm user={user} />
      </MantineProvider>
    );
  };

  it('renders the edit form with initial user data', () => {
    renderComponent();
    
    expect(screen.getByText(/Edit User Details/i)).toBeInTheDocument();
    expect(screen.getByText(`Modifying details for ${mockUser.email}`)).toBeInTheDocument();
    
    expect(screen.getByLabelText(/Full Name/i)).toHaveValue(mockUser.name);
    expect(screen.getByLabelText(/Email Address/i)).toHaveValue(mockUser.email);
    expect(screen.getByLabelText(/Phone Number/i)).toHaveValue(mockUser.phone);
  });

  it('allows changing name and phone', () => {
    renderComponent();
    
    const nameInput = screen.getByLabelText(/Full Name/i);
    const phoneInput = screen.getByLabelText(/Phone Number/i);
    
    fireEvent.change(nameInput, { target: { value: 'New Name' } });
    fireEvent.change(phoneInput, { target: { value: '0987654321' } });
    
    expect(nameInput).toHaveValue('New Name');
    expect(phoneInput).toHaveValue('0987654321');
  });

  it('renders correctly with missing optional data', () => {
    const minimalUser = {
      id: 'user-2',
      email: 'minimal@example.com',
      role: 'PASSENGER' as Role,
    };
    
    renderComponent(minimalUser);
    
    expect(screen.getByLabelText(/Full Name/i)).toHaveValue('');
    expect(screen.getByLabelText(/Phone Number/i)).toHaveValue('');
  });

  it('disables email input as it cannot be changed', () => {
    renderComponent();
    const emailInput = screen.getByLabelText(/Email Address/i);
    expect(emailInput).toBeDisabled();
  });

  it('renders initials when no name is provided', () => {
    const userNoName = {
      id: 'user-3',
      email: 'noname@example.com',
      role: 'PASSENGER' as Role,
    };
    renderComponent(userNoName);
    
    // Email is noname@example.com -> initials NO
    expect(screen.getByText('NO')).toBeInTheDocument();
  });
});
