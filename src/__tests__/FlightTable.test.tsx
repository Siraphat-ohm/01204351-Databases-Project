import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { FlightTable, FlightTableRow } from '@/components/FlightTable';
import { FlightStatus } from '@/generated/prisma/client';
import '@testing-library/jest-dom';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/admin/dashboard/flights',
}));

// Mock actions
jest.mock('@/actions/flight-actions', () => ({
  deleteFlightAction: jest.fn(),
}));

const mockData: FlightTableRow[] = [
  {
    id: '1',
    flightCode: 'TG101',
    status: 'SCHEDULED' as FlightStatus,
    gate: 'A1',
    departureTime: new Date('2026-03-04T10:00:00Z'),
    arrivalTime: new Date('2026-03-04T12:00:00Z'),
    basePrice: 1500,
    captainId: 'cap-1',
    captainName: 'John Doe',
    route: {
      distanceKm: 600,
      durationMins: 120,
      origin: { iataCode: 'BKK', city: 'Bangkok', name: 'Suvarnabhumi', country: 'Thailand' },
      destination: { iataCode: 'CNX', city: 'Chiang Mai', name: 'Chiang Mai Intl', country: 'Thailand' },
    },
    aircraft: {
      tailNumber: 'HS-TGA',
      model: 'Airbus A320',
      status: 'ACTIVE',
    },
  },
];

describe('FlightTable Component', () => {
  const renderComponent = (data = mockData, totalPages = 1) => {
    return render(
      <MantineProvider>
        <FlightTable data={data} totalPages={totalPages} />
      </MantineProvider>
    );
  };

  it('renders the flight table with data', () => {
    renderComponent();
    
    // Check for flight code
    expect(screen.getByText('TG101')).toBeInTheDocument();
    
    // Check for IATA codes - Use getAll because it might appear in route and details
    expect(screen.getAllByText('BKK')[0]).toBeInTheDocument();
    expect(screen.getAllByText('CNX')[0]).toBeInTheDocument();
    
    // Check for status badge
    expect(screen.getAllByText('SCHEDULED')[0]).toBeInTheDocument();
  });

  it('expands row when clicked to show details', () => {
    renderComponent();
    
    const row = screen.getByText('TG101').closest('tr');
    if (row) fireEvent.click(row);
    
    // Check for detailed information that should appear on expansion
    expect(screen.getByText(/Route Details/i)).toBeInTheDocument();
    expect(screen.getByText(/HS-TGA/i)).toBeInTheDocument();
    expect(screen.getByText(/Capt. John Doe/i)).toBeInTheDocument();
  });

  it('shows "No flights found" when data is empty', () => {
    renderComponent([], 0);
    expect(screen.getByText(/No flights found matching your criteria/i)).toBeInTheDocument();
  });

  it('renders search and filter inputs', () => {
    renderComponent();
    expect(screen.getByLabelText(/Flight Code/i)).toBeInTheDocument();
    // Autocomplete might have multiple elements for label/input depending on how testing-library perceives it
    expect(screen.getAllByLabelText(/Origin/i)[0]).toBeInTheDocument();
    expect(screen.getAllByLabelText(/Dest/i)[0]).toBeInTheDocument();
  });
});
