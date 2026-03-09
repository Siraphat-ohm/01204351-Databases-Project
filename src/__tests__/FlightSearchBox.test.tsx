import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { FlightSearchBox } from '@/components/FlightSearchBox';
import '@testing-library/jest-dom';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

// Mock fetch
const mockFetch = jest.fn(() =>
  Promise.resolve({
    json: () => Promise.resolve([]),
  })
);
(mockFetch as any).preconnect = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

describe('FlightSearchBox Component', () => {
  it('renders correctly', () => {
    render(
      <MantineProvider>
        <FlightSearchBox />
      </MantineProvider>
    );
    
    expect(screen.getByText('Select trip type')).toBeInTheDocument();
    expect(screen.getByLabelText('One way')).toBeInTheDocument();
    expect(screen.getByLabelText('Round trip')).toBeInTheDocument();
    expect(screen.getByText('Search Flights')).toBeInTheDocument();
  });

  it('allows selecting trip type', () => {
    render(
      <MantineProvider>
        <FlightSearchBox />
      </MantineProvider>
    );
    
    const roundTripRadio = screen.getByLabelText('Round trip');
    fireEvent.click(roundTripRadio);
    expect(roundTripRadio).toBeChecked();
  });
});
