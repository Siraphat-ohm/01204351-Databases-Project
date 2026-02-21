"use client";

import { 
  Button, Group, TextInput, Title, Paper, Container, 
  NumberInput, Grid, Stack, Divider, LoadingOverlay, Alert
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, MapPin, Building, Globe, Check, X } from 'lucide-react';
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
        // The server action handles the redirect to /dashboard/airports
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
          Back to Airports
        </Button>
      </Group>

      <Paper shadow="xs" p="xl" radius="md" withBorder>
        <Group mb="lg">
          <Title order={3}>Add New Airport</Title>
        </Group>
        
        <form onSubmit={handleSubmit}>
          <Stack gap="md">
            <Grid gutter="md">
              <Grid.Col span={{ base: 12, md: 4 }}>
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
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, md: 8 }}>
                <TextInput 
                  label="Airport Name" 
                  placeholder="e.g. Suvarnabhumi Airport" 
                  leftSection={<Building size={16} />}
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.currentTarget.value)}
                  error={fieldErrors.name?.join(', ')}
                  required
                />
              </Grid.Col>
            </Grid>

            <Divider label="Location Details" labelPosition="center" my="sm" />

            <Grid gutter="md">
              <Grid.Col span={6}>
                <TextInput 
                  label="City" 
                  placeholder="e.g. Bangkok" 
                  leftSection={<MapPin size={16} />}
                  value={formData.city}
                  onChange={(e) => handleChange('city', e.currentTarget.value)}
                  error={fieldErrors.city?.join(', ')}
                  required 
                />
              </Grid.Col>
              <Grid.Col span={6}>
                <TextInput 
                  label="Country" 
                  placeholder="e.g. Thailand" 
                  leftSection={<Globe size={16} />}
                  value={formData.country}
                  onChange={(e) => handleChange('country', e.currentTarget.value)}
                  error={fieldErrors.country?.join(', ')}
                  required 
                />
              </Grid.Col>
            </Grid>

            <Grid gutter="md">
              <Grid.Col span={6}>
                <NumberInput 
                  label="Latitude" 
                  placeholder="e.g. 13.6811" 
                  min={-90} max={90}
                  decimalScale={6}
                  fixedDecimalScale
                  value={formData.lat}
                  onChange={(val) => handleChange('lat', val)}
                  error={fieldErrors.lat?.join(', ')}
                  required 
                />
              </Grid.Col>
              <Grid.Col span={6}>
                <NumberInput 
                  label="Longitude" 
                  placeholder="e.g. 100.7501" 
                  min={-180} max={180}
                  decimalScale={6}
                  fixedDecimalScale
                  value={formData.lon}
                  onChange={(val) => handleChange('lon', val)}
                  error={fieldErrors.lon?.join(', ')}
                  required 
                />
              </Grid.Col>
            </Grid>

            <Divider my="md" />

            <Group justify="flex-end">
              <Button variant="default" onClick={() => router.back()} disabled={isPending}>Cancel</Button>
              <Button type="submit" leftSection={<Save size={18} />} loading={isPending}>
                Save Airport
              </Button>
            </Group>
          </Stack>
        </form>
      </Paper>
    </Container>
  );
}