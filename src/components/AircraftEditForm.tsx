"use client";

import { 
  Button, Group, TextInput, Title, Paper, Select, Container, 
  Stack, Grid, Text, Badge, Divider, LoadingOverlay 
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useState, useTransition, useMemo } from 'react'; // <-- Imported useMemo
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Plane, Settings, Info, Check, X } from 'lucide-react';
import { updateAircraftAction } from '@/actions/aircraft-actions'; 
import { AircraftStatus } from '@/generated/prisma/client';

interface AircraftType {
  id: string; 
  model: string;
  capacityEco: number;
  capacityBiz: number;
}

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

  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const [formData, setFormData] = useState({
    tailNumber: aircraft.tailNumber,
    aircraftTypeId: aircraft.type?.id || '',
    status: aircraft.status,
  });

  // OPTIMIZATION 1: Only recalculate the selected model if the dropdown changes
  const selectedModel = useMemo(() => {
    return aircraftTypes.find(t => t.id === formData.aircraftTypeId) || null;
  }, [formData.aircraftTypeId, aircraftTypes]);

  // OPTIMIZATION 2: Only map the dropdown options once, not on every keystroke
  const aircraftModelOptions = useMemo(() => {
    return aircraftTypes.map(t => ({ value: t.id, label: t.model }));
  }, [aircraftTypes]);

  const handleChange = (field: string, value: string | null) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) {
      setFieldErrors(prev => ({ ...prev, [field]: [] }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({}); 
    
    startTransition(async () => {
      const result = await updateAircraftAction(aircraft.id, formData);
      
      if (result?.error) {
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
            <Grid.Col span={{ base: 12, md: 7 }}>
              <Stack gap="md">
                <TextInput 
                  label="Tail Number" 
                  description="Unique registration code (e.g. HS-TBA)"
                  placeholder="HS-XXX"
                  value={formData.tailNumber}
                  onChange={(e) => handleChange('tailNumber', e.currentTarget.value)}
                  leftSection={<Plane size={16} />}
                  error={fieldErrors.tailNumber?.join(', ')} 
                  required
                />

                <Select
                  label="Aircraft Model"
                  description="Changing model will update capacity configuration"
                  data={aircraftModelOptions} // <-- Use the memoized array here
                  value={formData.aircraftTypeId}
                  onChange={(val) => handleChange('aircraftTypeId', val)}
                  searchable
                  error={fieldErrors.aircraftTypeId?.join(', ')} 
                  required
                />

                <Select 
                  label="Operational Status"
                  data={['ACTIVE', 'MAINTENANCE', 'RETIRED']}
                  value={formData.status}
                  onChange={(val) => handleChange('status', val)}
                  leftSection={<Settings size={16} />}
                  error={fieldErrors.status?.join(', ')} 
                  required
                />
              </Stack>
            </Grid.Col>

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