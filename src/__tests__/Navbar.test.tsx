import React from 'react';
import { render, screen } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { Navbar } from '@/components/Navbar';
import '@testing-library/jest-dom';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    refresh: jest.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock auth client
jest.mock('@/services/auth-client.service', () => ({
  useAuthSession: jest.fn(() => ({ data: null })),
  signOutCurrentUser: jest.fn(),
}));

import { useAuthSession } from '@/services/auth-client.service';

describe('Navbar Component', () => {
  it('renders login button when not authenticated', () => {
    (useAuthSession as jest.Mock).mockReturnValue({ data: null });
    
    render(
      <MantineProvider>
        <Navbar />
      </MantineProvider>
    );
    
    expect(screen.getByText('Login')).toBeInTheDocument();
  });

  it('renders user menu when authenticated', () => {
    (useAuthSession as jest.Mock).mockReturnValue({
      data: {
        user: { name: 'John Doe' }
      }
    });
    
    render(
      <MantineProvider>
        <Navbar />
      </MantineProvider>
    );
    
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });
});
