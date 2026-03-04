import React from 'react';
import { render, screen } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import DashboardShellClient from '@/components/DashboardShellClient';
import '@testing-library/jest-dom';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  usePathname: () => '/admin/dashboard',
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
  }),
}));

// Mock auth client
jest.mock('@/services/auth-client.service', () => ({
  signOutCurrentUser: jest.fn(),
}));

const mockUser = {
  name: 'Admin User',
  email: 'admin@example.com',
  role: 'ADMIN',
};

describe('DashboardShellClient Component', () => {
  const renderComponent = (user = mockUser) => {
    return render(
      <MantineProvider>
        <DashboardShellClient user={user}>
          <div data-testid="children">Content</div>
        </DashboardShellClient>
      </MantineProvider>
    );
  };

  it('renders navigation items', () => {
    renderComponent();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Flight Schedule')).toBeInTheDocument();
    expect(screen.getByText('Users & Crew')).toBeInTheDocument();
  });

  it('renders user information', () => {
    renderComponent();
    expect(screen.getByText('Admin User')).toBeInTheDocument();
    expect(screen.getByText('ADMIN')).toBeInTheDocument();
  });

  it('renders children content', () => {
    renderComponent();
    expect(screen.getByTestId('children')).toBeInTheDocument();
  });
});
