import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { AircraftCreateForm } from '@/components/AircraftCreateForm';
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
  createAircraftAction: jest.fn(),
}));

const mockAircraftTypes = [
  { id: 't1', model: 'Boeing 737', iataCode: '737', capacityEco: 150, capacityBiz: 12, capacityFirst: 0 },
];

describe('AircraftCreateForm Component', () => {
  const renderComponent = (types = mockAircraftTypes) => {
    return render(
      <MantineProvider>
        <AircraftCreateForm aircraftTypes={types} />
      </MantineProvider>
    );
  };

  it('renders correctly', () => {
    renderComponent();
    expect(screen.getByText('Register New Aircraft')).toBeInTheDocument();
    expect(screen.getByLabelText(/Tail Number/i)).toBeInTheDocument();
    expect(screen.getAllByLabelText(/Aircraft Model \/ Type/i)[0]).toBeInTheDocument();
  });

  it('updates tail number input', () => {
    renderComponent();
    const input = screen.getByLabelText(/Tail Number/i);
    fireEvent.change(input, { target: { value: 'HS-TKA' } });
    expect(input.value).toBe('HS-TKA');
  });
});
