import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { RouteManagement } from '@/components/RouteManagement';
import '@testing-library/jest-dom';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    refresh: jest.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/admin/dashboard/routes',
}));

// Mock actions
jest.mock('@/actions/route-actions', () => ({
  deleteRouteAction: jest.fn(),
}));

const mockRoutes = [
  {
    id: 'route-1',
    distanceKm: 600,
    durationMins: 120,
    origin: { id: 'orig-1', iataCode: 'BKK', city: 'Bangkok', name: 'Suvarnabhumi' },
    destination: { id: 'dest-1', iataCode: 'CNX', city: 'Chiang Mai', name: 'Chiang Mai Intl' },
    flights: [],
  },
];

describe('RouteManagement Component', () => {
  const renderComponent = (routes = mockRoutes, totalPages = 1, currentPage = 1, role = 'ADMIN') => {
    return render(
      <MantineProvider>
        <RouteManagement initialRoutes={routes} totalPages={totalPages} currentPage={currentPage} userRole={role} />
      </MantineProvider>
    );
  };

  it('renders route data correctly', () => {
    renderComponent();
    expect(screen.getByText('BKK')).toBeInTheDocument();
    expect(screen.getByText('CNX')).toBeInTheDocument();
    expect(screen.getByText(/600 km/i)).toBeInTheDocument();
    expect(screen.getByText(/120 mins/i)).toBeInTheDocument();
  });

  it('opens delete confirmation modal when trash icon is clicked', async () => {
    renderComponent();
    const buttons = screen.getAllByRole('button');
    // Action icons are at the end of the row
    fireEvent.click(buttons[buttons.length - 1]);
    
    expect(await screen.findByText(/Confirm Deletion/i)).toBeInTheDocument();
    expect(screen.getByText(/BKK → CNX/i)).toBeInTheDocument();
  });
});
