import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { FlightEditForm } from '@/components/FlightEditForm';
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
jest.mock('@/actions/flight-actions', () => ({
  updateFlightAction: jest.fn(),
}));

const mockFlight = {
  id: 'flight-1',
  flightCode: 'TG101',
  originCode: 'BKK',
  destCode: 'CNX',
  aircraftId: 'ac-1',
  captainId: 'cap-1',
  status: 'SCHEDULED',
  gate: 'A1',
  departureTime: '2026-03-04T10:00:00Z',
  arrivalTime: '2026-03-04T12:00:00Z',
  basePriceEconomy: 1500,
  basePriceBusiness: 3000,
  basePriceFirst: 5000,
};

const mockAircraftOptions = [
  { value: 'ac-1', label: 'HS-TBA (Boeing 737-800) - ACTIVE', disabled: false },
  { value: 'ac-2', label: 'HS-TBB (Airbus A320neo) - ACTIVE', disabled: false },
];

const mockAvailableRoutes = [
  { id: 'route-1', originCode: 'BKK', originCity: 'Bangkok', destCode: 'CNX', destCity: 'Chiang Mai' },
  { id: 'route-2', originCode: 'BKK', originCity: 'Bangkok', destCode: 'HKT', destCity: 'Phuket' },
];

const mockCaptainOptions = [
  { value: 'cap-1', label: 'Capt. John Doe (EMP001)', image: null },
  { value: 'cap-2', label: 'Capt. Jane Smith (EMP002)', image: null },
];

describe('FlightEditForm Component', () => {
  const renderComponent = (props = {}) => {
    return render(
      <MantineProvider>
        <FlightEditForm 
          flight={mockFlight} 
          aircraftOptions={mockAircraftOptions} 
          availableRoutes={mockAvailableRoutes}
          captainOptions={mockCaptainOptions}
          {...props}
        />
      </MantineProvider>
    );
  };

  it('renders the edit form with initial flight data', () => {
    renderComponent();
    
    expect(screen.getByLabelText(/Flight Code/i)).toHaveValue('TG101');
    expect(screen.getAllByDisplayValue('HS-TBA (Boeing 737-800) - ACTIVE')[0]).toBeInTheDocument();
    expect(screen.getAllByDisplayValue('BKK - Bangkok')[0]).toBeInTheDocument();
    expect(screen.getAllByDisplayValue('CNX - Chiang Mai')[0]).toBeInTheDocument();
    expect(screen.getByLabelText(/Gate Assignment/i)).toHaveValue('A1');
  });

  it('renders status and pricing correctly', () => {
    renderComponent();
    
    expect(screen.getAllByDisplayValue('SCHEDULED')[0]).toBeInTheDocument();
    expect(screen.getByLabelText(/Economy Base/i)).toHaveValue('$1500');
    expect(screen.getByLabelText(/Business Base/i)).toHaveValue('$3000');
    expect(screen.getByLabelText(/First Class Base/i)).toHaveValue('$5000');
  });

  it('allows changing flight code', () => {
    renderComponent();
    const input = screen.getByLabelText(/Flight Code/i);
    fireEvent.change(input, { target: { value: 'TG202' } });
    expect(input).toHaveValue('TG202');
  });

  it('renders correctly even when destination options are filtered', () => {
    renderComponent();
    // Verify initial destination is correct
    expect(screen.getAllByDisplayValue('CNX - Chiang Mai')[0]).toBeInTheDocument();
  });

  it('shows route validation message when valid route is selected', () => {
    renderComponent();
    expect(screen.getByText(/Route pair validated/i)).toBeInTheDocument();
  });
});
