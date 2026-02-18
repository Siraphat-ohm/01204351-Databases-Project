"use client";

import { 
  Button, Group, TextInput, Title, Paper, Select, Container, 
  Stack, Grid, Text, Badge, Divider, LoadingOverlay 
} from '@mantine/core';
import { useState, useTransition } from 'react'; // Import useTransition
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Plane, Settings, Info } from 'lucide-react';
// Import the Server Action
import { updateAircraftAction } from '@/app/actions/aircraft-actions'; 

// ... (Interfaces remain the same) ...
interface AircraftType {
  id: number;
  model: string;
  capacityEco: number;
  capacityBiz: number;
}

interface Aircraft {
  id: number;
  tailNumber: string;
  status: string;
  type: AircraftType;
}

interface AircraftEditFormProps {
  aircraft: Aircraft;
  aircraftTypes: AircraftType[];
}

export function AircraftEditForm({ aircraft, aircraftTypes }: AircraftEditFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition(); // Add transition state

  const [formData, setFormData] = useState({
    tailNumber: aircraft.tailNumber,
    aircraftTypeId: aircraft.type.id.toString(),
    status: aircraft.status,
  });

  const selectedModel = aircraftTypes.find(t => t.id.toString() === formData.aircraftTypeId);

  const handleChange = (field: string, value: string | null) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Call Server Action
    startTransition(async () => {
      await updateAircraftAction(aircraft.id, formData);
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
          <Badge size="lg" variant="light" color="blue">ID: {aircraft.id}</Badge>
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
                  required
                />

                <Select
                  label="Aircraft Model"
                  description="Changing model will update capacity configuration"
                  data={aircraftTypes.map(t => ({ value: t.id.toString(), label: t.model }))}
                  value={formData.aircraftTypeId}
                  onChange={(val) => handleChange('aircraftTypeId', val)}
                  searchable
                  required
                />

                <Select 
                  label="Operational Status"
                  data={['ACTIVE', 'MAINTENANCE', 'RETIRED']}
                  value={formData.status}
                  onChange={(val) => handleChange('status', val)}
                  leftSection={<Settings size={16} />}
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
                      <Badge variant="outline" color="gray">{selectedModel.capacityEco}</Badge>
                    </Group>
                    <Group justify="space-between">
                      <Text size="sm">Business Seats:</Text>
                      <Badge variant="outline" color="blue">{selectedModel.capacityBiz}</Badge>
                    </Group>
                    <Group justify="space-between" mt="xs">
                      <Text size="sm" fw={500}>Total Capacity:</Text>
                      <Text size="sm" fw={700}>{selectedModel.capacityEco + selectedModel.capacityBiz} Pax</Text>
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