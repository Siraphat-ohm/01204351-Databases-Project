"use client";

import { 
  Button, Group, TextInput, Title, Paper, Select, Container, 
  NumberInput, Grid, Text, ThemeIcon, Stack, Divider, LoadingOverlay, Alert
} from '@mantine/core';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Plane, MapPin, Clock, DollarSign, Building, AlertCircle } from 'lucide-react';
import { FlightStatus } from '@/generated/prisma/client'; 
import { updateFlightAction } from '@/actions/flight-actions';

// Define the interface for the props
interface AircraftOption {
  value: string;
  label: string;
  disabled: boolean;
}

interface FlightEditFormProps {
  flight: any;
  aircraftOptions: AircraftOption[]; // ✅ Received from Server
}

export function FlightEditForm({ flight, aircraftOptions }: FlightEditFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [aircraftOptionsState, setAircraftOptionsState] = useState<AircraftOption[]>(aircraftOptions); // ✅ Store in state
  // ✅ Debug Log: Check what the server passed
  const [formData, setFormData] = useState({
    status: flight.status as FlightStatus,
    gate: flight.gate || '',
    basePrice: Number(flight.basePrice),
    departureTime: new Date(flight.departureTime).toISOString().slice(0, 16),
    arrivalTime: flight.arrivalTime 
      ? new Date(flight.arrivalTime).toISOString().slice(0, 16)
      : new Date(new Date(flight.departureTime).getTime() + 2 * 60 * 60 * 1000).toISOString().slice(0, 16),
    aircraftId: flight.aircraft?.id?.toString() || '',
    flightCode: flight.flightCode, 
  });

  // ❌ REMOVED: useEffect fetch logic (It was conflicting and causing the undefined error)

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await updateFlightAction(flight.id, formData);
      if (result?.error) {
        setError(result.error);
      }
    });
  };

  return (
    <Container size="lg" py="xl" pos="relative">
      <LoadingOverlay visible={isPending} overlayProps={{ radius: "sm", blur: 2 }} />

      <Group justify="space-between" mb="lg">
        <Button 
          variant="subtle" color="gray" leftSection={<ArrowLeft size={18} />} 
          onClick={() => router.back()} disabled={isPending}
        >
          Back to Flights
        </Button>
        <Group>
           <Button variant="default" onClick={() => router.back()} disabled={isPending}>Cancel</Button>
           <Button 
             onClick={handleSubmit} 
             leftSection={<Save size={18} />}
             loading={isPending}
           >
             Save Changes
           </Button>
        </Group>
      </Group>

      {error && (
        <Alert variant="light" color="red" title="Error" icon={<AlertCircle size={16} />} mb="md">
          {error}
        </Alert>
      )}

      <form onSubmit={handleSubmit}>
        <Grid gutter="lg">
          
          {/* --- LEFT COLUMN: FLIGHT SUMMARY (READ ONLY) --- */}
          <Grid.Col span={{ base: 12, md: 4 }}>
            <Paper shadow="xs" p="xl" radius="md" withBorder h="100%" bg="var(--mantine-color-gray-0)">
              <Stack gap="lg">
                <div>
                   <Text c="dimmed" size="xs" tt="uppercase" fw={700} mb={5}>Flight Number</Text>
                   <Group>
                      <ThemeIcon variant="light" size="lg" color="blue"><Plane size={20}/></ThemeIcon>
                      <Title order={2}>{flight.flightCode}</Title>
                   </Group>
                </div>

                <Divider />

                <div>
                  <Text c="dimmed" size="xs" tt="uppercase" fw={700} mb="xs">Route Information</Text>
                  <Stack gap="md">
                    <Group align="flex-start" wrap="nowrap">
                       <ThemeIcon variant="outline" color="gray" size="sm"><MapPin size={14}/></ThemeIcon>
                       <div>
                          <Text fw={600} lh={1}>{flight.route.origin.iataCode}</Text>
                          <Text size="sm" c="dimmed">{flight.route.origin.city}</Text>
                       </div>
                    </Group>
                    
                    <div style={{ borderLeft: '2px dashed var(--mantine-color-gray-4)', height: 20, marginLeft: 13 }} />

                    <Group align="flex-start" wrap="nowrap">
                       <ThemeIcon variant="filled" color="blue" size="sm"><MapPin size={14}/></ThemeIcon>
                       <div>
                          <Text fw={600} lh={1}>{flight.route.destination.iataCode}</Text>
                          <Text size="sm" c="dimmed">{flight.route.destination.city}</Text>
                       </div>
                    </Group>
                  </Stack>
                </div>
              </Stack>
            </Paper>
          </Grid.Col>

          {/* --- RIGHT COLUMN: EDITABLE FORM --- */}
          <Grid.Col span={{ base: 12, md: 8 }}>
            <Paper shadow="xs" p="xl" radius="md" withBorder>
              <Title order={4} mb="md">Operational Details</Title>
              
              <Stack gap="md">
                {/* ✅ CORRECT: Use the prop directly */}
                <Select
                  label="Assigned Aircraft"
                  description="Change the aircraft servicing this route"
                  placeholder="Search tail number or model"
                  data={aircraftOptionsState} 
                  value={formData.aircraftId}
                  onChange={(val) => handleChange('aircraftId', val)}
                  searchable
                  nothingFoundMessage="No aircraft found"
                  maxDropdownHeight={200}
                  leftSection={<Plane size={16} />}
                />

                <Grid>
                  <Grid.Col span={6}>
                    <Select
                      label="Current Status"
                      data={['SCHEDULED', 'BOARDING', 'DELAYED', 'DEPARTED', 'ARRIVED', 'CANCELLED']}
                      value={formData.status}
                      onChange={(val) => handleChange('status', val)}
                    />
                  </Grid.Col>
                  <Grid.Col span={6}>
                    <TextInput
                      label="Gate Assignment"
                      placeholder="e.g. C3"
                      value={formData.gate}
                      onChange={(e) => handleChange('gate', e.currentTarget.value)}
                      leftSection={<Building size={16} />}
                    />
                  </Grid.Col>
                </Grid>

                <Divider label="Schedule & Pricing" labelPosition="center" my="sm" />

                <Grid>
                  <Grid.Col span={6}>
                    <TextInput
                      type="datetime-local"
                      label="Departure Time (Local)"
                      value={formData.departureTime}
                      onChange={(e) => handleChange('departureTime', e.currentTarget.value)}
                      leftSection={<Clock size={16} />}
                    />
                  </Grid.Col>
                  <Grid.Col span={6}>
                    <TextInput
                      type="datetime-local"
                      label="Arrival Time (Local)"
                      value={formData.arrivalTime}
                      onChange={(e) => handleChange('arrivalTime', e.currentTarget.value)}
                      leftSection={<Clock size={16} />}
                    />
                  </Grid.Col>
                  <Grid.Col span={12}>
                    <NumberInput
                      label="Base Ticket Price"
                      prefix="$"
                      value={formData.basePrice}
                      onChange={(val) => handleChange('basePrice', val)}
                      decimalScale={2}
                      fixedDecimalScale
                      leftSection={<DollarSign size={16} />}
                    />
                  </Grid.Col>
                </Grid>

              </Stack>
            </Paper>
          </Grid.Col>
        </Grid>
      </form>
    </Container>
  );
}