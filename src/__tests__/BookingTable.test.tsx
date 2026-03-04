import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { BookingTable } from '@/components/BookingTable';
import '@testing-library/jest-dom';

const mockBookings = [
  {
    id: 1,
    bookingRef: 'PNR8X2',
    status: 'CONFIRMED' as const,
    totalPrice: 450.00,
    createdAt: new Date('2024-05-18T10:30:00'),
    user: { username: 'john_doe', email: 'john@example.com' },
    flight: {
      flightCode: 'TG101',
      departureTime: new Date('2024-05-20T08:00:00'),
      route: { origin: { iataCode: 'BKK' }, destination: { iataCode: 'CNX' } }
    },
    _count: { tickets: 2 }
  },
];

describe('BookingTable Component', () => {
  const renderComponent = (bookings = mockBookings) => {
    return render(
      <MantineProvider>
        <BookingTable initialBookings={bookings} />
      </MantineProvider>
    );
  };

  it('renders booking data correctly', () => {
    renderComponent();
    expect(screen.getByText('PNR8X2')).toBeInTheDocument();
    expect(screen.getByText('john_doe')).toBeInTheDocument();
    expect(screen.getByText('TG101')).toBeInTheDocument();
    expect(screen.getAllByText('CONFIRMED')[0]).toBeInTheDocument();
  });

  it('filters bookings by search term', () => {
    renderComponent();
    const searchInput = screen.getByPlaceholderText(/Search PNR, Email, or Flight Code/i);
    fireEvent.change(searchInput, { target: { value: 'NONEXISTENT' } });
    expect(screen.getByText(/No bookings found/i)).toBeInTheDocument();
  });
});
