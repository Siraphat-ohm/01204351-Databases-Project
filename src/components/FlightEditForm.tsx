"use client";

import { 
  Button, Group, TextInput, Title, Paper, Select, Container, 
  NumberInput, Grid, Text, ThemeIcon, Stack, Divider, LoadingOverlay, Alert, Box
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useState, useTransition, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, Save, Plane, MapPin, Clock, DollarSign, 
  Building, AlertCircle, Check, X, User 
} from 'lucide-react';
import { FlightStatus } from '@/generated/prisma/client'; 
import { updateFlightAction } from '@/actions/flight-actions';

interface AircraftOption {
  value: string;
  label: string;
  disabled: boolean;
}

interface FlightEditFormProps {
  flight: any; // Using the serializableFlight from our page
  aircraftOptions: AircraftOption[];
}

export function FlightEditForm({ flight, aircraftOptions }: FlightEditFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  // Initialize form data with the new multi-price structure
  const [formData, setFormData] = useState({
    flightCode: flight.flightCode,
    status: flight.status as FlightStatus,
    gate: flight.gate || '',
    aircraftId: flight.aircraftId || '',
    // New Pricing Fields
    basePriceEconomy: flight.basePriceEconomy || 0,
    basePriceBusiness: flight.basePriceBusiness || 0,
    basePriceFirst: flight.basePriceFirst || 0,
    // Times
    departureTime: new Date(flight.departureTime).toISOString().slice(0, 16),
    arrivalTime: new Date(flight.arrivalTime).toISOString().slice(0, 16),
  });
  // Optimize aircraft options lookup
  const memoizedOptions = useMemo(() => aircraftOptions, [aircraftOptions]);

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear field errors as user types
    if (fieldErrors[field]) {
      setFieldErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});

    startTransition(async () => {
      // Pass the string CUID and the updated formData
      const result = await updateFlightAction(flight.id, formData);

      if (result?.error) {
        if (result.fieldErrors) {
          setFieldErrors(result.fieldErrors);
        }
        notifications.show({
          title: "Update Failed",
          message: result.error,
          color: "red",
          icon: <X size={18} />,
        });
      } else {
        notifications.show({
          title: "Flight Updated",
          message: `Flight ${flight.flightCode} has been updated successfully.`,
          color: "green",
          icon: <Check size={18} />,
        });
        router.push("/dashboard/flights");
        router.refresh();
      }
    });
  };

  return (
    <Container size="lg" py="xl" pos="relative">
      <LoadingOverlay visible={isPending} overlayProps={{ radius: "sm", blur: 2 }} />

      <Group justify="space-between" mb="lg">
        <Button 
          variant="subtle" 
          color="gray" 
          leftSection={<ArrowLeft size={18} />} 
          onClick={() => router.back()} 
          disabled={isPending}
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

      <form onSubmit={handleSubmit}>
        <Grid gutter="lg">
          {/* --- LEFT COLUMN: READ ONLY SUMMARY --- */}
          <Grid.Col span={{ base: 12, md: 4 }}>
            <Paper shadow="xs" p="xl" radius="md" withBorder h="100%" bg="var(--mantine-color-gray-0)">
              <Stack gap="lg">
                <div>
                   <Text c="dimmed" size="xs" tt="uppercase" fw={700} mb={5}>Flight Assignment</Text>
                   <Group>
                      <ThemeIcon variant="light" size="lg" color="blue"><Plane size={20}/></ThemeIcon>
                      <Title order={2}>{flight.flightCode}</Title>
                   </Group>
                </div>

                <Divider />

                <div>
                  <Text c="dimmed" size="xs" tt="uppercase" fw={700} mb="xs">Route Summary</Text>
                  <Stack gap="md">
                    <Group align="flex-start" wrap="nowrap">
                       <ThemeIcon variant="outline" color="gray" size="sm"><MapPin size={14}/></ThemeIcon>
                       <Box>
                          <Text fw={600} lh={1}>{flight.route.origin.iataCode}</Text>
                          <Text size="sm" c="dimmed">{flight.route.origin.city}</Text>
                       </Box>
                    </Group>
                    
                    <Box ml={13} h={20} style={{ borderLeft: '2px dashed var(--mantine-color-gray-4)' }} />

                    <Group align="flex-start" wrap="nowrap">
                       <ThemeIcon variant="filled" color="blue" size="sm"><MapPin size={14}/></ThemeIcon>
                       <Box>
                          <Text fw={600} lh={1}>{flight.route.destination.iataCode}</Text>
                          <Text size="sm" c="dimmed">{flight.route.destination.city}</Text>
                       </Box>
                    </Group>
                  </Stack>
                </div>
              </Stack>
            </Paper>
          </Grid.Col>

          {/* --- RIGHT COLUMN: EDITABLE DETAILS --- */}
          <Grid.Col span={{ base: 12, md: 8 }}>
            <Paper shadow="xs" p="xl" radius="md" withBorder>
              <Stack gap="md">
                <Title order={4}>Flight Operations</Title>
                
                <Select
                  label="Assigned Aircraft"
                  description="Required for active flight operations"
                  placeholder="Select aircraft"
                  data={memoizedOptions} 
                  value={formData.aircraftId}
                  onChange={(val) => handleChange('aircraftId', val)}
                  searchable
                  error={fieldErrors.aircraftId?.join(', ')}
                  leftSection={<Plane size={16} />}
                />

                <Grid>
                  <Grid.Col span={6}>
                    <Select
                      label="Flight Status"
                      data={['SCHEDULED', 'BOARDING', 'DELAYED', 'DEPARTED', 'ARRIVED', 'CANCELLED']}
                      value={formData.status}
                      onChange={(val) => handleChange('status', val)}
                      error={fieldErrors.status?.join(', ')}
                    />
                  </Grid.Col>
                  <Grid.Col span={6}>
                    <TextInput
                      label="Gate"
                      placeholder="e.g. A12"
                      value={formData.gate}
                      onChange={(e) => handleChange('gate', e.currentTarget.value)}
                      leftSection={<Building size={16} />}
                      error={fieldErrors.gate?.join(', ')}
                    />
                  </Grid.Col>
                </Grid>

                <Divider label="Departure & Arrival" labelPosition="center" my="sm" />

                <Grid>
                  <Grid.Col span={6}>
                    <TextInput
                      type="datetime-local"
                      label="Scheduled Departure"
                      value={formData.departureTime}
                      onChange={(e) => handleChange('departureTime', e.currentTarget.value)}
                      leftSection={<Clock size={16} />}
                      error={fieldErrors.departureTime?.join(', ')}
                    />
                  </Grid.Col>
                  <Grid.Col span={6}>
                    <TextInput
                      type="datetime-local"
                      label="Scheduled Arrival"
                      value={formData.arrivalTime}
                      onChange={(e) => handleChange('arrivalTime', e.currentTarget.value)}
                      leftSection={<Clock size={16} />}
                      error={fieldErrors.arrivalTime?.join(', ')}
                    />
                  </Grid.Col>
                </Grid>

                <Divider label="Class Pricing (USD)" labelPosition="center" my="sm" />

                <Grid>
                  <Grid.Col span={4}>
                    <NumberInput
                      label="Economy"
                      prefix="$"
                      value={formData.basePriceEconomy}
                      onChange={(val) => handleChange('basePriceEconomy', val)}
                      decimalScale={2}
                      leftSection={<DollarSign size={16} />}
                      error={fieldErrors.basePriceEconomy?.join(', ')}
                    />
                  </Grid.Col>
                  <Grid.Col span={4}>
                    <NumberInput
                      label="Business"
                      prefix="$"
                      value={formData.basePriceBusiness}
                      onChange={(val) => handleChange('basePriceBusiness', val)}
                      decimalScale={2}
                      leftSection={<DollarSign size={16} />}
                      error={fieldErrors.basePriceBusiness?.join(', ')}
                    />
                  </Grid.Col>
                  <Grid.Col span={4}>
                    <NumberInput
                      label="First Class"
                      prefix="$"
                      value={formData.basePriceFirst}
                      onChange={(val) => handleChange('basePriceFirst', val)}
                      decimalScale={2}
                      leftSection={<DollarSign size={16} />}
                      error={fieldErrors.basePriceFirst?.join(', ')}
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