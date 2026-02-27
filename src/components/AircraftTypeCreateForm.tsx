"use client";

import { 
  Button, Group, TextInput, Title, Paper, Container, 
  Grid, Stack, LoadingOverlay, Text, ThemeIcon, NumberInput
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Plane, Check, X, Users, Armchair } from 'lucide-react';
import { createAircraftTypeAction } from '@/actions/aircraft-type-actions';

export function AircraftTypeCreateForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [formData, setFormData] = useState({
    iataCode: '',
    model: '',
    capacityEco: 0,
    capacityBiz: 0,
    capacityFirst: 0,
  });

  const handleChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    startTransition(async () => {
      // Clean up payload (remove capacityFirst if it's 0 to match your optional schema)
      const payload = {
        ...formData,
        capacityFirst: formData.capacityFirst > 0 ? formData.capacityFirst : undefined,
      };

      const result = await createAircraftTypeAction(payload);

      if (result?.error) {
        notifications.show({
          title: "Failed to Add Model",
          message: result.error,
          color: "red",
          icon: <X size={18} />,
        });
      } else {
        notifications.show({
          title: "Success",
          message: `Aircraft model ${formData.model} added successfully.`,
          color: "green",
          icon: <Check size={18} />,
        });
        // Redirect to wherever your list of models lives
        router.push('/admin/dashboard/aircraft'); 
      }
    });
  };

  return (
    <Container size="lg" py="xl" pos="relative">
      <LoadingOverlay visible={isPending} overlayProps={{ radius: "sm", blur: 2 }} />

      {/* HEADER */}
      <Group justify="space-between" mb="xl">
        <div>
          <Title order={2}>Add Aircraft Model</Title>
          <Text c="dimmed" size="sm">Define a new aircraft type and seating configuration</Text>
        </div>
        <Button 
          variant="subtle" 
          color="gray" 
          leftSection={<ArrowLeft size={18} />} 
          onClick={() => router.back()} 
          disabled={isPending}
        >
          Back
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
                    <Plane size={16} />
                  </ThemeIcon>
                  <Text fw={600} size="lg">Model Identity</Text>
                </Group>

                <Grid gutter="md">
                  <Grid.Col span={{ base: 12, sm: 8 }}>
                    <TextInput 
                      label="Model Name" 
                      placeholder="e.g. Airbus A350-900"
                      description="Common name for this aircraft type"
                      value={formData.model}
                      onChange={(e) => handleChange('model', e.currentTarget.value)}
                      required
                      data-autofocus
                    />
                  </Grid.Col>
                  <Grid.Col span={{ base: 12, sm: 4 }}>
                    <TextInput 
                      label="IATA Code" 
                      placeholder="e.g. 359"
                      description="Exactly 3 characters"
                      maxLength={3}
                      value={formData.iataCode}
                      onChange={(e) => handleChange('iataCode', e.currentTarget.value.toUpperCase())}
                      required
                      styles={{ input: { textTransform: 'uppercase', fontWeight: 600 } }}
                    />
                  </Grid.Col>
                </Grid>
              </Paper>

              {/* SECTION 2: Seating Configuration */}
              <Paper shadow="xs" p="xl" radius="md" withBorder>
                <Group mb="md" gap="sm">
                  <ThemeIcon variant="light" size="md" color="orange">
                    <Users size={16} />
                  </ThemeIcon>
                  <Text fw={600} size="lg">Seat Configuration</Text>
                </Group>

                <Grid gutter="md">
                  <Grid.Col span={{ base: 12, sm: 4 }}>
                    <NumberInput 
                      label="Economy Class" 
                      placeholder="Total seats"
                      description="Standard seating"
                      leftSection={<Armchair size={16} color="var(--mantine-color-gray-5)" />}
                      min={0}
                      value={formData.capacityEco}
                      onChange={(val) => handleChange('capacityEco', Number(val) || 0)}
                      required
                    />
                  </Grid.Col>
                  
                  <Grid.Col span={{ base: 12, sm: 4 }}>
                    <NumberInput 
                      label="Business Class" 
                      placeholder="Total seats"
                      description="Premium seating"
                      leftSection={<Armchair size={16} color="var(--mantine-color-blue-5)" />}
                      min={0}
                      value={formData.capacityBiz}
                      onChange={(val) => handleChange('capacityBiz', Number(val) || 0)}
                      required
                    />
                  </Grid.Col>

                  <Grid.Col span={{ base: 12, sm: 4 }}>
                    <NumberInput 
                      label="First Class" 
                      placeholder="Total seats"
                      description="Optional"
                      leftSection={<Armchair size={16} color="var(--mantine-color-yellow-6)" />}
                      min={0}
                      value={formData.capacityFirst}
                      onChange={(val) => handleChange('capacityFirst', Number(val) || 0)}
                    />
                  </Grid.Col>
                </Grid>
              </Paper>

            </Stack>
          </Grid.Col>

          {/* RIGHT COLUMN: Action Panel */}
          <Grid.Col span={{ base: 12, md: 4 }}>
            <Paper shadow="xs" p="xl" radius="md" withBorder style={{ position: 'sticky', top: 20 }}>
              <Text fw={600} size="lg" mb="md">Save Model</Text>
              <Text size="sm" c="dimmed" mb="xl">
                Once this model is saved, you can begin registering individual physical aircraft (Tail Numbers) under this type.
              </Text>
              
              <Stack>
                <Button 
                  type="submit" 
                  size="md"
                  leftSection={<Save size={18} />} 
                  loading={isPending}
                  fullWidth
                >
                  Create Model
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