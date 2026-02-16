"use client";

import { 
  Button, Group, TextInput, Title, Paper, Select, Container, 
  NumberInput, Grid, Text, ThemeIcon, Stack, Divider, Badge, rem 
} from '@mantine/core';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Plane, MapPin, Clock, DollarSign, Building } from 'lucide-react';

// --- MOCK DATA FOR AIRCRAFT DROPDOWN ---
const MOCK_AIRCRAFT_FLEET = [
  { value: '101', label: 'HS-TBA (Boeing 777-300ER)' },
  { value: '102', label: 'HS-TBB (Boeing 777-300ER)' },
  { value: '103', label: 'HS-XEA (Airbus A350-900)' },
  { value: '104', label: 'HS-BBX (Airbus A320)' },
  { value: '105', label: 'HS-BBY (Airbus A320)' },
  { value: '106', label: 'HS-PGA (ATR 72-600)' },
];

export function FlightEditForm({ flight }: { flight: any }) {
  const router = useRouter();
  
  // Logic remains unchanged
  const currentAircraftOption = {
    value: flight.aircraft?.id?.toString() || '0',
    label: `${flight.aircraft?.tailNumber} (${flight.aircraft?.type?.model})`
  };

  const aircraftOptions = [
    ...MOCK_AIRCRAFT_FLEET.filter(a => a.value !== currentAircraftOption.value),
    currentAircraftOption
  ];

  const [formData, setFormData] = useState({
    status: flight.status,
    gate: flight.gate || '',
    basePrice: Number(flight.basePrice),
    departureTime: new Date(flight.departureTime).toISOString().slice(0, 16),
    aircraftId: currentAircraftOption.value 
  });

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Submitting update for Flight ID:", flight.id);
    console.log("New Aircraft ID:", formData.aircraftId);
    console.log("Full Payload:", formData);
    alert("Check console for payload. Save functionality will be connected later.");
  };

  return (
    <Container size="lg" py="xl">
      {/* --- HEADER ACTIONS --- */}
      <Group justify="space-between" mb="lg">
        <Button 
          variant="subtle" 
          color="gray" 
          leftSection={<ArrowLeft size={18} />} 
          onClick={() => router.back()}
        >
          Back to Flights
        </Button>
        <Group>
           <Button variant="default" onClick={() => router.back()}>Cancel</Button>
           <Button 
             onClick={handleSubmit} // Trigger form submit externally
             leftSection={<Save size={18} />}
           >
             Save Changes
           </Button>
        </Group>
      </Group>

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
                {/* Aircraft Selection */}
                <Select
                  label="Assigned Aircraft"
                  description="Change the aircraft servicing this route"
                  placeholder="Search tail number or model"
                  data={aircraftOptions}
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
                      comboboxProps={{ transitionProps: { transition: 'pop', duration: 200 } }}
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
                  <Grid.Col span={7}>
                    <TextInput
                      type="datetime-local"
                      label="Departure Time (Local)"
                      value={formData.departureTime}
                      onChange={(e) => handleChange('departureTime', e.currentTarget.value)}
                      leftSection={<Clock size={16} />}
                    />
                  </Grid.Col>
                  <Grid.Col span={5}>
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