"use client";

import { 
  Button, Group, TextInput, Title, Paper, Container, 
  Grid, Stack, LoadingOverlay, Text, ThemeIcon, Select, Badge, SelectProps, Box, Anchor
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Plane, Check, X, Tag, Activity } from 'lucide-react';
import { createAircraftAction } from '@/actions/aircraft-actions';
import { AircraftStatus } from '@/generated/prisma/client';
import Link from 'next/link';

interface AircraftType {
  id: string;
  model: string;
  iataCode: string;
  capacityEco: number;
  capacityBiz: number;
  capacityFirst: number;
}

interface AircraftCreateFormProps {
  aircraftTypes: AircraftType[];
}

export function AircraftCreateForm({ aircraftTypes }: AircraftCreateFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [formData, setFormData] = useState({
    tailNumber: '',
    aircraftTypeId: '',
    status: 'ACTIVE' as AircraftStatus,
  });

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.aircraftTypeId) {
      notifications.show({ title: "Error", message: "Please select an Aircraft Type.", color: "red" });
      return;
    }

    startTransition(async () => {
      const result = await createAircraftAction(formData);

      if (result?.error) {
        notifications.show({
          title: "Failed to Add Aircraft",
          message: result.error,
          color: "red",
          icon: <X size={18} />,
        });
      } else {
        notifications.show({
          title: "Success",
          message: `Aircraft ${formData.tailNumber} registered successfully.`,
          color: "green",
          icon: <Check size={18} />,
        });
        router.push('/admin/dashboard/aircraft');
      }
    });
  };

  // Base options for the Select dropdown
  const typeOptions = aircraftTypes.map(t => ({
    value: t.id,
    label: `${t.model} (${t.iataCode})`
  }));

  // Custom renderer to show capacities inside the dropdown beautifully as a tree
  const renderTypeOption: SelectProps['renderOption'] = ({ option }) => {
    const type = aircraftTypes.find(t => t.id === option.value);
    if (!type) return <Text>{option.label}</Text>;

    const hasBiz = type.capacityBiz > 0;
    const hasFirst = type.capacityFirst > 0;

    return (
      <Stack gap={0} py={4}>
        {/* Top level: Model Name & Code */}
        <Text size="sm" fw={600}>
          {type.model} <Text span size="xs" c="dimmed" fw={400}>({type.iataCode})</Text>
        </Text>
        
        {/* Nested levels: Seat Capacities */}
        <Box pl="sm" mt={2}>
          <Text size="xs" c="dimmed" lh={1.4} style={{ fontFamily: 'monospace' }}>
            {hasBiz || hasFirst ? '├─' : '└─'} Eco: <Text span fw={600} c="gray.7">{type.capacityEco}</Text>
          </Text>
          
          {hasBiz && (
            <Text size="xs" c="dimmed" lh={1.4} style={{ fontFamily: 'monospace' }}>
              {hasFirst ? '├─' : '└─'} Biz: <Text span fw={600} c="blue.7">{type.capacityBiz}</Text>
            </Text>
          )}
          
          {hasFirst && (
            <Text size="xs" c="dimmed" lh={1.4} style={{ fontFamily: 'monospace' }}>
              └─ First: <Text span fw={600} c="yellow.8">{type.capacityFirst}</Text>
            </Text>
          )}
        </Box>
      </Stack>
    );
  };

  return (
    <Container size="lg" py="xl" pos="relative">
      <LoadingOverlay visible={isPending} overlayProps={{ radius: "sm", blur: 2 }} />

      {/* HEADER */}
      <Group justify="space-between" mb="xl">
        <div>
          <Title order={2}>Register New Aircraft</Title>
          <Text c="dimmed" size="sm">Add a new physical plane to your fleet</Text>
        </div>
        <Button 
          variant="subtle" 
          color="gray" 
          leftSection={<ArrowLeft size={18} />} 
          onClick={() => router.back()} 
          disabled={isPending}
        >
          Back to Fleet
        </Button>
      </Group>

      <form onSubmit={handleSubmit}>
        <Grid gutter="xl">
          {/* LEFT COLUMN: Form Fields */}
          <Grid.Col span={{ base: 12, md: 8 }}>
            <Stack gap="lg">
              
              <Paper shadow="xs" p="xl" radius="md" withBorder>
                <Group mb="md" gap="sm">
                  <ThemeIcon variant="light" size="md" color="blue">
                    <Plane size={16} />
                  </ThemeIcon>
                  <Text fw={600} size="lg">Aircraft Identity</Text>
                </Group>

                <Grid gutter="md">
                  <Grid.Col span={{ base: 12, sm: 6 }}>
                    <TextInput 
                      label="Tail Number" 
                      placeholder="e.g. HS-TKA"
                      description="Unique registration number"
                      leftSection={<Tag size={16} color="var(--mantine-color-gray-5)" />}
                      value={formData.tailNumber}
                      onChange={(e) => handleChange('tailNumber', e.currentTarget.value.toUpperCase())}
                      required
                      data-autofocus
                      styles={{ input: { textTransform: 'uppercase', fontWeight: 600 } }}
                    />
                  </Grid.Col>

                  <Grid.Col span={{ base: 12, sm: 6 }}>

                    <Select 
                      // 1. We replace the standard string label with a custom layout
                      label={
                          <Text component="label" size="sm" fw={500}>Aircraft Model / Type</Text>
                      }
                      placeholder="Select a model"
                      // 2. Add an explanation of why they might need to add a new one
                      description="Missing a model? Create its capacity configuration first."
                      data={typeOptions}
                      value={formData.aircraftTypeId}
                      onChange={(val) => handleChange('aircraftTypeId', val || '')}
                      searchable
                      required
                      renderOption={renderTypeOption}
                    />
                    <Anchor component={Link} href="/admin/dashboard/aircraft/type/new" size="xs" fw={600} c="blue">
                            + Add New Aircraft Type
                          </Anchor>
                  </Grid.Col>

                  <Grid.Col span={12}>
                     <Select 
                        label="Initial Status"
                        description="Current operational state of the aircraft"
                        leftSection={<Activity size={16} color="var(--mantine-color-gray-5)" />}
                        data={[
                           { value: 'ACTIVE', label: 'Active (Ready for flights)' },
                           { value: 'MAINTENANCE', label: 'In Maintenance' },
                           { value: 'RETIRED', label: 'Retired' }
                        ]}
                        value={formData.status}
                        onChange={(val) => handleChange('status', val || 'ACTIVE')}
                        allowDeselect={false}
                        required
                     />
                  </Grid.Col>
                </Grid>
              </Paper>

            </Stack>
          </Grid.Col>

          {/* RIGHT COLUMN: Action Panel */}
          <Grid.Col span={{ base: 12, md: 4 }}>
            <Paper shadow="xs" p="xl" radius="md" withBorder style={{ position: 'sticky', top: 20 }}>
              <Text fw={600} size="lg" mb="md">Publish</Text>
              <Text size="sm" c="dimmed" mb="xl">
                Review the aircraft details before saving. Once active, this plane can be immediately assigned to scheduled flights.
              </Text>
              
              <Stack>
                <Button 
                  type="submit" 
                  size="md"
                  leftSection={<Save size={18} />} 
                  loading={isPending}
                  fullWidth
                >
                  Register Aircraft
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