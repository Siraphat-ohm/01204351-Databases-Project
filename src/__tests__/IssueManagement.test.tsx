import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { IssueManagement } from '@/components/IssueManagement';
import '@testing-library/jest-dom';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    refresh: jest.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/admin/dashboard/issues',
}));

// Mock actions BEFORE importing the component if possible, 
// but here we mock the module that causes issues.
jest.mock('@/actions/issue-actions', () => ({
  updateIssueStatusAction: jest.fn(),
}));

const mockIssues = [
  {
    id: 'issue-1',
    category: 'booking' as const,
    description: 'Cannot book flight',
    status: 'open' as const,
    attachments: [],
    createdAt: new Date('2024-05-18T10:30:00'),
    user: { name: 'John Doe', email: 'john@example.com' },
  },
];

describe('IssueManagement Component', () => {
  const renderComponent = (issues = mockIssues as any, totalPages = 1, currentPage = 1) => {
    return render(
      <MantineProvider>
        <IssueManagement initialIssues={issues} totalPages={totalPages} currentPage={currentPage} />
      </MantineProvider>
    );
  };

  it('renders issues data correctly', () => {
    renderComponent();
    expect(screen.getByText('Booking')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getAllByText('Open')[0]).toBeInTheDocument();
  });

  it('opens issue details modal when view icon is clicked', async () => {
    renderComponent();
    const buttons = screen.getAllByRole('button');
    // The eye icon is usually one of the action buttons in the row
    // Search button is index 0, Clear (if any), then action buttons
    // Let's find the one with Eye icon or just click the last one
    fireEvent.click(buttons[buttons.length - 1]);
    
    expect(await screen.findByText(/Issue Details/i)).toBeInTheDocument();
    expect(screen.getByText('Cannot book flight')).toBeInTheDocument();
  });
});
