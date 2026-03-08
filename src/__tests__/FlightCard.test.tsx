import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { FlightCard } from '@/components/FlightCard';
import '@testing-library/jest-dom';

const mockFlight = {
  id: 'flight-1',
  flightCode: 'TG123',
  departureTime: '2026-03-04T10:00:00Z',
  arrivalTime: '2026-03-04T12:00:00Z',
  basePriceEconomy: '1500',
  basePriceBusiness: '3000',
  basePriceFirst: '5000',
  route: {
    origin: { iataCode: 'BKK', city: 'Bangkok' },
    destination: { iataCode: 'CNX', city: 'Chiang Mai' },
    durationMins: 120,
  },
  seatAvailability: {
    ECONOMY: { available: 50, total: 100 },
    BUSINESS: { available: 10, total: 20 },
  },
};

const mockHandlers = {
  onSelect: jest.fn(),
  formatLocalTime: (date: string) => new Date(date).toLocaleTimeString(),
  formatDuration: (mins: number) => `${Math.floor(mins / 60)}h ${mins % 60}m`,
};

describe('FlightCard Component', () => {
  const renderComponent = (props = {}) => {
    return render(
      <MantineProvider>
        <FlightCard
          flight={mockFlight}
          cabin="economy"
          adults={1}
          isSelectingReturn={false}
          tripType="one-way"
          onSelect={mockHandlers.onSelect}
          formatLocalTime={mockHandlers.formatLocalTime}
          formatDuration={mockHandlers.formatDuration}
          {...props}
        />
      </MantineProvider>
    );
  };

  it('renders flight information correctly', () => {
    renderComponent();
    
    // Check for IATA codes
    expect(screen.getByText('BKK')).toBeInTheDocument();
    expect(screen.getByText('CNX')).toBeInTheDocument();
    
    // Check for price (1500 for economy)
    // The price appears twice: once for individual and once for total
    const prices = screen.getAllByText(/1,500/);
    expect(prices.length).toBeGreaterThanOrEqual(1);
    
    // Check for "Book Flight" button
    expect(screen.getByRole('button', { name: /Book Flight/i })).toBeInTheDocument();
  });

  it('calls onSelect when "Book Flight" button is clicked', () => {
    renderComponent();
    
    const bookButton = screen.getByRole('button', { name: /Book Flight/i });
    fireEvent.click(bookButton);
    
    expect(mockHandlers.onSelect).toHaveBeenCalledWith(mockFlight);
  });

  it('shows "Sold Out" and disables button when no seats are available', () => {
    const soldOutFlight = {
      ...mockFlight,
      seatAvailability: {
        ECONOMY: { available: 0, total: 100 },
      },
    };
    
    renderComponent({ flight: soldOutFlight });
    
    expect(screen.getByText(/Sold Out/i)).toBeInTheDocument();
    const button = screen.getByRole('button', { name: /Flight Full/i });
    expect(button).toBeDisabled();
  });

  it('calculates total price correctly for multiple adults', () => {
    renderComponent({ adults: 3 });
    
    // 1500 * 3 = 4500
    expect(screen.getByText(/Total for 3 Pax/i)).toBeInTheDocument();
    expect(screen.getByText(/4,500/)).toBeInTheDocument();
  });
});
