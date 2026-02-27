"use client";

import { 
  Title, Group, Table, Badge, Text, ActionIcon, 
  TextInput, Paper, Modal, Stack, Alert,
  Code, ScrollArea, Button, Accordion, Avatar,
  ThemeIcon, Divider
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { Search, Eye, AlertTriangle, CloudRain, DoorOpen, Wrench, User, Plane, Plus, CheckCircle, XCircle } from 'lucide-react';
import { useState, useTransition } from 'react';
import { patchFlightOpsLogAction } from '@/actions/flight-op-actions';

// --- Types matching sanitized data ---
interface GateChange {
  from: string;
  to: string;
  time: string; // ISO string
  reason: string;
}

interface WeatherConditions {
  origin: string;
  destination: string;
}

interface ClientOpsLog {
  id: string;
  flightId: string;
  captainName: string;
  gateChanges: GateChange[];
  weatherConditions: WeatherConditions | null;
  incidents: string[];
  maintenanceChecklist: Record<string, unknown>;
  createdAt: string;
}

interface FlightOpsLogManagementProps {
  initialLogs: ClientOpsLog[];
  userRole: string;
}

export function FlightOpsLogManagement({ initialLogs, userRole }: FlightOpsLogManagementProps) {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal State
  const [opened, { open, close }] = useDisclosure(false);
  const [selectedLog, setSelectedLog] = useState<ClientOpsLog | null>(null);
  
  // Edit State
  const [isPending, startTransition] = useTransition();
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [newIncident, setNewIncident] = useState('');

  // Permission Check based on your service logic
  const canWrite = ['ADMIN', 'GROUND_STAFF'].includes(userRole);

  // Handlers
  const handleViewLog = (log: ClientOpsLog) => {
    setSelectedLog(log);
    setNewIncident('');
    setUpdateError(null);
    open();
  };

  const handleAddIncident = () => {
    if (!selectedLog || !newIncident.trim()) return;

    startTransition(async () => {
      const updatedIncidents = [...selectedLog.incidents, newIncident.trim()];
      
      const result = await patchFlightOpsLogAction(selectedLog.id, {
        incidents: updatedIncidents
      });
      
      if (result?.error) {
        setUpdateError(result.error);
      } else {
        // Optimistic update
        setSelectedLog({ ...selectedLog, incidents: updatedIncidents });
        setNewIncident('');
      }
    });
  };

  // Filter Logic
  const filteredLogs = initialLogs.filter(log => {
    const searchLower = searchTerm.toLowerCase();
    return (
      log.flightId.toLowerCase().includes(searchLower) ||
      log.captainName.toLowerCase().includes(searchLower)
    );
  });

  const rows = filteredLogs.map((log) => (
    <Table.Tr key={log.id}>
      <Table.Td>
        <Group gap="xs">
          <ThemeIcon variant="light" color="blue"><Plane size={14} /></ThemeIcon>
          <Text size="sm" fw={600} style={{ fontFamily: 'monospace' }}>
            {log.flightId.substring(0, 8).toUpperCase()}
          </Text>
        </Group>
      </Table.Td>

      <Table.Td>
        <Group gap="xs">
          <Avatar size="sm" color="gray" radius="xl">{log.captainName.charAt(0)}</Avatar>
          <Text size="sm">{log.captainName}</Text>
        </Group>
      </Table.Td>

      <Table.Td>
        {log.incidents.length > 0 ? (
          <Badge color="red" variant="light" leftSection={<AlertTriangle size={12}/>}>
            {log.incidents.length} Incidents
          </Badge>
        ) : (
          <Badge color="green" variant="dot">Clear</Badge>
        )}
      </Table.Td>

      <Table.Td>
        {log.gateChanges.length > 0 ? (
          <Badge color="orange" variant="light">{log.gateChanges.length} Changes</Badge>
        ) : (
          <Text size="xs" c="dimmed">No Changes</Text>
        )}
      </Table.Td>

      <Table.Td>
        <Text size="sm">
          {new Date(log.createdAt).toLocaleDateString('en-GB')}
        </Text>
      </Table.Td>

      <Table.Td>
        <Group gap={0} justify="flex-end">
          <Button variant="subtle" size="xs" onClick={() => handleViewLog(log)} leftSection={<Eye size={14}/>}>
            View Log
          </Button>
        </Group>
      </Table.Td>
    </Table.Tr>
  ));

  return (
    <>
      <Group justify="space-between" mb="lg">
        <div>
          <Title order={2}>Flight Operation Logs</Title>
          <Text c="dimmed" size="sm">Post-flight reporting, gate tracking, and incidents</Text>
        </div>
      </Group>

      {/* Filters */}
      <Paper shadow="xs" p="md" mb="lg" withBorder>
        <TextInput 
          placeholder="Search by Flight ID or Captain Name..." 
          leftSection={<Search size={16} />} 
          style={{ maxWidth: '400px' }}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.currentTarget.value)}
        />
      </Paper>

      {/* Table */}
      <Paper shadow="xs" withBorder>
        <Table.ScrollContainer minWidth={800}>
          <Table verticalSpacing="sm" striped highlightOnHover>
            <Table.Thead bg="gray.0">
              <Table.Tr>
                <Table.Th style={{ width: '20%' }}>Flight ID</Table.Th>
                <Table.Th style={{ width: '25%' }}>Captain In Command</Table.Th>
                <Table.Th style={{ width: '15%' }}>Incidents</Table.Th>
                <Table.Th style={{ width: '15%' }}>Gate Operations</Table.Th>
                <Table.Th style={{ width: '15%' }}>Log Date</Table.Th>
                <Table.Th style={{ width: '10%', textAlign: 'right' }}>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {rows.length > 0 ? rows : (
                <Table.Tr>
                  <Table.Td colSpan={6}>
                    <Text ta="center" c="dimmed" py="xl">No operational logs found.</Text>
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
        title={<Group gap="xs"><Plane size={20} /><Text fw={700} size="lg">Log Details</Text></Group>}
        size="xl"
      >
        {selectedLog && (
          <Stack>
            {updateError && (
              <Alert color="red" title="Error">
                {updateError}
              </Alert>
            )}

            <Group grow align="flex-start">
              <Paper p="sm" bg="gray.0" radius="md">
                <Text size="xs" c="dimmed" fw={600}>FLIGHT ID</Text>
                <Text size="sm" fw={600} style={{ fontFamily: 'monospace' }}>{selectedLog.flightId}</Text>
              </Paper>
              <Paper p="sm" bg="gray.0" radius="md">
                <Text size="xs" c="dimmed" fw={600}>CAPTAIN</Text>
                <Group gap="xs" mt={2}>
                   <User size={14} />
                   <Text size="sm" fw={600}>{selectedLog.captainName}</Text>
                </Group>
              </Paper>
            </Group>

            <Accordion defaultValue="incidents" variant="separated">
              {/* INCIDENTS SECTION */}
              <Accordion.Item value="incidents">
                <Accordion.Control icon={<AlertTriangle size={18} color="red" />}>
                  <Text fw={600}>Reported Incidents ({selectedLog.incidents.length})</Text>
                </Accordion.Control>
                <Accordion.Panel>
                  {selectedLog.incidents.length > 0 ? (
                    <Stack gap="xs" mb="md">
                      {selectedLog.incidents.map((inc, i) => (
                        <Alert key={i} color="red" variant="light" p="xs">
                          {inc}
                        </Alert>
                      ))}
                    </Stack>
                  ) : (
                    <Text size="sm" c="dimmed" mb="md">No incidents reported.</Text>
                  )}

                  {/* Add Incident Form (Only if has write permission) */}
                  {canWrite && (
                    <Group align="flex-end">
                      <TextInput 
                        placeholder="Log a new incident..." 
                        style={{ flex: 1 }}
                        value={newIncident}
                        onChange={(e) => setNewIncident(e.currentTarget.value)}
                        disabled={isPending}
                      />
                      <Button 
                        onClick={handleAddIncident} 
                        loading={isPending}
                        color="red"
                        leftSection={<Plus size={14} />}
                      >
                        Add
                      </Button>
                    </Group>
                  )}
                </Accordion.Panel>
              </Accordion.Item>

              {/* WEATHER SECTION */}
              <Accordion.Item value="weather">
                <Accordion.Control icon={<CloudRain size={18} color="blue" />}>
                  <Text fw={600}>Weather Conditions</Text>
                </Accordion.Control>
                <Accordion.Panel>
                  {selectedLog.weatherConditions ? (
                    <Group grow>
                       <Paper withBorder p="xs">
                          <Text size="xs" c="dimmed" fw={700}>ORIGIN WEATHER</Text>
                          <Text size="sm">{selectedLog.weatherConditions.origin}</Text>
                       </Paper>
                       <Paper withBorder p="xs">
                          <Text size="xs" c="dimmed" fw={700}>DESTINATION WEATHER</Text>
                          <Text size="sm">{selectedLog.weatherConditions.destination}</Text>
                       </Paper>
                    </Group>
                  ) : (
                    <Text size="sm" c="dimmed">No weather data recorded.</Text>
                  )}
                </Accordion.Panel>
              </Accordion.Item>

              {/* GATE CHANGES SECTION */}
              <Accordion.Item value="gate">
                <Accordion.Control icon={<DoorOpen size={18} color="orange" />}>
                  <Text fw={600}>Gate Changes ({selectedLog.gateChanges.length})</Text>
                </Accordion.Control>
                <Accordion.Panel>
                  {selectedLog.gateChanges.length > 0 ? (
                    <Stack gap="xs">
                      {selectedLog.gateChanges.map((gc, i) => (
                        <Paper key={i} withBorder p="xs">
                          <Group justify="space-between">
                            <Group gap="xs">
                              <Badge color="gray">{gc.from}</Badge>
                              <Text size="sm">→</Text>
                              <Badge color="blue">{gc.to}</Badge>
                            </Group>
                            <Text size="xs" c="dimmed">{new Date(gc.time).toLocaleTimeString()}</Text>
                          </Group>
                          <Text size="sm" mt="xs"><span style={{ fontWeight: 600 }}>Reason:</span> {gc.reason}</Text>
                        </Paper>
                      ))}
                    </Stack>
                  ) : (
                    <Text size="sm" c="dimmed">No gate changes recorded.</Text>
                  )}
                </Accordion.Panel>
              </Accordion.Item>

              {/* MAINTENANCE SECTION */}
              <Accordion.Item value="maintenance">
                <Accordion.Control icon={<Wrench size={18} color="gray" />}>
                  <Text fw={600}>Maintenance Checklist</Text>
                </Accordion.Control>
                <Accordion.Panel>
                  {selectedLog.maintenanceChecklist && Object.keys(selectedLog.maintenanceChecklist).length > 0 ? (
                    <Stack gap="sm">
                      {Object.entries(selectedLog.maintenanceChecklist).map(([key, value]) => {
                        // Format the camelCase keys (e.g., "fuelChecked" -> "Fuel Checked")
                        const formattedKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                        
                        // Check if the value is truthy (checked) or falsy
                        const isChecked = Boolean(value);

                        return (
                          <Group key={key} justify="space-between" wrap="nowrap">
                            <Text size="sm">{formattedKey}</Text>
                            {isChecked ? (
                              <Group gap="xs" c="green">
                                <CheckCircle size={16} />
                                <Text size="sm" fw={500}>Passed</Text>
                              </Group>
                            ) : (
                              <Group gap="xs" c="red">
                                <XCircle size={16} />
                                <Text size="sm" fw={500}>Failed / Pending</Text>
                              </Group>
                            )}
                          </Group>
                        );
                      })}
                    </Stack>
                  ) : (
                    <Text size="sm" c="dimmed">No maintenance records available.</Text>
                  )}
                  
                  {/* Keep the raw JSON view available for complex nested objects or debugging
                  {canWrite && (
                    <>
                      <Divider my="md" label="Raw Data" labelPosition="center" />
                      <ScrollArea h={120} type="hover">
                        <Code block style={{ whiteSpace: 'pre-wrap' }}>
                          {JSON.stringify(selectedLog.maintenanceChecklist, null, 2)}
                        </Code>
                      </ScrollArea>
                    </>
                  )} */}
                </Accordion.Panel>
              </Accordion.Item>
            </Accordion>
          </Stack>
        )}
      </Modal>
    </>
  );
}