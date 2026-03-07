import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { UserManagement } from '@/components/UserManagement';
import { Role } from '@/generated/prisma/client';
import '@testing-library/jest-dom';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    refresh: jest.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/admin/dashboard/users',
}));

// Mock actions
jest.mock('@/actions/user-actions', () => ({
  adminUpdateUserRoleAction: jest.fn(),
}));

const mockUsers = [
  {
    id: 'user-1',
    email: 'admin@example.com',
    name: 'Admin User',
    role: 'ADMIN' as Role,
    image: null,
    staffProfile: {
      employeeId: 'EMP001',
      rank: 'SENIOR_ADMIN',
      baseAirport: { iataCode: 'BKK' },
    },
  },
  {
    id: 'user-2',
    email: 'pilot@example.com',
    name: 'John Pilot',
    role: 'PILOT' as Role,
    image: null,
    staffProfile: {
      employeeId: 'EMP002',
      rank: 'CAPTAIN',
      station: { iataCode: 'CNX' },
    },
  },
];

describe('UserManagement Component', () => {
  const renderComponent = (users = mockUsers as any, totalPages = 1, currentPage = 1, role = 'ADMIN') => {
    return render(
      <MantineProvider>
        <UserManagement 
          initialUsers={users} 
          totalPages={totalPages} 
          currentPage={currentPage} 
          userRole={role}
        />
      </MantineProvider>
    );
  };

  it('renders the users management page with data', () => {
    renderComponent();
    
    expect(screen.getByText('Users & Crew')).toBeInTheDocument();
    
    // Check for user names
    expect(screen.getByText('Admin User')).toBeInTheDocument();
    expect(screen.getByText('John Pilot')).toBeInTheDocument();
    
    // Check for emails
    expect(screen.getAllByText('admin@example.com')[0]).toBeInTheDocument();
    expect(screen.getAllByText('pilot@example.com')[0]).toBeInTheDocument();
  });

  it('renders roles and employee IDs', () => {
    renderComponent();
    
    expect(screen.getAllByText('ADMIN')[0]).toBeInTheDocument();
    expect(screen.getAllByText('PILOT')[0]).toBeInTheDocument();
    expect(screen.getByText('EMP001')).toBeInTheDocument();
    expect(screen.getByText('EMP002')).toBeInTheDocument();
  });

  it('renders base stations correctly', () => {
    renderComponent();
    expect(screen.getByText('BKK')).toBeInTheDocument();
    expect(screen.getByText('CNX')).toBeInTheDocument();
  });

  it('shows "No users found" when data is empty', () => {
    renderComponent([], 0, 1);
    expect(screen.getByText(/No users found/i)).toBeInTheDocument();
  });

  it('renders search and role filter inputs', () => {
    renderComponent();
    expect(screen.getByLabelText(/Search/i)).toBeInTheDocument();
    expect(screen.getAllByLabelText(/Role/i)[0]).toBeInTheDocument();
  });

  it('opens manage role modal when shield icon is clicked', async () => {
    renderComponent();
    
    const manageRoleButton = screen.getAllByRole('button', { name: /Manage Role/i })[0];
    fireEvent.click(manageRoleButton); 
    
    expect(await screen.findByText(/Manage User Role/i)).toBeInTheDocument();
    expect(screen.getAllByText('admin@example.com').length).toBeGreaterThan(0);
  });
});
