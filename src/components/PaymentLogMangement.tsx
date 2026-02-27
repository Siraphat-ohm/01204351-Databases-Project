"use client";

import { 
  Title, Group, Table, Badge, Text, ActionIcon, 
  TextInput, Paper, Select, Modal, Stack, Alert,
  NumberFormatter, Code, ScrollArea, Button
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { Search, Filter, Eye, AlertCircle, CheckCircle, Clock, RefreshCw } from 'lucide-react';
import { useState, useTransition } from 'react';
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
  createdAt: Date;
}

interface PaymentLogManagementProps {
  initialLogs: PaymentLog[];
}

export function PaymentLogManagement({ initialLogs }: PaymentLogManagementProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [gatewayFilter, setGatewayFilter] = useState<string | null>(null);
  
  // Modal State
  const [opened, { open, close }] = useDisclosure(false);
  const [selectedLog, setSelectedLog] = useState<PaymentLog | null>(null);
  
  // Update State
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
    return text.charAt(0).toUpperCase() + text.slice(1);
  };

  // Handlers
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
      }
    });
  };

  // Filter Logic
  const filteredLogs = initialLogs.filter(log => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
      log.id.toLowerCase().includes(searchLower) ||
      log.bookingId.toLowerCase().includes(searchLower);
    
    const matchesStatus = statusFilter ? log.status === statusFilter : true;
    const matchesGateway = gatewayFilter ? log.gateway === gatewayFilter : true;

    return matchesSearch && matchesStatus && matchesGateway;
  });

  const rows = filteredLogs.map((log) => (
    <Table.Tr key={log.id}>
      <Table.Td>
        <Text size="sm" fw={500} style={{ fontFamily: 'monospace' }}>
          {log.id.split('-')[0] || log.id.substring(0, 8)}
        </Text>
        <Text size="xs" c="dimmed">Booking: {log.bookingId.substring(0, 8)}</Text>
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
    <>
      <Group justify="space-between" mb="lg">
        <div>
          <Title order={2}>Payment Logs</Title>
          <Text c="dimmed" size="sm">Monitor transactions and gateway webhooks</Text>
        </div>
      </Group>

      {/* Filters */}
      <Paper shadow="xs" p="md" mb="lg" withBorder>
        <Group>
          <TextInput 
            placeholder="Search Log ID or Booking ID..." 
            leftSection={<Search size={16} />} 
            style={{ flex: 1, minWidth: '200px' }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.currentTarget.value)}
          />
          <Select 
            placeholder="Gateway"
            data={[
              { value: 'stripe', label: 'Stripe' },
              { value: 'promptpay', label: 'PromptPay' },
              { value: 'truemoney', label: 'TrueMoney' },
              { value: 'other', label: 'Other' }
            ]}
            value={gatewayFilter}
            onChange={setGatewayFilter}
            clearable
            style={{ width: 150 }}
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
          />
        </Group>
      </Paper>

      {/* Table */}
      <Paper shadow="xs" withBorder>
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
                <Text size="sm" style={{ fontFamily: 'monospace' }}>{selectedLog.bookingId}</Text>
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
    </>
  );
}