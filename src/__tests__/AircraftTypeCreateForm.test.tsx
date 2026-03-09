import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { AircraftTypeCreateForm } from '@/components/AircraftTypeCreateForm';
import '@testing-library/jest-dom';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
  }),
}));

// Mock actions
jest.mock('@/actions/aircraft-type-actions', () => ({
  createAircraftTypeAction: jest.fn(),
}));

describe('AircraftTypeCreateForm Component', () => {
  const renderComponent = () => {
    return render(
      <MantineProvider>
        <AircraftTypeCreateForm />
      </MantineProvider>
    );
  };

  it('renders correctly', () => {
    renderComponent();
    expect(screen.getByText('Add Aircraft Model')).toBeInTheDocument();
    expect(screen.getByLabelText(/Model Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/IATA Code/i)).toBeInTheDocument();
  });

  it('updates inputs correctly', () => {
    renderComponent();
    const modelInput = screen.getByLabelText(/Model Name/i);
    const iataInput = screen.getByLabelText(/IATA Code/i);
    
    fireEvent.change(modelInput, { target: { value: 'Airbus A350' } });
    fireEvent.change(iataInput, { target: { value: '359' } });
    
    expect((modelInput as HTMLInputElement).value).toBe('Airbus A350');
    expect((iataInput as HTMLInputElement).value).toBe('359');
  });
});
