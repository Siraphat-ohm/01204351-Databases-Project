import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { FlightOpsLogManagement } from '@/components/FlightOpsLogManagement';
import '@testing-library/jest-dom';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    refresh: jest.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/admin/dashboard/ops-log',
}));

// Mock actions
jest.mock('@/actions/flight-op-actions', () => ({
  patchFlightOpsLogAction: jest.fn(),
}));

const mockLogs = [
  {
    id: 'log-1',
    flightId: 'FLIGHT-12345678',
    flightCode: 'TG123',
    route: 'BKK - CNX',
    captainName: 'Capt. Smith',
    gateChanges: [],
    weatherConditions: { origin: 'Clear', destination: 'Rainy' },
    incidents: ['Minor delay'],
    maintenanceChecklist: { engineCheck: true },
    createdAt: new Date().toISOString(),
  },
];

describe('FlightOpsLogManagement Component', () => {
  const renderComponent = (logs = mockLogs, role = 'ADMIN', totalPages = 1, currentPage = 1) => {
    return render(
      <MantineProvider>
        <FlightOpsLogManagement initialLogs={logs as any} userRole={role} totalPages={totalPages} currentPage={currentPage} />
      </MantineProvider>
    );
  };

  it('renders flight ops logs data correctly', () => {
    renderComponent();
    expect(screen.getByText('TG123')).toBeInTheDocument();
    expect(screen.getByText('BKK - CNX')).toBeInTheDocument();
    expect(screen.getByText('Capt. Smith')).toBeInTheDocument();
    expect(screen.getByText('1 Incidents')).toBeInTheDocument();
  });

  it('opens log details modal when view log button is clicked', async () => {
    renderComponent();
    const viewButton = screen.getByText(/View Log/i);
    fireEvent.click(viewButton);
    expect(await screen.findByText(/Log Details/i)).toBeInTheDocument();
    expect(screen.getByText('Minor delay')).toBeInTheDocument();
  });
});
