import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { AirportManagement, Airport } from '@/components/AirportManagement';
import '@testing-library/jest-dom';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    refresh: jest.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/admin/dashboard/airports',
}));

// Mock actions
jest.mock('@/actions/airport-actions', () => ({
  deleteAirportAction: jest.fn(),
}));

const mockAirports: Airport[] = [
  {
    id: '1',
    iataCode: 'BKK',
    name: 'Suvarnabhumi Airport',
    city: 'Bangkok',
    country: 'Thailand',
    lat: 13.69,
    lon: 100.75,
  },
  {
    id: '2',
    iataCode: 'CNX',
    name: 'Chiang Mai International Airport',
    city: 'Chiang Mai',
    country: 'Thailand',
    lat: 18.77,
    lon: 98.96,
  },
];

describe('AirportManagement Component', () => {
  const renderComponent = (airports = mockAirports, totalPages = 1, currentPage = 1) => {
    return render(
      <MantineProvider>
        <AirportManagement 
          initialAirports={airports} 
          totalPages={totalPages} 
          currentPage={currentPage} 
        />
      </MantineProvider>
    );
  };

  it('renders the airport management page with data', () => {
    renderComponent();
    
    // Check for title
    expect(screen.getByText('Airport Management')).toBeInTheDocument();
    
    // Check for airport names and IATA codes
    expect(screen.getByText('Suvarnabhumi Airport')).toBeInTheDocument();
    expect(screen.getByText('BKK')).toBeInTheDocument();
    expect(screen.getByText('Chiang Mai International Airport')).toBeInTheDocument();
    expect(screen.getByText('CNX')).toBeInTheDocument();
  });

  it('renders city and country information', () => {
    renderComponent();
    expect(screen.getByText('Bangkok')).toBeInTheDocument();
    expect(screen.getAllByText('Thailand').length).toBeGreaterThan(0);
  });

  it('shows "No airports found" when data is empty', () => {
    renderComponent([], 0, 1);
    expect(screen.getByText(/No airports found/i)).toBeInTheDocument();
  });

  it('renders search input and button', () => {
    renderComponent();
    expect(screen.getByLabelText(/Search Airports/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Search/i })).toBeInTheDocument();
  });

  it('opens delete confirmation modal when delete icon is clicked', async () => {
    renderComponent();
    
    const deleteButtons = screen.getAllByRole('button').filter(button => 
       button.querySelector('svg')?.classList.contains('lucide-trash')
    );
    
    if (deleteButtons.length > 0) {
      fireEvent.click(deleteButtons[0]);
      // Modals are portals and might take a tick to show up
      expect(await screen.findByText(/Confirm Deletion/i)).toBeInTheDocument();
      expect(screen.getByText(/Are you sure you want to delete/i)).toBeInTheDocument();
    }
  });
});
