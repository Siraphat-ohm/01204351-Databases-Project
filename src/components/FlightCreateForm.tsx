"use client";

import { 
  Button, Group, TextInput, Title, Paper, Select, Container, 
  NumberInput, Grid, Text, Stack, Divider, LoadingOverlay, Alert, Box, ThemeIcon
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useState, useTransition, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, Plus, Plane, MapPin, Clock, DollarSign, 
  Building, Calendar, AlertCircle, Check, X, ArrowRight 
} from 'lucide-react';
import { FlightStatus } from '@/generated/prisma/client';
import { createFlightAction } from '@/actions/flight-actions';

// --- Interfaces ---
interface AircraftOption {
  value: string;
  label: string;
  disabled: boolean;
}

interface RouteData {
  id: string;
  originCode: string;
  originCity: string;
  destCode: string;
  destCity: string;
}

interface FlightCreateFormProps {
  aircraftOptions: AircraftOption[];
  availableRoutes: RouteData[];
}

export function FlightCreateForm({ aircraftOptions, availableRoutes }: FlightCreateFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  // Form State
  const [formData, setFormData] = useState({
    flightCode: '',
    originCode: '', // Virtual field for UI
    destCode: '',   // Virtual field for UI
    aircraftId: '',
    status: 'SCHEDULED' as FlightStatus,
    gate: '',
    departureTime: '',
    arrivalTime: '',
    basePriceEconomy: 0,
    basePriceBusiness: 0,
    basePriceFirst: 0,
  });

  // ────────────────────────────────────────────────
  // Dynamic Route Dropdown Logic
  // ────────────────────────────────────────────────
  
  // 1. Extract unique origins from all available routes
  const originOptions = useMemo(() => {
    const originsMap = new Map();
    availableRoutes.forEach(route => {
      if (!originsMap.has(route.originCode)) {
        originsMap.set(route.originCode, {
          value: route.originCode,
          label: `${route.originCode} - ${route.originCity}`
        });
      }
    });
    return Array.from(originsMap.values());
  }, [availableRoutes]);

  // 2. Filter destinations based on the selected origin
  const destOptions = useMemo(() => {
    if (!formData.originCode) return [];
    
    return availableRoutes
      .filter(route => route.originCode === formData.originCode)
      .map(route => ({
        value: route.destCode,
        label: `${route.destCode} - ${route.destCity}`
      }));
  }, [formData.originCode, availableRoutes]);

  // 3. Find the specific Route ID based on the Origin + Dest combination
  const selectedRouteId = useMemo(() => {
    if (!formData.originCode || !formData.destCode) return null;
    const route = availableRoutes.find(
      r => r.originCode === formData.originCode && r.destCode === formData.destCode
    );
    return route ? route.id : null;
  }, [formData.originCode, formData.destCode, availableRoutes]);


  // ────────────────────────────────────────────────
  // Handlers
  // ────────────────────────────────────────────────
  const handleChange = (field: string, value: any) => {
    setFormData(prev => {
      const newState = { ...prev, [field]: value };
      // Reset destination if origin changes to prevent invalid pairs
      if (field === 'originCode') {
        newState.destCode = '';
      }
      return newState;
    });

    if (fieldErrors[field]) {
      setFieldErrors(prev => {
        const newErrs = { ...prev };
        delete newErrs[field];
        return newErrs;
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});

    // Pre-flight checks
    if (!selectedRouteId) {
      notifications.show({ title: "Route Required", message: "Please select a valid Origin and Destination pair.", color: "red" });
      return;
    }

    // Prepare Payload mapping exactly to Zod Schema
    const payload = {
      flightCode: formData.flightCode,
      routeId: selectedRouteId, // The resolved UUID from the database
      aircraftId: formData.aircraftId,
      gate: formData.gate || undefined,
      status: formData.status,
      departureTime: formData.departureTime, 
      arrivalTime: formData.arrivalTime,
      basePriceEconomy: formData.basePriceEconomy,
      basePriceBusiness: formData.basePriceBusiness,
      basePriceFirst: formData.basePriceFirst,
    };

    startTransition(async () => {
      const result = await createFlightAction(payload);
      
      if (result?.error) {
        if (result.fieldErrors) setFieldErrors(result.fieldErrors);
        notifications.show({ title: "Failed to Create Flight", message: result.error, color: "red", icon: <X size={18} /> });
      } else {
        notifications.show({ title: "Success", message: `Flight ${formData.flightCode} created.`, color: "green", icon: <Check size={18} /> });
        // Redirect handled by server action
      }
    });
  };

  return (
    <Container size="lg" py="xl" pos="relative">
      <LoadingOverlay visible={isPending} overlayProps={{ radius: "sm", blur: 2 }} />

      <Group justify="space-between" mb="lg">
        <Button variant="subtle" color="gray" leftSection={<ArrowLeft size={18} />} onClick={() => router.back()} disabled={isPending}>
          Back to List
        </Button>
        <Group>
           <Button variant="default" onClick={() => router.back()} disabled={isPending}>Cancel</Button>
           <Button onClick={handleSubmit} leftSection={<Plus size={18} />} loading={isPending}>
             Create Flight
           </Button>
        </Group>
      </Group>

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
                  onChange={(e) => handleChange('flightCode', e.currentTarget.value.toUpperCase())}
                  leftSection={<Plane size={16} />}
                  error={fieldErrors.flightCode?.join(', ')}
                  required
                />

                <Select
                  label="Assigned Aircraft"
                  placeholder="Select active aircraft"
                  data={aircraftOptions}
                  value={formData.aircraftId}
                  onChange={(val) => handleChange('aircraftId', val)}
                  searchable
                  leftSection={<Plane size={16} />}
                  error={fieldErrors.aircraftId?.join(', ')}
                  required
                />

                <Divider label="Network Route" labelPosition="center" />

                <Grid>
                  <Grid.Col span={6}>
                    <Select
                      label="Origin"
                      placeholder="Select Origin"
                      data={originOptions}
                      value={formData.originCode}
                      onChange={(val) => handleChange('originCode', val)}
                      searchable
                      leftSection={<MapPin size={16} />}
                      required
                    />
                  </Grid.Col>
                  <Grid.Col span={6}>
                    <Select
                      label="Destination"
                      placeholder="Select Dest"
                      data={destOptions}
                      value={formData.destCode}
                      onChange={(val) => handleChange('destCode', val)}
                      searchable
                      disabled={!formData.originCode} // Disable until origin is picked
                      leftSection={<MapPin size={16} />}
                      required
                    />
                  </Grid.Col>
                </Grid>

                {/* Visual Route Confirmation */}
                {selectedRouteId && (
                  <Paper bg="blue.0" p="sm" radius="md" style={{ border: '1px solid var(--mantine-color-blue-2)' }}>
                    <Group justify="center" gap="xs">
                      <Text fw={700} c="blue.8">{formData.originCode}</Text>
                      <ArrowRight size={16} className="text-blue-500" />
                      <Text fw={700} c="blue.8">{formData.destCode}</Text>
                    </Group>
                    <Text ta="center" size="xs" c="blue.6" mt={4}>Route pair verified</Text>
                  </Paper>
                )}
              </Stack>
            </Paper>
          </Grid.Col>

          {/* --- RIGHT COLUMN: SCHEDULE & OPERATIONS --- */}
          <Grid.Col span={{ base: 12, md: 7 }}>
            <Paper shadow="xs" p="xl" radius="md" withBorder>
              <Title order={4} mb="md">Schedule & Pricing</Title>
              
              <Stack gap="md">
                <Grid>
                  <Grid.Col span={6}>
                    <Select
                      label="Initial Status"
                      data={['SCHEDULED', 'BOARDING', 'DELAYED', 'DEPARTED', 'ARRIVED', 'CANCELLED']}
                      value={formData.status}
                      onChange={(val) => handleChange('status', val)}
                      error={fieldErrors.status?.join(', ')}
                    />
                  </Grid.Col>
                  <Grid.Col span={6}>
                    <TextInput
                      label="Gate Assignment"
                      placeholder="e.g. A1"
                      value={formData.gate}
                      onChange={(e) => handleChange('gate', e.currentTarget.value)}
                      leftSection={<Building size={16} />}
                      error={fieldErrors.gate?.join(', ')}
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
                      error={fieldErrors.departureTime?.join(', ')}
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
                      error={fieldErrors.arrivalTime?.join(', ')}
                      required
                    />
                  </Grid.Col>
                </Grid>

                <Divider label="Class Pricing (USD)" labelPosition="center" my="xs" />

                <Grid>
                  <Grid.Col span={4}>
                    <NumberInput
                      label="Economy Base"
                      placeholder="0.00"
                      prefix="$"
                      value={formData.basePriceEconomy}
                      onChange={(val) => handleChange('basePriceEconomy', val)}
                      decimalScale={2}
                      leftSection={<DollarSign size={16} />}
                      error={fieldErrors.basePriceEconomy?.join(', ')}
                      required
                    />
                  </Grid.Col>
                  <Grid.Col span={4}>
                    <NumberInput
                      label="Business Base"
                      placeholder="0.00"
                      prefix="$"
                      value={formData.basePriceBusiness}
                      onChange={(val) => handleChange('basePriceBusiness', val)}
                      decimalScale={2}
                      leftSection={<DollarSign size={16} />}
                      error={fieldErrors.basePriceBusiness?.join(', ')}
                      required
                    />
                  </Grid.Col>
                  <Grid.Col span={4}>
                    <NumberInput
                      label="First Class Base"
                      placeholder="0.00"
                      prefix="$"
                      value={formData.basePriceFirst}
                      onChange={(val) => handleChange('basePriceFirst', val)}
                      decimalScale={2}
                      leftSection={<DollarSign size={16} />}
                      error={fieldErrors.basePriceFirst?.join(', ')}
                      required
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