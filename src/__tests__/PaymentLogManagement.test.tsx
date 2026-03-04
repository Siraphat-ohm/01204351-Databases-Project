import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { PaymentLogManagement } from '@/components/PaymentLogMangement';
import '@testing-library/jest-dom';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    refresh: jest.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/admin/dashboard/payment-logs',
}));

// Mock actions
jest.mock('@/actions/payment-log-actions', () => ({
  updatePaymentLogAction: jest.fn(),
}));

const mockLogs = [
  {
    id: '12345678-90ab',
    bookingId: 'book-87654321',
    amount: 1500,
    currency: 'THB',
    status: 'success' as const,
    gateway: 'stripe' as const,
    rawResponse: { id: 'ch_123' },
    createdAt: new Date().toISOString(),
  },
];

describe('PaymentLogManagement Component', () => {
  const renderComponent = (logs = mockLogs, totalPages = 1, currentPage = 1) => {
    return render(
      <MantineProvider>
        <PaymentLogManagement initialLogs={logs} totalPages={totalPages} currentPage={currentPage} />
      </MantineProvider>
    );
  };

  it('renders payment logs data correctly', () => {
    renderComponent();
    // The ID is truncated in the table using .split('-')[0]
    expect(screen.getByText('12345678')).toBeInTheDocument();
    
    expect(screen.getByText(/1,500/)).toBeInTheDocument();
    expect(screen.getAllByText('Success')[0]).toBeInTheDocument();
  });

  it('opens transaction details modal when view icon is clicked', async () => {
    renderComponent();
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[buttons.length - 1]);
    expect(await screen.findByText(/Transaction Details/i)).toBeInTheDocument();
    expect(screen.getAllByText('Stripe').length).toBeGreaterThan(0);
  });
});
