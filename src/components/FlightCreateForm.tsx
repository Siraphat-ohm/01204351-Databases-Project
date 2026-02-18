"use client";

import { 
  Button, Group, TextInput, Title, Paper, Select, Container, 
  NumberInput, Grid, Text, Stack, Divider, LoadingOverlay, Alert
} from '@mantine/core';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Plane, MapPin, Clock, DollarSign, Building, Calendar, AlertCircle } from 'lucide-react';
import { FlightStatus } from '@/generated/prisma/client';
import { createFlightAction } from '@/app/actions/flight-actions'; // Import the action

// --- MOCK DATA (Ideally this should come from props) ---
const MOCK_AIRCRAFT_FLEET = [
  { value: '1', label: 'HS-TBA (Boeing 777-300ER)' },
  { value: '2', label: 'HS-TBB (Boeing 777-300ER)' },
  { value: '3', label: 'HS-XEA (Airbus A350-900)' },
  { value: '4', label: 'HS-BBX (Airbus A320)' },
  { value: '5', label: 'HS-BBY (Airbus A320)' },
  { value: '6', label: 'HS-PGA (ATR 72-600)' },
];

const MOCK_AIRPORTS = [
  { value: 'BKK', label: 'Bangkok (Suvarnabhumi)' },
  { value: 'DMK', label: 'Bangkok (Don Mueang)' },
  { value: 'NRT', label: 'Tokyo (Narita)' },
  { value: 'HND', label: 'Tokyo (Haneda)' },
  { value: 'SIN', label: 'Singapore (Changi)' },
  { value: 'LHR', label: 'London (Heathrow)' },
  { value: 'HKT', label: 'Phuket' },
  { value: 'CNX', label: 'Chiang Mai' },
];

export function FlightCreateForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    flightCode: '',
    origin: '',
    destination: '',
    aircraftId: '',
    status: 'SCHEDULED' as FlightStatus,
    gate: '',
    departureTime: '',
    arrivalTime: '',
    basePrice: 0,
  });

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // 1. Validation Logic
    if (!formData.flightCode || !formData.aircraftId || !formData.departureTime || !formData.arrivalTime) {
      setError("Please fill in all required fields.");
      return;
    }

    // 2. Prepare Payload (Convert Types)
    const payload = {
      flightCode: formData.flightCode,
      routeId: 1, // ⚠️ HARDCODED: You need logic to find Route ID based on Origin/Dest
      aircraftId: Number(formData.aircraftId),
      captainId: undefined, // Optional
      gate: formData.gate || undefined,
      departureTime: new Date(formData.departureTime),
      arrivalTime: new Date(formData.arrivalTime),
      basePrice: formData.basePrice,
      status: formData.status,
    };

    // 3. Server Action Call
    startTransition(async () => {
      const result = await createFlightAction(payload);
      if (result?.error) {
        setError(result.error);
      }
      // If success, redirect happens automatically in the action
    });
  };

  return (
    <Container size="lg" py="xl" pos="relative">
      <LoadingOverlay visible={isPending} overlayProps={{ radius: "sm", blur: 2 }} />

      {/* --- HEADER ACTIONS --- */}
      <Group justify="space-between" mb="lg">
        <Button 
          variant="subtle" 
          color="gray" 
          leftSection={<ArrowLeft size={18} />} 
          onClick={() => router.back()}
          disabled={isPending}
        >
          Back to List
        </Button>
        <Group>
           <Button variant="default" onClick={() => router.back()} disabled={isPending}>Cancel</Button>
           <Button 
             onClick={handleSubmit} 
             leftSection={<Plus size={18} />}
             loading={isPending}
           >
             Create Flight
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
          
          {/* --- LEFT COLUMN: CORE IDENTIFICATION --- */}
          <Grid.Col span={{ base: 12, md: 5 }}>
            <Paper shadow="xs" p="xl" radius="md" withBorder h="100%">
              <Title order={4} mb="md">Flight Identification</Title>
              <Stack gap="md">
                
                <TextInput 
                  label="Flight Code" 
                  placeholder="e.g. TG101" 
                  value={formData.flightCode}
                  onChange={(e) => handleChange('flightCode', e.currentTarget.value)}
                  leftSection={<Plane size={16} />}
                  required
                />

                <Select
                  label="Assigned Aircraft"
                  placeholder="Select aircraft"
                  data={MOCK_AIRCRAFT_FLEET}
                  value={formData.aircraftId}
                  onChange={(val) => handleChange('aircraftId', val)}
                  searchable
                  leftSection={<Plane size={16} />}
                  required
                />

                <Divider label="Route Selection" labelPosition="center" />

                <Grid>
                  <Grid.Col span={6}>
                    <Select
                      label="Origin"
                      placeholder="Origin"
                      data={MOCK_AIRPORTS}
                      value={formData.origin}
                      onChange={(val) => handleChange('origin', val)}
                      searchable
                      leftSection={<MapPin size={16} />}
                      required
                    />
                  </Grid.Col>
                  <Grid.Col span={6}>
                    <Select
                      label="Destination"
                      placeholder="Dest"
                      data={MOCK_AIRPORTS}
                      value={formData.destination}
                      onChange={(val) => handleChange('destination', val)}
                      searchable
                      leftSection={<MapPin size={16} />}
                      required
                    />
                  </Grid.Col>
                </Grid>

                {/* Visual Route Confirmation */}
                {formData.origin && formData.destination && (
                  <Paper bg="gray.1" p="sm" radius="md">
                    <Group justify="center" gap="xs">
                      <Text fw={700} c="blue">{formData.origin}</Text>
                      <Text c="dimmed">→</Text>
                      <Text fw={700} c="blue">{formData.destination}</Text>
                    </Group>
                  </Paper>
                )}
              </Stack>
            </Paper>
          </Grid.Col>

          {/* --- RIGHT COLUMN: SCHEDULE & OPERATIONS --- */}
          <Grid.Col span={{ base: 12, md: 7 }}>
            <Paper shadow="xs" p="xl" radius="md" withBorder>
              <Title order={4} mb="md">Schedule & Operations</Title>
              
              <Stack gap="md">
                <Grid>
                  <Grid.Col span={6}>
                    <Select
                      label="Initial Status"
                      data={['SCHEDULED', 'BOARDING', 'DELAYED', 'DEPARTED', 'ARRIVED', 'CANCELLED']}
                      value={formData.status}
                      onChange={(val) => handleChange('status', val)}
                      defaultValue="SCHEDULED"
                    />
                  </Grid.Col>
                  <Grid.Col span={6}>
                    <TextInput
                      label="Gate Assignment"
                      placeholder="e.g. A1"
                      value={formData.gate}
                      onChange={(e) => handleChange('gate', e.currentTarget.value)}
                      leftSection={<Building size={16} />}
                    />
                  </Grid.Col>
                </Grid>

                <Divider label="Timing" labelPosition="center" my="xs" />

                <Grid>
                  <Grid.Col span={6}>
                    <TextInput
                      type="datetime-local"
                      label="Departure Time"
                      value={formData.departureTime}
                      onChange={(e) => handleChange('departureTime', e.currentTarget.value)}
                      leftSection={<Calendar size={16} />}
                      required
                    />
                  </Grid.Col>
                  <Grid.Col span={6}>
                    <TextInput
                      type="datetime-local"
                      label="Arrival Time"
                      value={formData.arrivalTime}
                      onChange={(e) => handleChange('arrivalTime', e.currentTarget.value)}
                      leftSection={<Clock size={16} />}
                      required
                    />
                  </Grid.Col>
                </Grid>

                <Divider label="Economics" labelPosition="center" my="xs" />

                <NumberInput
                  label="Base Ticket Price"
                  placeholder="0.00"
                  prefix="$"
                  value={formData.basePrice}
                  onChange={(val) => handleChange('basePrice', val)}
                  decimalScale={2}
                  fixedDecimalScale
                  leftSection={<DollarSign size={16} />}
                  required
                />
              </Stack>
            </Paper>
          </Grid.Col>
        </Grid>
      </form>
    </Container>
  );
}