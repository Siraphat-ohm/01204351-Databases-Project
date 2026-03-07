import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { AircraftManagement } from '@/components/AircraftManagement';
import { AircraftStatus } from '@/generated/prisma/client';
import '@testing-library/jest-dom';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    refresh: jest.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/admin/dashboard/aircraft',
}));

// Mock actions
jest.mock('@/actions/aircraft-actions', () => ({
  deleteAircraftAction: jest.fn(),
}));

const mockAircraftTypes = [
  { id: 'type-1', model: 'Boeing 737-800', iataCode: '738', capacityEco: 162, capacityBiz: 12 },
  { id: 'type-2', model: 'Airbus A320neo', iataCode: '32N', capacityEco: 150, capacityBiz: 12 },
];

const mockAircrafts = [
  {
    id: 'ac-1',
    tailNumber: 'HS-TBA',
    status: 'ACTIVE' as AircraftStatus,
    type: mockAircraftTypes[0],
  },
  {
    id: 'ac-2',
    tailNumber: 'HS-TBB',
    status: 'MAINTENANCE' as AircraftStatus,
    type: mockAircraftTypes[1],
  },
];

describe('AircraftManagement Component', () => {
  const renderComponent = (aircrafts = mockAircrafts, types = mockAircraftTypes, totalPages = 1, currentPage = 1, role = 'ADMIN') => {
    return render(
      <MantineProvider>
        <AircraftManagement 
          initialAircrafts={aircrafts} 
          aircraftTypes={types}
          totalPages={totalPages} 
          currentPage={currentPage} 
          userRole={role}
        />
      </MantineProvider>
    );
  };

  it('renders the fleet management page with data', () => {
    renderComponent();
    
    expect(screen.getByText('Fleet Management')).toBeInTheDocument();
    
    // Check for tail numbers
    expect(screen.getAllByText('HS-TBA')[0]).toBeInTheDocument();
    expect(screen.getAllByText('HS-TBB')[0]).toBeInTheDocument();
    
    // Check for models
    expect(screen.getByText('Boeing 737-800')).toBeInTheDocument();
    expect(screen.getByText('Airbus A320neo')).toBeInTheDocument();
  });

  it('renders status badges correctly', () => {
    renderComponent();
    expect(screen.getAllByText('ACTIVE')[0]).toBeInTheDocument();
    expect(screen.getAllByText('MAINTENANCE')[0]).toBeInTheDocument();
  });

  it('renders capacity information', () => {
    renderComponent();
    expect(screen.getAllByText(/Eco: 162/)[0]).toBeInTheDocument();
    expect(screen.getAllByText(/Biz: 12/)[0]).toBeInTheDocument();
  });

  it('shows "No aircraft found" when data is empty', () => {
    renderComponent([], [], 0, 1);
    expect(screen.getByText(/No aircraft found/i)).toBeInTheDocument();
  });

  it('renders search and filter inputs', () => {
    renderComponent();
    expect(screen.getByLabelText(/Search/i)).toBeInTheDocument();
    expect(screen.getAllByLabelText(/Status/i)[0]).toBeInTheDocument();
  });

  it('opens delete confirmation modal when delete button is clicked', async () => {
    renderComponent();
    
    const deleteButtons = screen.getAllByRole('button', { name: /Delete/i });
    
    if (deleteButtons.length > 0) {
      fireEvent.click(deleteButtons[0]);
      expect(await screen.findByText(/Confirm Deletion/i)).toBeInTheDocument();
      expect(screen.getByText(/Are you sure you want to remove aircraft/i)).toBeInTheDocument();
      expect(screen.getAllByText('HS-TBA').length).toBeGreaterThan(0);
    }
  });
});
