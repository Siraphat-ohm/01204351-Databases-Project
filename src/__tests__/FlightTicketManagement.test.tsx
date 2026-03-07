import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { FlightTicketManagement } from '@/components/FlightTicketManagement';
import '@testing-library/jest-dom';

// Mock actions
jest.mock('@/actions/ticket-actions', () => ({
  mockUpdateTicketAction: jest.fn(),
}));

const mockTickets = [
  {
    id: 't1',
    bookingId: 'B1234567',
    firstName: 'John',
    lastName: 'Doe',
    class: 'ECONOMY',
    seatNumber: '12A',
    checkedIn: true,
    boardingPass: null,
  },
];

describe('FlightTicketManagement Component', () => {
  const renderComponent = (flightId = 'f1', tickets = mockTickets) => {
    return render(
      <MantineProvider>
        <FlightTicketManagement flightId={flightId} initialTickets={tickets} />
      </MantineProvider>
    );
  };

  it('renders correctly', () => {
    renderComponent();
    expect(screen.getByText('Flight Manifest')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getAllByText('ECONOMY')[0]).toBeInTheDocument();
    expect(screen.getByText('12A')).toBeInTheDocument();
  });

  it('filters tickets by passenger name', () => {
    renderComponent();
    const searchInput = screen.getByPlaceholderText(/Search Passenger, Booking, or Seat/i);
    fireEvent.change(searchInput, { target: { value: 'Jane' } });
    expect(screen.getByText(/No tickets found/i)).toBeInTheDocument();
  });
});
