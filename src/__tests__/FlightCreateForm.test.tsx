import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { FlightCreateForm } from '@/components/FlightCreateForm';
import '@testing-library/jest-dom';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
  }),
}));

// Mock actions
jest.mock('@/actions/flight-actions', () => ({
  createFlightAction: jest.fn(),
}));

const mockAircraftOptions = [
  { value: 'ac-1', label: 'HS-TBA (737)', disabled: false },
];

const mockAvailableRoutes = [
  { id: 'r1', originCode: 'BKK', originCity: 'Bangkok', destCode: 'CNX', destCity: 'Chiang Mai' },
];

const mockCaptainOptions = [
  { value: 'cap-1', label: 'Capt. Smith', image: null },
];

describe('FlightCreateForm Component', () => {
  const renderComponent = () => {
    return render(
      <MantineProvider>
        <FlightCreateForm 
          aircraftOptions={mockAircraftOptions} 
          availableRoutes={mockAvailableRoutes}
          captainOptions={mockCaptainOptions}
        />
      </MantineProvider>
    );
  };

  it('renders identification and aircraft fields', () => {
    renderComponent();
    expect(screen.getByLabelText(/Flight Code/i)).toBeInTheDocument();
    expect(screen.getAllByLabelText(/Assigned Aircraft/i)[0]).toBeInTheDocument();
  });

  it('renders routing and pricing fields', () => {
    renderComponent();
    expect(screen.getAllByLabelText(/Origin/i)[0]).toBeInTheDocument();
    expect(screen.getAllByLabelText(/Destination/i)[0]).toBeInTheDocument();
    expect(screen.getByLabelText(/Economy Base/i)).toBeInTheDocument();
  });

  it('updates flight code input', () => {
    renderComponent();
    const input = screen.getByLabelText(/Flight Code/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'TG101' } });
    expect(input.value).toBe('TG101');
  });
});
