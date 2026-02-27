"use client";

import { 
  Title, Group, Table, Badge, Text, ActionIcon, 
  TextInput, Paper, Select, Modal, Stack, Alert,
  NumberFormatter, Code, ScrollArea, Button, Pagination, Center, LoadingOverlay, Box
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { Search, Filter, Eye, AlertCircle, CheckCircle, Clock, RefreshCw } from 'lucide-react';
import { useState, useTransition, useEffect } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { notifications } from '@mantine/notifications';
import { updatePaymentLogAction } from '@/actions/payment-log-actions';

// --- Types matching your Zod schema ---
type PaymentStatus = 'pending' | 'success' | 'failed' | 'refunded';
type PaymentGateway = 'stripe' | 'promptpay' | 'truemoney' | 'other';

interface PaymentLog {
  id: string;
  bookingId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  gateway: PaymentGateway;
  rawResponse: Record<string, unknown>;
  createdAt: string; // Serialized Date from Server
}

interface PaymentLogManagementProps {
  initialLogs: PaymentLog[];
  totalPages: number;
  currentPage: number;
}

export function PaymentLogManagement({ initialLogs, totalPages, currentPage }: PaymentLogManagementProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Initialize search state from URL
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState<string | null>(searchParams.get('status'));

  useEffect(() => {
    setSearchTerm(searchParams.get('search') || '');
    setStatusFilter(searchParams.get('status'));
  }, [searchParams]);

  // Modal State
  const [opened, { open, close }] = useDisclosure(false);
  const [selectedLog, setSelectedLog] = useState<PaymentLog | null>(null);
  
  // Update & Loading State
  const [isPending, startTransition] = useTransition();
  const [updateError, setUpdateError] = useState<string | null>(null);

  // Helpers
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'green';
      case 'pending': return 'yellow';
      case 'failed': return 'red';
      case 'refunded': return 'gray';
      default: return 'gray';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle size={14} />;
      case 'pending': return <Clock size={14} />;
      case 'failed': return <AlertCircle size={14} />;
      case 'refunded': return <RefreshCw size={14} />;
      default: return null;
    }
  };

  const formatEnumText = (text: string) => {
    if (!text) return 'Unknown';
    return text.charAt(0).toUpperCase() + text.slice(1);
  };

  // ────────────────────────────────────────────────
  // EXPLICIT SEARCH & PAGINATION HANDLERS
  // ────────────────────────────────────────────────
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(() => {
      const params = new URLSearchParams(searchParams);
      
      if (searchTerm.trim()) params.set('search', searchTerm.trim());
      else params.delete('search');

      if (statusFilter) params.set('status', statusFilter);
      else params.delete('status');

      params.set('page', '1'); 

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
  // MODAL HANDLERS
  // ────────────────────────────────────────────────
  const handleViewLog = (log: PaymentLog) => {
    setSelectedLog(log);
    setUpdateError(null);
    open();
  };

  const handleStatusChange = (newStatus: string | null) => {
    if (!selectedLog || !newStatus || newStatus === selectedLog.status) return;

    startTransition(async () => {
      const payload = { status: newStatus as PaymentStatus };
      const result = await updatePaymentLogAction(selectedLog.id, payload);
      
      if (result?.error) {
        setUpdateError(result.error);
      } else {
        // Optimistic update
        setSelectedLog({ ...selectedLog, status: payload.status });
        notifications.show({ title: "Status Updated", message: "Transaction status manually overridden.", color: "orange", icon: <AlertCircle size={18} /> });
        router.refresh();
      }
    });
  };

  // ────────────────────────────────────────────────
  // RENDER TABLE ROWS (Directly from Server Props)
  // ────────────────────────────────────────────────
  const rows = initialLogs.map((log) => (
    <Table.Tr key={log.id}>
      <Table.Td>
        <Text size="sm" fw={500} style={{ fontFamily: 'monospace' }}>
          {log.id.split('-')[0] || log.id.substring(0, 8)}
        </Text>
        <Text size="xs" c="dimmed">Booking: {log.bookingId?.substring(0, 8) || 'N/A'}</Text>
      </Table.Td>

      <Table.Td>
        <Text size="sm" fw={600}>
          <NumberFormatter value={log.amount} thousandSeparator /> {log.currency}
        </Text>
      </Table.Td>

      <Table.Td>
        <Badge variant="outline" color="blue" radius="sm">
          {formatEnumText(log.gateway)}
        </Badge>
      </Table.Td>

      <Table.Td>
        <Text size="sm">
          {new Date(log.createdAt).toLocaleString('en-GB', { 
            day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
          })}
        </Text>
      </Table.Td>

      <Table.Td>
        <Badge color={getStatusColor(log.status)} variant="light" leftSection={getStatusIcon(log.status)}>
          {formatEnumText(log.status)}
        </Badge>
      </Table.Td>

      <Table.Td>
        <Group gap={0} justify="flex-end">
          <ActionIcon variant="subtle" color="blue" onClick={() => handleViewLog(log)}>
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
          <Title order={2}>Payment Logs</Title>
          <Text c="dimmed" size="sm">Monitor transactions and gateway webhooks</Text>
        </div>
      </Group>

      {/* ────────────────────────────────────────────────
          SEARCH BAR (Submit via Form)
          ──────────────────────────────────────────────── */}
      <Paper shadow="xs" p="md" mb="lg" withBorder>
        <form onSubmit={handleSearch}>
          <Group align="flex-end">
            <TextInput 
              placeholder="Search Log ID or Booking ID... (Press Enter)" 
              leftSection={<Search size={16} />} 
              style={{ flex: 1, minWidth: '250px' }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.currentTarget.value)}
              disabled={isPending}
            />
            <Select 
              placeholder="Status"
              data={[
                { value: 'pending', label: 'Pending' },
                { value: 'success', label: 'Success' },
                { value: 'failed', label: 'Failed' },
                { value: 'refunded', label: 'Refunded' }
              ]}
              value={statusFilter}
              onChange={setStatusFilter}
              clearable
              leftSection={<Filter size={16} />}
              style={{ width: 150 }}
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
                <Table.Th style={{ width: '20%' }}>Log / Booking ID</Table.Th>
                <Table.Th style={{ width: '20%' }}>Amount</Table.Th>
                <Table.Th style={{ width: '15%' }}>Gateway</Table.Th>
                <Table.Th style={{ width: '20%' }}>Timestamp</Table.Th>
                <Table.Th style={{ width: '15%' }}>Status</Table.Th>
                <Table.Th style={{ width: '10%', textAlign: 'right' }}>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {rows.length > 0 ? rows : (
                <Table.Tr>
                  <Table.Td colSpan={6}>
                    <Text ta="center" c="dimmed" py="xl">No payment logs found</Text>
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

      {/* --- VIEW MODAL --- */}
      <Modal 
        opened={opened} 
        onClose={close} 
        title={<Text fw={700} size="lg">Transaction Details</Text>}
        size="lg"
      >
        {selectedLog && (
          <Stack>
            {updateError && (
              <Alert color="red" title="Error">
                {updateError}
              </Alert>
            )}

            <Group justify="space-between" align="flex-start">
              <div style={{ flex: 1 }}>
                <Text size="xs" c="dimmed" fw={600}>TRANSACTION AMOUNT</Text>
                <Text fw={700} size="xl">
                   <NumberFormatter value={selectedLog.amount} thousandSeparator /> {selectedLog.currency}
                </Text>
              </div>
              <Badge color={getStatusColor(selectedLog.status)} variant="filled" size="lg">
                {formatEnumText(selectedLog.status)}
              </Badge>
            </Group>

            <Group grow>
              <Paper p="sm" withBorder bg="gray.0">
                <Text size="xs" c="dimmed" fw={600}>BOOKING ID</Text>
                <Text size="sm" style={{ fontFamily: 'monospace' }}>{selectedLog.bookingId || 'N/A'}</Text>
              </Paper>
              <Paper p="sm" withBorder bg="gray.0">
                <Text size="xs" c="dimmed" fw={600}>GATEWAY</Text>
                <Text size="sm">{formatEnumText(selectedLog.gateway)}</Text>
              </Paper>
            </Group>

            {/* Gateway JSON Response */}
            <div>
              <Text size="xs" c="dimmed" fw={600} mb={4}>GATEWAY RAW RESPONSE</Text>
              <ScrollArea h={200} type="always" offsetScrollbars>
                <Code block style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                  {JSON.stringify(selectedLog.rawResponse, null, 2)}
                </Code>
              </ScrollArea>
            </div>

            {/* Admin Action: Manual Override */}
            <Paper p="sm" withBorder mt="md" radius="md">
              <Text size="sm" fw={600} mb="xs">Manual Status Override</Text>
              <Select
                data={[
                  { value: 'pending', label: 'Pending' },
                  { value: 'success', label: 'Success' },
                  { value: 'failed', label: 'Failed' },
                  { value: 'refunded', label: 'Refunded' }
                ]}
                value={selectedLog.status}
                onChange={handleStatusChange}
                disabled={isPending}
                allowDeselect={false}
              />
              <Text size="xs" c="dimmed" mt="xs">
                Warning: Changing this status does not trigger an actual refund or capture at the gateway. It only updates internal records.
              </Text>
            </Paper>
          </Stack>
        )}
      </Modal>
    </Box>
  );
}