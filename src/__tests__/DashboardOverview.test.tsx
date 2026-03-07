import React from 'react';
import { render, screen } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { DashboardOverview } from '@/components/DashboardOverview';
import '@testing-library/jest-dom';

// Mock next/dynamic
jest.mock('next/dynamic', () => () => {
  const MockDynamicComponent = () => <div data-testid="mock-live-mapbox">Live Mapbox Mock</div>;
  return MockDynamicComponent;
});

// Mock map actions
jest.mock('@/actions/map-actions', () => ({
  fetchLiveMapData: jest.fn(() => Promise.resolve([])),
}));

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
}));

const mockDashboardData = {
  stats: {
    income: 1250000,
    activeFlights: 45,
    activeUsers: 1200,
    reservationsToday: 350,
    availablePlanes: 18,
    totalPlanes: 25,
  },
  popularDestinations: [
    { city: 'Tokyo', code: 'NRT', percentage: 45, count: 150 },
    { city: 'London', code: 'LHR', percentage: 30, count: 100 },
  ],
  upcomingFlights: [
    { id: 'f1', code: 'TG101', route: 'BKK → CNX', time: '10:00', status: 'ON TIME' },
  ],
  flightLogs: [
    { id: 1, message: 'System healthy', time: '5m ago', type: 'info' },
  ],
};

describe('DashboardOverview Component', () => {
  const renderComponent = (data = mockDashboardData, role = 'ADMIN') => {
    return render(
      <MantineProvider>
        <DashboardOverview data={data} userRole={role} />
      </MantineProvider>
    );
  };

  it('renders top statistics correctly', () => {
    renderComponent();
    expect(screen.getAllByText(/\$1,250,000/)[0]).toBeInTheDocument();
    expect(screen.getAllByText('1,200')[0]).toBeInTheDocument();
    expect(screen.getAllByText('350')[0]).toBeInTheDocument();
    expect(screen.getAllByText('45')[0]).toBeInTheDocument();
  });

  it('renders popular destinations', () => {
    renderComponent();
    expect(screen.getAllByText('Tokyo (NRT)')[0]).toBeInTheDocument();
    expect(screen.getAllByText('45%')[0]).toBeInTheDocument();
  });

  it('renders upcoming flights', () => {
    renderComponent();
    expect(screen.getAllByText('TG101')[0]).toBeInTheDocument();
    expect(screen.getAllByText('BKK → CNX')[0]).toBeInTheDocument();
    expect(screen.getAllByText('ON TIME')[0]).toBeInTheDocument();
  });

  it('renders flight logs', () => {
    renderComponent();
    expect(screen.getByText('System healthy')).toBeInTheDocument();
    expect(screen.getByText('5m ago')).toBeInTheDocument();
  });
});
