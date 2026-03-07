import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { RouteCreateForm } from '@/components/RouteCreateForm';
import '@testing-library/jest-dom';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
  }),
}));

// Mock actions
jest.mock('@/actions/route-actions', () => ({
  createRouteAction: jest.fn(),
}));

const mockAirports = [
  { id: 'a1', iataCode: 'BKK', city: 'Bangkok', lat: 13.69, lon: 100.75 },
  { id: 'a2', iataCode: 'CNX', city: 'Chiang Mai', lat: 18.77, lon: 98.96 },
];

describe('RouteCreateForm Component', () => {
  const renderComponent = () => {
    return render(
      <MantineProvider>
        <RouteCreateForm airports={mockAirports} />
      </MantineProvider>
    );
  };

  it('renders correctly', () => {
    renderComponent();
    expect(screen.getByText('Define New Route')).toBeInTheDocument();
    expect(screen.getAllByLabelText(/Origin Airport/i)[0]).toBeInTheDocument();
    expect(screen.getAllByLabelText(/Destination Airport/i)[0]).toBeInTheDocument();
  });

  it('renders flight parameter fields', () => {
    renderComponent();
    expect(screen.getByLabelText(/Distance \(km\)/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Duration \(minutes\)/i)).toBeInTheDocument();
  });
});
