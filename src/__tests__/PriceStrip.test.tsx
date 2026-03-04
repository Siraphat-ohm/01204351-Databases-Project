import React from 'react';
import { render, screen } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { PriceStrip } from '@/components/PriceStrip';
import '@testing-library/jest-dom';

const mockPrices = {
  '2026-03-04': 1500,
  '2026-03-05': 1600,
};

describe('PriceStrip Component', () => {
  it('renders prices correctly', () => {
    const activeDate = new Date('2026-03-04');
    render(
      <MantineProvider>
        <PriceStrip 
          startDate={activeDate} 
          onDateChange={jest.fn()} 
          prices={mockPrices} 
        />
      </MantineProvider>
    );
    
    expect(screen.getByText(/THB 1,500/)).toBeInTheDocument();
    expect(screen.getByText(/THB 1,600/)).toBeInTheDocument();
  });
});
