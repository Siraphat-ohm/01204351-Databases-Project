"use client";

import { 
  Button, Group, Title, Paper, Container, 
  NumberInput, Grid, Stack, Divider, LoadingOverlay, Select, Checkbox, Text, Alert
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useState, useTransition, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, MapPin, Check, X, Gauge, Clock, Calculator, AlertTriangle } from 'lucide-react';
import { createRouteAction } from '@/actions/route-actions';

interface AirportOption {
  id: string;
  iataCode: string;
  city: string;
  lat: number;
  lon: number;
}

interface RouteCreateFormProps {
  airports: AirportOption[];
}

// --- Helper Functions ---
const deg2rad = (deg: number) => deg * (Math.PI / 180);

const calculateHaversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; 
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; 
};

export function RouteCreateForm({ airports }: RouteCreateFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  
  // Enhanced Error State
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [globalError, setGlobalError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    originAirportId: '',
    destAirportId: '',
    distanceKm: 0,
    durationMins: 0,
    createReturn: false,
  });

  const airportSelectOptions = useMemo(() => {
    return airports.map(a => ({
      value: a.id,
      label: `${a.iataCode} - ${a.city}`,
    }));
  }, [airports]);

  // Instant Client-Side Validation
  const isSameAirport = formData.originAirportId && formData.destAirportId && formData.originAirportId === formData.destAirportId;

  const handleFormChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    if (globalError) setGlobalError(null);
    
    if (fieldErrors[field]) {
      setFieldErrors(prev => {
        const newErrs = { ...prev };
        delete newErrs[field];
        return newErrs;
      });
    }
  };

  const handleAutoCalculate = () => {
    if (isSameAirport) return; 

    const origin = airports.find(a => a.id === formData.originAirportId);
    const dest = airports.find(a => a.id === formData.destAirportId);

    if (!origin || !dest) {
      notifications.show({
        title: "Missing Airports",
        message: "Please select both Origin and Destination first.",
        color: "orange",
        icon: <AlertTriangle size={18} />
      });
      return;
    }

    if (origin.lat == null || origin.lon == null || dest.lat == null || dest.lon == null) {
      setGlobalError(`Missing coordinate data for calculation. ${origin.iataCode} or ${dest.iataCode} needs to be updated in the Airports tab.`);
      return;
    }

    const rawDistance = calculateHaversineDistance(origin.lat, origin.lon, dest.lat, dest.lon);
    const roundedDistance = Math.ceil(rawDistance);

    const flightTimeMins = (rawDistance / 800) * 60;
    const roundedDuration = Math.ceil(flightTimeMins + 30);

    setFormData(prev => ({
      ...prev,
      distanceKm: roundedDistance,
      durationMins: roundedDuration
    }));
    
    setFieldErrors(prev => {
        const newErrs = { ...prev };
        delete newErrs.distanceKm;
        delete newErrs.durationMins;
        return newErrs;
    });

    notifications.show({
      title: "Calculated Successfully",
      message: `Distance: ${roundedDistance} km | Est. Duration: ${roundedDuration} mins`,
      color: "blue",
      icon: <Calculator size={18} />
    });
  };

  const handleSubmit = (e: React.SubmitEvent) => {
    e.preventDefault();
    setFieldErrors({});
    setGlobalError(null);

    if (isSameAirport) {
        setGlobalError("Origin and Destination airports cannot be the same.");
        return;
    }

    startTransition(async () => {
      const payload = {
        ...formData,
        durationMins: formData.durationMins > 0 ? formData.durationMins : undefined,
      };

      const result = await createRouteAction(payload);
      
      if (result?.error) {
        if (result.fieldErrors) {
            setFieldErrors(result.fieldErrors);
        } else {
            let normalizedError = result.error;
            airports.forEach(airport => {
              normalizedError = normalizedError.split(airport.id).join(`${airport.iataCode} (${airport.city})`);
            });
            setGlobalError(normalizedError);
        }
        
        notifications.show({ title: "Failed to Create", message: "Please check the form for errors.", color: "red", icon: <X size={18} /> });
      } else {
        // 🌟 SUCCESS BLOCK UPDATED HERE 🌟
        
        // 1. Show the nice green notification
        notifications.show({ 
          title: "Success", 
          message: formData.createReturn 
            ? "Route and return route created successfully!" 
            : "Route created successfully!", 
          color: "green", 
          icon: <Check size={18} /> 
        });

        // 2. Automatically navigate the user back to the Routes table
        router.push('/admin/dashboard/routes'); 
      }
    });
  };

  return (
    <Container size="md" py="xl" pos="relative">
      <LoadingOverlay visible={isPending} overlayProps={{ radius: "sm", blur: 2 }} />

      <Group justify="space-between" mb="lg">
        <Button 
          variant="subtle" 
          color="gray" 
          leftSection={<ArrowLeft size={18} />} 
          onClick={() => router.back()} 
          disabled={isPending}
        >
          Back to Routes
        </Button>
      </Group>

      <Paper shadow="xs" p="xl" radius="md" withBorder>
        <Title order={3} mb="lg">Define New Route</Title>
        
        <form onSubmit={handleSubmit}>
          <Stack gap="md">
            
            {globalError && (
               <Alert icon={<AlertTriangle size={16} />} title="Error" color="red" variant="light">
                 {globalError}
               </Alert>
            )}

            {isSameAirport && (
               <Alert icon={<AlertTriangle size={16} />} color="orange" variant="light">
                 Origin and Destination cannot be the same airport. Please change one.
               </Alert>
            )}

            <Grid>
              <Grid.Col span={6}>
                <Select 
                  label="Origin Airport" 
                  placeholder="Select Origin"
                  data={airportSelectOptions}
                  searchable
                  required
                  leftSection={<MapPin size={16} />}
                  value={formData.originAirportId}
                  onChange={(val) => handleFormChange('originAirportId', val)}
                  error={fieldErrors.originAirportId?.join(', ')}
                />
              </Grid.Col>
              <Grid.Col span={6}>
                <Select 
                  label="Destination Airport" 
                  placeholder="Select Destination"
                  data={airportSelectOptions}
                  searchable
                  required
                  leftSection={<MapPin size={16} />}
                  value={formData.destAirportId}
                  onChange={(val) => handleFormChange('destAirportId', val)}
                  error={fieldErrors.destAirportId?.join(', ')}
                />
              </Grid.Col>
            </Grid>

            <Divider label="Flight Parameters" labelPosition="center" my="sm" />

            <Group justify="flex-end" mb="xs">
              <Button 
                variant="light" 
                size="xs" 
                leftSection={<Calculator size={14} />}
                onClick={handleAutoCalculate}
                disabled={!!(!formData.originAirportId || !formData.destAirportId || isSameAirport)}
              >
                Auto-Calculate using Coordinates
              </Button>
            </Group>

            <Grid>
              <Grid.Col span={6}>
                <NumberInput 
                  label="Distance (km)" 
                  description="Distance between airports"
                  placeholder="e.g. 1200"
                  min={1}
                  required
                  leftSection={<Gauge size={16} />}
                  value={formData.distanceKm}
                  onChange={(val) => handleFormChange('distanceKm', val)}
                  error={fieldErrors.distanceKm?.join(', ')}
                />
              </Grid.Col>
              <Grid.Col span={6}>
                <NumberInput 
                  label="Duration (minutes)" 
                  description="Estimated block time"
                  placeholder="e.g. 150"
                  min={0}
                  leftSection={<Clock size={16} />}
                  value={formData.durationMins}
                  onChange={(val) => handleFormChange('durationMins', val)}
                  error={fieldErrors.durationMins?.join(', ')}
                />
              </Grid.Col>
            </Grid>

            <Paper withBorder p="md" radius="md" bg="gray.0" mt="md">
              <Checkbox 
                label={<Text fw={500} size="sm">Automatically create return route</Text>}
                description="Generates an identical route in the opposite direction"
                checked={formData.createReturn}
                onChange={(e) => handleFormChange('createReturn', e.currentTarget.checked)}
              />
            </Paper>

            <Divider my="md" />

            <Group justify="flex-end">
              <Button variant="default" onClick={() => router.back()} disabled={isPending}>Cancel</Button>
              <Button 
                type="submit" 
                loading={isPending} 
                leftSection={<Save size={18} />}
                disabled={!!isSameAirport}
              >
                Save Route
              </Button>
            </Group>
          </Stack>
        </form>
      </Paper>
    </Container>
  );
}