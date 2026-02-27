"use client";

import { 
  Title, Group, Button, Table, Badge, Text, ActionIcon, 
  TextInput, Paper, Select, Modal, Stack, Textarea, Avatar, Alert, LoadingOverlay, Center, Pagination, Box
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { Search, Filter, Eye, AlertCircle, CheckCircle, Clock, Paperclip, X } from 'lucide-react';
import { useState, useTransition, useEffect } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { notifications } from '@mantine/notifications';
import { updateIssueStatusAction } from '@/actions/issue-actions';

// --- Types matching your Zod schema ---
type IssueStatus = 'open' | 'investigating' | 'resolved' | 'closed';
type IssueCategory = 'booking' | 'payment' | 'flight' | 'baggage' | 'other';

interface IssueReport {
  id: string;
  category: IssueCategory;
  description: string;
  status: IssueStatus;
  attachments: string[];
  createdAt: Date;
  user?: {
    name: string | null;
    email: string;
  };
  resolvedBy?: string | null;
}

interface IssueManagementProps {
  initialIssues: IssueReport[];
  totalPages: number;
  currentPage: number;
}

export function IssueManagement({ initialIssues, totalPages, currentPage }: IssueManagementProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Initialize search states from the URL
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState<string | null>(searchParams.get('status'));

  useEffect(() => {
    setSearchTerm(searchParams.get('search') || '');
    setStatusFilter(searchParams.get('status'));
  }, [searchParams]);
  
  // Transition and Loading State
  const [isPending, startTransition] = useTransition();

  // Modal State
  const [opened, { open, close }] = useDisclosure(false);
  const [selectedIssue, setSelectedIssue] = useState<IssueReport | null>(null);
  const [adminNote, setAdminNote] = useState(''); 
  const [updateError, setUpdateError] = useState<string | null>(null);

  // Status Helpers
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'red';
      case 'investigating': return 'blue';
      case 'resolved': return 'green';
      case 'closed': return 'gray';
      default: return 'gray';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open': return <AlertCircle size={14} />;
      case 'investigating': return <Clock size={14} />;
      case 'resolved': return <CheckCircle size={14} />;
      default: return null;
    }
  };

  const formatEnumText = (text: string) => {
    return text.charAt(0).toUpperCase() + text.slice(1).replace('_', ' ');
  };

  // ────────────────────────────────────────────────
  // EXPLICIT SEARCH & FILTER HANDLERS
  // ────────────────────────────────────────────────
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    
    startTransition(() => {
      const params = new URLSearchParams(searchParams);
      
      if (searchTerm.trim()) params.set('search', searchTerm.trim());
      else params.delete('search');

      if (statusFilter) params.set('status', statusFilter);
      else params.delete('status');

      params.set('page', '1'); // Always reset to page 1 on new search

      router.push(`${pathname}?${params.toString()}`);
    });
  };

  const handlePageChange = (page: number) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams);
      params.set('page', page.toString());
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter(null);
    startTransition(() => router.push(pathname));
  };

  // ────────────────────────────────────────────────
  // ISSUE MODAL HANDLERS
  // ────────────────────────────────────────────────
  const handleViewIssue = (issue: IssueReport) => {
    setSelectedIssue(issue);
    setAdminNote('');
    setUpdateError(null);
    open();
  };

  const handleStatusChange = (newStatus: string | null) => {
    if (!selectedIssue || !newStatus || newStatus === selectedIssue.status) return;

    startTransition(async () => {
      const payload = {
        status: newStatus as IssueStatus,
        note: adminNote.trim() !== '' ? adminNote : undefined,
      };

      const result = await updateIssueStatusAction(selectedIssue.id, payload);
      
      if (result?.error) {
        setUpdateError(result.error);
      } else {
        // Optimistically update local state so the modal reflects the change immediately
        setSelectedIssue({ ...selectedIssue, status: payload.status });
        setAdminNote(''); 
        notifications.show({ title: "Status Updated", message: "Issue status has been saved.", color: "green", icon: <CheckCircle size={18} /> });
        // Refresh the server data behind the scenes to update the table
        router.refresh();
      }
    });
  };

  const rows = initialIssues.map((issue) => (
    <Table.Tr key={issue.id}>
      <Table.Td>
        <Group gap="xs">
          <Badge variant="dot" color="gray">{formatEnumText(issue.category)}</Badge>
        </Group>
        <Text size="xs" c="dimmed" mt={4}>ID: {issue.id.split('-')[0]}</Text>
      </Table.Td>

      <Table.Td>
        {issue.user ? (
          <Group gap="xs">
            <Avatar size="sm" radius="xl" color="blue">
              {(issue.user.name?.[0] || issue.user.email[0]).toUpperCase()}
            </Avatar>
            <Text size="sm">{issue.user.name || issue.user.email}</Text>
          </Group>
        ) : (
          <Text size="sm" c="dimmed">System / Unknown</Text>
        )}
      </Table.Td>

      <Table.Td>
        <Text size="sm">
          {new Date(issue.createdAt).toLocaleDateString('en-GB', { 
            day: 'numeric', month: 'short', year: 'numeric' 
          })}
        </Text>
      </Table.Td>

      <Table.Td>
        <Badge color={getStatusColor(issue.status)} variant="light" leftSection={getStatusIcon(issue.status)}>
          {formatEnumText(issue.status)}
        </Badge>
      </Table.Td>

      <Table.Td>
        <Group gap={0} justify="flex-end">
          <ActionIcon variant="subtle" color="blue" onClick={() => handleViewIssue(issue)}>
            <Eye size={16} />
          </ActionIcon>
        </Group>
      </Table.Td>
    </Table.Tr>
  ));

  return (
    <Box>
      <Group justify="space-between" mb="lg">
        <div>
          <Title order={2}>Issue Reports</Title>
          <Text c="dimmed" size="sm">Review and resolve user and system issues</Text>
        </div>
      </Group>

      {/* ────────────────────────────────────────────────
          SEARCH BAR (Submit via Form)
          ──────────────────────────────────────────────── */}
      <Paper shadow="xs" p="md" mb="lg" withBorder>
        <form onSubmit={handleSearch}>
          <Group align="flex-end">
            <TextInput 
              label="Search"
              placeholder="Category, Email, or ID... (Press Enter)" 
              leftSection={<Search size={16} />} 
              style={{ flex: 1 }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.currentTarget.value)}
              disabled={isPending}
            />
            <Select 
              label="Status Filter"
              placeholder="Any Status"
              data={[
                { value: 'open', label: 'Open' },
                { value: 'investigating', label: 'Investigating' },
                { value: 'resolved', label: 'Resolved' },
                { value: 'closed', label: 'Closed' }
              ]}
              value={statusFilter}
              onChange={setStatusFilter}
              clearable
              leftSection={<Filter size={16} />}
              style={{ width: 200 }}
              disabled={isPending}
            />
            <Button type="submit" color="blue" leftSection={<Search size={16} />} loading={isPending}>
              Search
            </Button>
            {(searchParams.get('search') || searchParams.get('status')) && (
              <Button variant="light" color="gray" onClick={clearFilters} disabled={isPending}>
                Clear
              </Button>
            )}
          </Group>
        </form>
      </Paper>

      {/* 🌟 SAFE LOADING OVERLAY TABLE 🌟 */}
      <Paper shadow="xs" withBorder pos="relative">
        <LoadingOverlay 
          visible={isPending} 
          zIndex={1000} 
          overlayProps={{ radius: 'sm', blur: 0, backgroundOpacity: 0 }} 
        />
        
        <Table.ScrollContainer minWidth={800}>
          <Table verticalSpacing="sm" striped highlightOnHover layout="fixed">
            <Table.Thead bg="gray.0">
              <Table.Tr>
                <Table.Th style={{ width: '30%' }}>Category / ID</Table.Th>
                <Table.Th style={{ width: '30%' }}>Reporter</Table.Th>
                <Table.Th style={{ width: '15%' }}>Date</Table.Th>
                <Table.Th style={{ width: '15%' }}>Status</Table.Th>
                <Table.Th style={{ width: '10%', textAlign: 'right' }}>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {rows.length > 0 ? rows : (
                <Table.Tr>
                  <Table.Td colSpan={5}>
                    <Text ta="center" c="dimmed" py="xl">No issues found</Text>
                  </Table.Td>
                </Table.Tr>
              )}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      </Paper>

      {totalPages > 1 && (
        <Center mt="md">
           <Pagination 
             total={totalPages} 
             value={currentPage}
             onChange={handlePageChange}
             color="blue" 
             disabled={isPending}
           />
        </Center>
      )}

      {/* --- VIEW / EDIT MODAL --- */}
      <Modal 
        opened={opened} 
        onClose={close} 
        title={<Text fw={700} size="lg">Issue Details</Text>}
        size="lg"
      >
        {selectedIssue && (
          <Stack>
            {updateError && (
              <Alert color="red" title="Update Failed" icon={<X size={16} />}>
                {updateError}
              </Alert>
            )}

            <Group justify="space-between" align="flex-start">
              <div style={{ flex: 1 }}>
                <Text size="xs" c="dimmed" fw={600}>CATEGORY</Text>
                <Text fw={500} size="lg">{formatEnumText(selectedIssue.category)}</Text>
              </div>
              <Badge color={getStatusColor(selectedIssue.status)} variant="filled">
                {formatEnumText(selectedIssue.status)}
              </Badge>
            </Group>

            <div>
              <Text size="xs" c="dimmed" fw={600} mb={4}>DESCRIPTION</Text>
              <Textarea 
                readOnly 
                value={selectedIssue.description} 
                minRows={4}
                maxRows={10}
                autosize
                variant="filled"
              />
            </div>

            {/* Attachments Display */}
            {selectedIssue.attachments && selectedIssue.attachments.length > 0 && (
              <div>
                <Text size="xs" c="dimmed" fw={600} mb={4}>ATTACHMENTS</Text>
                <Group gap="xs">
                  {selectedIssue.attachments.map((url, i) => (
                    <Badge 
                      key={i} 
                      variant="outline" 
                      color="gray" 
                      leftSection={<Paperclip size={10} />}
                      component="a"
                      href={url}
                      target="_blank"
                      style={{ cursor: 'pointer', textTransform: 'none' }}
                    >
                      Attachment {i + 1}
                    </Badge>
                  ))}
                </Group>
              </div>
            )}

            <Group grow>
              <Paper p="sm" withBorder bg="gray.0">
                <Text size="xs" c="dimmed" fw={600}>REPORTER</Text>
                <Text size="sm">{selectedIssue.user?.name || selectedIssue.user?.email || 'Unknown'}</Text>
              </Paper>
              <Paper p="sm" withBorder bg="gray.0">
                <Text size="xs" c="dimmed" fw={600}>DATE REPORTED</Text>
                <Text size="sm">{new Date(selectedIssue.createdAt).toLocaleString('en-GB')}</Text>
              </Paper>
            </Group>

            {/* Admin Action: Change Status & Note */}
            <Paper p="sm" withBorder mt="md" radius="md">
              <Text size="sm" fw={600} mb="xs">Update Resolution Status</Text>
              <Stack gap="sm">
                <Textarea 
                  placeholder="Optional note for this status update..."
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.currentTarget.value)}
                  disabled={isPending}
                  autosize
                  minRows={2}
                />
                <Select
                  data={[
                    { value: 'open', label: 'Open' },
                    { value: 'investigating', label: 'Investigating' },
                    { value: 'resolved', label: 'Resolved' },
                    { value: 'closed', label: 'Closed' }
                  ]}
                  value={selectedIssue.status}
                  onChange={handleStatusChange}
                  disabled={isPending}
                  allowDeselect={false}
                  placeholder="Select new status..."
                />
              </Stack>
            </Paper>
          </Stack>
        )}
      </Modal>
    </Box>
  );
}