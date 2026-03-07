import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { ProfileSettingsForm } from '@/components/ProfileSettingsForm';
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
  updateMyProfileAction: jest.fn(),
}));

const mockUser = {
  id: 'user-1',
  email: 'self@example.com',
  name: 'My Name',
  role: 'ADMIN' as Role,
  phone: '123456789',
  image: '',
};

describe('ProfileSettingsForm Component', () => {
  const renderComponent = (user = mockUser as any) => {
    return render(
      <MantineProvider>
        <ProfileSettingsForm user={user} />
      </MantineProvider>
    );
  };

  it('renders the profile settings form correctly', () => {
    renderComponent();
    expect(screen.getByText(/Profile Settings/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Full Name/i)).toHaveValue('My Name');
    expect(screen.getByLabelText(/Email Address/i)).toHaveValue('self@example.com');
  });

  it('disables email input', () => {
    renderComponent();
    expect(screen.getByLabelText(/Email Address/i)).toBeDisabled();
  });

  it('updates initials based on name', () => {
    renderComponent();
    expect(screen.getByText('MY')).toBeInTheDocument();
  });
});
