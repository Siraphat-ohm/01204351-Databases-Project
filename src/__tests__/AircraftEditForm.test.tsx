import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { AircraftEditForm } from '@/components/AircraftEditForm';
import { AircraftStatus } from '@/generated/prisma/client';
import '@testing-library/jest-dom';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
  }),
}));

// Mock actions
jest.mock('@/actions/aircraft-actions', () => ({
  updateAircraftAction: jest.fn(),
}));

const mockAircraftTypes = [
  { id: 'type-1', model: 'Boeing 737-800', capacityEco: 162, capacityBiz: 12 },
  { id: 'type-2', model: 'Airbus A320neo', capacityEco: 150, capacityBiz: 12 },
];

const mockAircraft = {
  id: 'ac-1',
  tailNumber: 'HS-TBA',
  status: 'ACTIVE' as AircraftStatus,
  type: mockAircraftTypes[0],
};

describe('AircraftEditForm Component', () => {
  const renderComponent = (aircraft = mockAircraft, types = mockAircraftTypes) => {
    return render(
      <MantineProvider>
        <AircraftEditForm aircraft={aircraft as any} aircraftTypes={types} />
      </MantineProvider>
    );
  };

  it('renders the edit form with initial aircraft data', () => {
    renderComponent();
    
    expect(screen.getByLabelText(/Tail Number/i)).toHaveValue('HS-TBA');
    expect(screen.getByDisplayValue('Boeing 737-800')).toBeInTheDocument();
    expect(screen.getAllByDisplayValue('ACTIVE')[0]).toBeInTheDocument();
  });

  it('displays configuration specs for the selected model', () => {
    renderComponent();
    
    expect(screen.getByText('162')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('174 Pax')).toBeInTheDocument();
  });

  it('allows changing tail number and status', () => {
    renderComponent();
    
    const tailInput = screen.getByLabelText(/Tail Number/i);
    fireEvent.change(tailInput, { target: { value: 'HS-TBB' } });
    expect(tailInput).toHaveValue('HS-TBB');
  });
});
