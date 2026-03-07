import React from 'react';
import { render, screen } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { SearchHeader } from '@/components/SearchHeader';
import '@testing-library/jest-dom';

const mockSearchData = {
  from: 'BKK',
  to: 'CNX',
  departure: new Date('2026-03-04'),
  return: null,
  type: 'one-way',
  cabin: 'economy',
  adults: 1,
};

describe('SearchHeader Component', () => {
  const mockHandlers = {
    onFromChange: jest.fn(),
    onToChange: jest.fn(),
    onDepartureChange: jest.fn(),
    onReturnChange: jest.fn(),
    onTypeChange: jest.fn(),
    onCabinChange: jest.fn(),
    onAdultsChange: jest.fn(),
    onSearch: jest.fn(),
  };

  it('renders search data correctly', () => {
    render(
      <MantineProvider>
        <SearchHeader searchData={mockSearchData} {...mockHandlers} />
      </MantineProvider>
    );
    
    expect(screen.getAllByDisplayValue('BKK')[0]).toBeInTheDocument();
    expect(screen.getAllByDisplayValue('CNX')[0]).toBeInTheDocument();
    expect(screen.getByLabelText(/Passengers/i)).toHaveValue('1');
  });
});
