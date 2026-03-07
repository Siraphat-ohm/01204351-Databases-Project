"use client";

import { 
  Button, Group, TextInput, Title, Paper, Container, 
  Stack, LoadingOverlay, Text, ThemeIcon, Select, Grid, PasswordInput
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, UserPlus, Shield, UserCircle, Briefcase, MapPin, Check, X } from 'lucide-react';
import { createAdminUserAction } from '@/actions/user-actions';
import type { Role, Rank } from '@/generated/prisma/client';
import { ROLES, RANKS } from '@/types/user.type';

interface AirportOption {
  id: string;
  iataCode: string;
  city: string;
}

interface UserCreateFormProps {
  airports: AirportOption[];
}

export function UserCreateForm({ airports }: UserCreateFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    phone: '',
    role: 'PASSENGER' as Role,
    // Staff Profile Fields
    employeeId: '',
    rank: null as Rank | null,
    baseAirportId: null as string | null,
    stationId: null as string | null,
  });

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) {
      setFieldErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const airportOptions = airports.map(a => ({
    value: a.id,
    label: `${a.iataCode} - ${a.city}`,
  }));

  const isStaffRole = formData.role !== 'PASSENGER';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});

    startTransition(async () => {
      const payload = {
        email: formData.email,
        password: formData.password,
        name: formData.name,
        phone: formData.phone || undefined,
        role: formData.role,
        staffProfile: isStaffRole ? {
          employeeId: formData.employeeId,
          rank: formData.rank,
          baseAirportId: formData.baseAirportId,
          stationId: formData.stationId,
        } : null,
      };

      const result = await createAdminUserAction(payload as any);

      if (result?.error) {
        if (result.fieldErrors) {
          setFieldErrors(result.fieldErrors);
        }
        notifications.show({
          title: "Failed to Create User",
          message: result.error,
          color: "red",
          icon: <X size={18} />,
        });
      } else {
        notifications.show({
          title: "Success",
          message: `User ${formData.email} has been created.`,
          color: "green",
          icon: <Check size={18} />,
        });
        router.push('/admin/dashboard/users');
      }
    });
  };

  return (
    <Container size="lg" py="xl" pos="relative">
      <LoadingOverlay visible={isPending} overlayProps={{ radius: "sm", blur: 2 }} />

      {/* HEADER */}
      <Group justify="space-between" mb="xl">
        <div>
          <Title order={2}>Add New User</Title>
          <Text c="dimmed" size="sm">Create a new system user or staff member</Text>
        </div>
        <Button 
          variant="subtle" 
          color="gray" 
          leftSection={<ArrowLeft size={18} />} 
          onClick={() => router.back()} 
          disabled={isPending}
        >
          Back to Users
        </Button>
      </Group>

      <form onSubmit={handleSubmit}>
        <Grid gutter="xl">
          {/* LEFT COLUMN: User Identity & Staff Profile */}
          <Grid.Col span={{ base: 12, md: 8 }}>
            <Stack gap="lg">
              
              {/* SECTION 1: Account Identity */}
              <Paper shadow="xs" p="xl" radius="md" withBorder>
                <Group mb="md" gap="sm">
                  <ThemeIcon variant="light" size="md" color="blue">
                    <UserCircle size={16} />
                  </ThemeIcon>
                  <Text fw={600} size="lg">User Identity</Text>
                </Group>

                <Grid gutter="md">
                  <Grid.Col span={{ base: 12, sm: 6 }}>
                    <TextInput 
                      label="Full Name" 
                      placeholder="e.g. John Doe"
                      value={formData.name}
                      onChange={(e) => handleChange('name', e.currentTarget.value)}
                      error={fieldErrors.name?.join(', ')}
                      required
                    />
                  </Grid.Col>
                  <Grid.Col span={{ base: 12, sm: 6 }}>
                    <TextInput 
                      label="Email Address"
                      placeholder="e.g. john@yokairline.com" 
                      value={formData.email}
                      onChange={(e) => handleChange('email', e.currentTarget.value)}
                      error={fieldErrors.email?.join(', ')}
                      required
                    />
                  </Grid.Col>
                  <Grid.Col span={{ base: 12, sm: 6 }}>
                    <PasswordInput 
                      label="Password"
                      placeholder="Minimum 8 characters"
                      value={formData.password}
                      onChange={(e) => handleChange('password', e.currentTarget.value)}
                      error={fieldErrors.password?.join(', ')}
                      required
                    />
                  </Grid.Col>
                  <Grid.Col span={{ base: 12, sm: 6 }}>
                    <TextInput 
                      label="Phone Number"
                      placeholder="e.g. +66812345678"
                      value={formData.phone}
                      onChange={(e) => handleChange('phone', e.currentTarget.value)}
                      error={fieldErrors.phone?.join(', ')}
                    />
                  </Grid.Col>
                </Grid>
              </Paper>

              {/* SECTION 2: Role & Permissions */}
              <Paper shadow="xs" p="xl" radius="md" withBorder>
                <Group mb="md" gap="sm">
                  <ThemeIcon variant="light" size="md" color="red">
                    <Shield size={16} />
                  </ThemeIcon>
                  <Text fw={600} size="lg">Role & Access</Text>
                </Group>

                <Select 
                  label="System Role"
                  description="Determines dashboard access and staff profile requirements"
                  data={ROLES.map(r => ({ value: r, label: r.replace('_', ' ') }))}
                  value={formData.role}
                  onChange={(val) => handleChange('role', val)}
                  required
                />
              </Paper>

              {/* SECTION 3: Staff Profile (Conditional) */}
              {isStaffRole && (
                <Paper shadow="xs" p="xl" radius="md" withBorder>
                  <Group mb="md" gap="sm">
                    <ThemeIcon variant="light" size="md" color="orange">
                      <Briefcase size={16} />
                    </ThemeIcon>
                    <Text fw={600} size="lg">Staff Profile</Text>
                  </Group>

                  <Grid gutter="md">
                    <Grid.Col span={{ base: 12, sm: 6 }}>
                      <TextInput 
                        label="Employee ID"
                        placeholder="e.g. STF001"
                        value={formData.employeeId}
                        onChange={(e) => handleChange('employeeId', e.currentTarget.value)}
                        error={fieldErrors['staffProfile.employeeId']?.join(', ')}
                        required={isStaffRole}
                      />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, sm: 6 }}>
                      <Select 
                        label="Rank / Position"
                        placeholder="Select rank"
                        data={RANKS.map(r => ({ value: r, label: r.replace('_', ' ') }))}
                        value={formData.rank}
                        onChange={(val) => handleChange('rank', val)}
                        error={fieldErrors['staffProfile.rank']?.join(', ')}
                      />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, sm: 6 }}>
                      <Select 
                        label="Base Airport"
                        placeholder="Select base airport"
                        data={airportOptions}
                        value={formData.baseAirportId}
                        onChange={(val) => handleChange('baseAirportId', val)}
                        error={fieldErrors['staffProfile.baseAirportId']?.join(', ')}
                        searchable
                        leftSection={<MapPin size={14} />}
                      />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, sm: 6 }}>
                      <Select 
                        label="Station"
                        placeholder="Select station"
                        data={airportOptions}
                        value={formData.stationId}
                        onChange={(val) => handleChange('stationId', val)}
                        error={fieldErrors['staffProfile.stationId']?.join(', ')}
                        searchable
                        leftSection={<MapPin size={14} />}
                      />
                    </Grid.Col>
                  </Grid>
                </Paper>
              )}
            </Stack>
          </Grid.Col>

          {/* RIGHT COLUMN: Action Panel */}
          <Grid.Col span={{ base: 12, md: 4 }}>
            <Paper shadow="xs" p="xl" radius="md" withBorder style={{ position: 'sticky', top: 20 }}>
              <Text fw={600} size="lg" mb="md">Create User</Text>
              <Text size="sm" c="dimmed" mb="xl">
                Assigning a staff role will require employee details. Ensure the email is unique within the system.
              </Text>
              
              <Stack>
                <Button 
                  type="submit" 
                  size="md"
                  leftSection={<UserPlus size={18} />} 
                  loading={isPending}
                  fullWidth
                >
                  Create User
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
