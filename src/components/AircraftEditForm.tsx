"use client";

import { 
  Button, Group, TextInput, Title, Paper, Select, Container, 
  Stack, Grid, Text, Badge, Divider, LoadingOverlay 
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Plane, Settings, Info, Check, X } from 'lucide-react';
import { updateAircraftAction } from '@/actions/aircraft-actions'; 
import { AircraftStatus } from '@/generated/prisma/client';

// UPDATE: Changed IDs to string
interface AircraftType {
  id: string; 
  model: string;
  capacityEco: number;
  capacityBiz: number;
}

// UPDATE: Changed IDs to string and added proper Status type
interface Aircraft {
  id: string; 
  tailNumber: string;
  status: AircraftStatus;
  type: AircraftType;
}

interface AircraftEditFormProps {
  aircraft: Aircraft;
  aircraftTypes: AircraftType[];
}

export function AircraftEditForm({ aircraft, aircraftTypes }: AircraftEditFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition(); 

  // State for Zod inline field errors
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const [formData, setFormData] = useState({
    tailNumber: aircraft.tailNumber,
    aircraftTypeId: aircraft.type?.id || '',
    status: aircraft.status,
  });

  const selectedModel = aircraftTypes.find(t => t.id === formData.aircraftTypeId);

  const handleChange = (field: string, value: string | null) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear the error for this specific field when the user starts typing again
    if (fieldErrors[field]) {
      setFieldErrors(prev => ({ ...prev, [field]: [] }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({}); // Reset errors on new submission
    
    startTransition(async () => {
      // Pass the string ID and the form data
      const result = await updateAircraftAction(aircraft.id, formData);
      
      if (result?.error) {
        // If Zod returned specific field errors, map them to the inputs
        if (result.fieldErrors) {
          setFieldErrors(result.fieldErrors);
        }
        
        notifications.show({
          title: "Update Failed",
          message: result.fieldErrors 
            ? "Please fix the highlighted errors and try again." 
            : result.error,
          color: "red",
          icon: <X size={18} />,
        });
      } else {
        notifications.show({
          title: "Success",
          message: "Aircraft updated successfully.",
          color: "green",
          icon: <Check size={18} />,
        });
        router.push("/dashboard/aircraft"); 
      }
    });
  };

  return (
    <Container size="md" py="xl" pos="relative">
      <LoadingOverlay visible={isPending} overlayProps={{ radius: "sm", blur: 2 }} />
      
      {/* Header */}
      <Group justify="space-between" mb="lg">
        <Button 
          variant="subtle" color="gray" leftSection={<ArrowLeft size={18} />} 
          onClick={() => router.back()} disabled={isPending}
        >
          Back to Fleet
        </Button>
      </Group>

      <Paper shadow="xs" p="xl" radius="md" withBorder>
        <Group mb="md" justify="space-between">
          <Title order={3}>Edit Aircraft {aircraft.tailNumber}</Title>
          <Badge size="lg" variant="light" color="blue">ID: {aircraft.id.slice(0, 8)}...</Badge>
        </Group>
        
        <form onSubmit={handleSubmit}>
          <Grid gutter="xl">
            {/* Left Column: Core Info */}
            <Grid.Col span={{ base: 12, md: 7 }}>
              <Stack gap="md">
                <TextInput 
                  label="Tail Number" 
                  description="Unique registration code (e.g. HS-TBA)"
                  placeholder="HS-XXX"
                  value={formData.tailNumber}
                  onChange={(e) => handleChange('tailNumber', e.currentTarget.value)}
                  leftSection={<Plane size={16} />}
                  error={fieldErrors.tailNumber?.join(', ')} // Map Zod error
                  required
                />

                <Select
                  label="Aircraft Model"
                  description="Changing model will update capacity configuration"
                  data={aircraftTypes.map(t => ({ value: t.id, label: t.model }))}
                  value={formData.aircraftTypeId}
                  onChange={(val) => handleChange('aircraftTypeId', val)}
                  searchable
                  error={fieldErrors.aircraftTypeId?.join(', ')} // Map Zod error
                  required
                />

                <Select 
                  label="Operational Status"
                  data={['ACTIVE', 'MAINTENANCE', 'RETIRED']}
                  value={formData.status}
                  onChange={(val) => handleChange('status', val)}
                  leftSection={<Settings size={16} />}
                  error={fieldErrors.status?.join(', ')} // Map Zod error
                  required
                />
              </Stack>
            </Grid.Col>

            {/* Right Column: Specs */}
            <Grid.Col span={{ base: 12, md: 5 }}>
              <Paper bg="gray.0" p="md" radius="md">
                <Group gap="xs" mb="sm">
                  <Info size={16} className="text-gray-500" />
                  <Text size="sm" fw={600} c="dimmed" tt="uppercase">Configuration Specs</Text>
                </Group>
                
                {selectedModel ? (
                  <Stack gap="xs">
                    <Group justify="space-between">
                      <Text size="sm">Model:</Text>
                      <Text size="sm" fw={700}>{selectedModel.model}</Text>
                    </Group>
                    <Divider />
                    <Group justify="space-between">
                      <Text size="sm">Economy Seats:</Text>
                      <Badge variant="outline" color="gray">{selectedModel.capacityEco ?? 0}</Badge>
                    </Group>
                    <Group justify="space-between">
                      <Text size="sm">Business Seats:</Text>
                      <Badge variant="outline" color="blue">{selectedModel.capacityBiz ?? 0}</Badge>
                    </Group>
                    <Group justify="space-between" mt="xs">
                      <Text size="sm" fw={500}>Total Capacity:</Text>
                      <Text size="sm" fw={700}>
                        {(selectedModel.capacityEco || 0) + (selectedModel.capacityBiz || 0)} Pax
                      </Text>
                    </Group>
                  </Stack>
                ) : (
                  <Text size="sm" c="dimmed">Select a model to view specs</Text>
                )}
              </Paper>
            </Grid.Col>
          </Grid>

          <Divider my="xl" />

          <Group justify="flex-end">
            <Button variant="default" onClick={() => router.back()} disabled={isPending}>Cancel</Button>
            <Button type="submit" leftSection={<Save size={18} />} loading={isPending}>Save Changes</Button>
          </Group>
        </form>
      </Paper>
    </Container>
  );
}