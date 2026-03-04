import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { AirportCreateForm } from '@/components/AirportCreateForm';
import '@testing-library/jest-dom';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
  }),
}));

// Mock actions
jest.mock('@/actions/airport-actions', () => ({
  createAirportAction: jest.fn(),
}));

describe('AirportCreateForm Component', () => {
  const renderComponent = () => {
    return render(
      <MantineProvider>
        <AirportCreateForm />
      </MantineProvider>
    );
  };

  it('renders correctly', () => {
    renderComponent();
    expect(screen.getByText('Add New Airport')).toBeInTheDocument();
    expect(screen.getByLabelText(/IATA Code/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Airport Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/City/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Country/i)).toBeInTheDocument();
  });

  it('updates inputs correctly', () => {
    renderComponent();
    const iataInput = screen.getByLabelText(/IATA Code/i);
    const nameInput = screen.getByLabelText(/Airport Name/i);
    
    fireEvent.change(iataInput, { target: { value: 'BKK' } });
    fireEvent.change(nameInput, { target: { value: 'Suvarnabhumi' } });
    
    expect(iataInput.value).toBe('BKK');
    expect(nameInput.value).toBe('Suvarnabhumi');
  });
});
