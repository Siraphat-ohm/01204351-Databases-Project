import React from 'react';
import { render, screen } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { ReportTemplate } from '@/components/ReportTemplate';
import '@testing-library/jest-dom';

const mockData = {
  stats: {
    income: 1250000,
    activeFlights: 45,
    activeUsers: 1200,
    reservationsToday: 350,
  },
  popularDestinations: [
    { city: 'Tokyo', code: 'NRT', percentage: 45 },
  ],
  upcomingFlights: [
    { id: 'f1', code: 'TG101', route: 'BKK - CNX', time: '10:00', status: 'ON TIME' },
  ],
};

describe('ReportTemplate Component', () => {
  it('renders correctly with data', () => {
    render(
      <MantineProvider>
        <ReportTemplate data={mockData} />
      </MantineProvider>
    );
    
    expect(screen.getByText('YokAirlines')).toBeInTheDocument();
    expect(screen.getByText('Executive System Summary')).toBeInTheDocument();
    expect(screen.getByText('$1,250,000')).toBeInTheDocument();
    expect(screen.getByText('45')).toBeInTheDocument();
    expect(screen.getByText('TG101')).toBeInTheDocument();
  });
});
