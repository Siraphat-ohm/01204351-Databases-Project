"use client";

import { 
  Button, Group, TextInput, Title, Paper, Container, 
  NumberInput, Grid, Stack, LoadingOverlay, Text, ThemeIcon, Box
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, MapPin, Building, Globe, Check, X, Navigation } from 'lucide-react';
import { createAirportAction } from '@/actions/airport-actions';

export function AirportCreateForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const [formData, setFormData] = useState({
    iataCode: '',
    name: '',
    city: '',
    country: '',
    lat: 0,
    lon: 0,
  });

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
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
      const result = await createAirportAction(formData);

      if (result?.error) {
        if (result.fieldErrors) {
          setFieldErrors(result.fieldErrors);
        }
        notifications.show({
          title: "Failed to Add Airport",
          message: result.error,
          color: "red",
          icon: <X size={18} />,
        });
      } else {
        notifications.show({
          title: "Success",
          message: `Airport ${formData.iataCode} has been added.`,
          color: "green",
          icon: <Check size={18} />,
        });
      }
    });
  };

  return (
    <Container size="lg" py="xl" pos="relative">
      <LoadingOverlay visible={isPending} overlayProps={{ radius: "sm", blur: 2 }} />

      {/* HEADER */}
      <Group justify="space-between" mb="xl">
        <div>
          <Title order={2}>Add New Airport</Title>
          <Text c="dimmed" size="sm">Register a new destination in the system</Text>
        </div>
        <Button 
          variant="subtle" 
          color="gray" 
          leftSection={<ArrowLeft size={18} />} 
          onClick={() => router.back()} 
          disabled={isPending}
        >
          Back to Airports
        </Button>
      </Group>

      <form onSubmit={handleSubmit}>
        <Grid gutter="xl">
          {/* LEFT COLUMN: Form Fields */}
          <Grid.Col span={{ base: 12, md: 8 }}>
            <Stack gap="lg">
              
              {/* SECTION 1: Identity */}
              <Paper shadow="xs" p="xl" radius="md" withBorder>
                <Group mb="md" gap="sm">
                  <ThemeIcon variant="light" size="md" color="blue">
                    <Building size={16} />
                  </ThemeIcon>
                  <Text fw={600} size="lg">Airport Identity</Text>
                </Group>

                <Grid gutter="md">
                  <Grid.Col span={{ base: 12, sm: 4 }}>
                    <TextInput 
                      label="IATA Code" 
                      placeholder="e.g. BKK"
                      description="3-letter unique code"
                      maxLength={3}
                      value={formData.iataCode}
                      onChange={(e) => handleChange('iataCode', e.currentTarget.value.toUpperCase())}
                      error={fieldErrors.iataCode?.join(', ')}
                      required
                      data-autofocus
                      styles={{ input: { textTransform: 'uppercase', fontWeight: 600 } }}
                    />
                  </Grid.Col>
                  <Grid.Col span={{ base: 12, sm: 8 }}>
                    <TextInput 
                      label="Airport Name"
                      description="Full official name of the airport"
                      placeholder="e.g. Suvarnabhumi International Airport" 
                      value={formData.name}
                      onChange={(e) => handleChange('name', e.currentTarget.value)}
                      error={fieldErrors.name?.join(', ')}
                      required
                    />
                  </Grid.Col>
                </Grid>
              </Paper>

              {/* SECTION 2: Geography & Location */}
              <Paper shadow="xs" p="xl" radius="md" withBorder>
                <Group mb="md" gap="sm">
                  <ThemeIcon variant="light" size="md" color="orange">
                    <Globe size={16} />
                  </ThemeIcon>
                  <Text fw={600} size="lg">Geographic Data</Text>
                </Group>

                <Grid gutter="md" mb="md">
                  <Grid.Col span={{ base: 12, sm: 6 }}>
                    <TextInput 
                      label="City" 
                      placeholder="e.g. Bangkok" 
                      leftSection={<MapPin size={16} color="var(--mantine-color-gray-5)" />}
                      value={formData.city}
                      onChange={(e) => handleChange('city', e.currentTarget.value)}
                      error={fieldErrors.city?.join(', ')}
                      required 
                    />
                  </Grid.Col>
                  <Grid.Col span={{ base: 12, sm: 6 }}>
                    <TextInput 
                      label="Country" 
                      placeholder="e.g. Thailand" 
                      leftSection={<Globe size={16} color="var(--mantine-color-gray-5)" />}
                      value={formData.country}
                      onChange={(e) => handleChange('country', e.currentTarget.value)}
                      error={fieldErrors.country?.join(', ')}
                      required 
                    />
                  </Grid.Col>
                </Grid>

                <Paper bg="gray.0" p="md" radius="sm">
                  <Text size="sm" fw={600} mb="xs">Coordinates</Text>
                  <Grid gutter="md">
                    <Grid.Col span={{ base: 12, sm: 6 }}>
                      <NumberInput 
                        label="Latitude" 
                        placeholder="e.g. 13.6811" 
                        min={-90} max={90}
                        decimalScale={6}
                        fixedDecimalScale
                        leftSection={<Navigation size={14} color="var(--mantine-color-gray-5)" />}
                        value={formData.lat}
                        onChange={(val) => handleChange('lat', val)}
                        error={fieldErrors.lat?.join(', ')}
                        required 
                      />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, sm: 6 }}>
                      <NumberInput 
                        label="Longitude" 
                        placeholder="e.g. 100.7501" 
                        min={-180} max={180}
                        decimalScale={6}
                        fixedDecimalScale
                        leftSection={<Navigation size={14} color="var(--mantine-color-gray-5)" style={{ transform: 'rotate(90deg)' }} />}
                        value={formData.lon}
                        onChange={(val) => handleChange('lon', val)}
                        error={fieldErrors.lon?.join(', ')}
                        required 
                      />
                    </Grid.Col>
                  </Grid>
                  <Text size="xs" c="dimmed" mt="xs">
                    Coordinates are required to accurately plot flight routes on the live radar.
                  </Text>
                </Paper>
              </Paper>
            </Stack>
          </Grid.Col>

          {/* RIGHT COLUMN: Action Panel */}
          <Grid.Col span={{ base: 12, md: 4 }}>
            <Paper shadow="xs" p="xl" radius="md" withBorder style={{ position: 'sticky', top: 20 }}>
              <Text fw={600} size="lg" mb="md">Publish</Text>
              <Text size="sm" c="dimmed" mb="xl">
                Review your data before saving. Once added, this airport will immediately be available for flight route assignments.
              </Text>
              
              <Stack>
                <Button 
                  type="submit" 
                  size="md"
                  leftSection={<Save size={18} />} 
                  loading={isPending}
                  fullWidth
                >
                  Save Airport
                </Button>
                <Button 
                  variant="light" 
                  color="gray"
                  onClick={() => router.back()} 
                  disabled={isPending}
                  fullWidth
                >
                  Cancel
                </Button>
              </Stack>
            </Paper>
          </Grid.Col>
        </Grid>
      </form>
    </Container>
  );
}