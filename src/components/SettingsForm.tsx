"use client";

import { 
  Title, Group, Button, TextInput, Paper, Container, 
  Grid, Stack, LoadingOverlay, Text, Avatar, Divider, Alert, Badge, ThemeIcon, Tabs, FileInput
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Save, User, Phone, Check, X, AlertTriangle, Shield, MapPin, Briefcase, Link as LinkIcon, Upload } from 'lucide-react';
import { updateMyProfileAction } from '@/actions/user-actions';
import { UserSelf } from '@/types/user.type';

interface SettingsFormProps {
  user: UserSelf;
}

export function SettingsForm({ user }: SettingsFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isUploading, setIsUploading] = useState(false);
  
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    name: user.name || '',
    phone: user.phone || '',
    image: user.image || '',
  });

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setGlobalError(null);
    if (fieldErrors[field]) {
      setFieldErrors(prev => {
        const newErrs = { ...prev };
        delete newErrs[field];
        return newErrs;
      });
    }
  };

  const handleMockUpload = (file: File | null) => {
    if (!file) return;
    
    setIsUploading(true);
    setGlobalError(null);
    
    setTimeout(() => {
      const mockUrl = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(file.name)}&backgroundColor=228be6`;
      
      handleChange('image', mockUrl);
      setIsUploading(false);
      
      notifications.show({
        title: "Upload Simulated",
        message: "File mock-uploaded. Image URL applied.",
        color: "blue",
        icon: <Check size={18} />
      });
    }, 1500);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setGlobalError(null);
    setFieldErrors({});

    startTransition(async () => {
      try {
        const result = await updateMyProfileAction({
          name: formData.name.trim() || undefined,
          phone: formData.phone.trim() || undefined,
          image: formData.image.trim() || undefined,
        });
        
        if (result?.error || result?.fieldErrors) {
          if (result.fieldErrors) {
            const formattedErrors: Record<string, string> = {};
            for (const [key, messages] of Object.entries(result.fieldErrors)) {
              if (messages && messages.length > 0) {
                formattedErrors[key] = messages[0];
              }
            }
            setFieldErrors(formattedErrors);
          }
          setGlobalError(result.error || "Could not save your settings.");
          notifications.show({
            title: "Update Failed",
            message: result.error || "Please fix the errors.",
            color: "red",
            icon: <X size={18} />,
          });
          return;
        }

        if (result?.success) {
          notifications.show({
            title: "Settings Saved",
            message: "Your preferences have been updated.",
            color: "green",
            icon: <Check size={18} />,
          });
          router.refresh();
        }
      } catch (err) {
        setGlobalError("A network error occurred.");
      }
    });
  };

  const staff = user.staffProfile;

  return (
    <Container size="lg" py="xl">
      <Group justify="space-between" mb="xl">
        <div>
          <Title order={2}>Account Settings</Title>
          <Text c="dimmed" size="sm">Manage your account information and preferences</Text>
        </div>
      </Group>

      <Grid gutter="xl">
        {/* Profile Summary & Staff Info */}
        <Grid.Col span={{ base: 12, md: 4 }}>
          <Stack gap="md">
            <Paper shadow="xs" p="xl" radius="md" withBorder pos="relative">
              <LoadingOverlay visible={isUploading} overlayProps={{ radius: "sm", blur: 2 }} loaderProps={{ type: 'dots' }} />
              
              <Stack align="center" gap="sm" mb="lg">
                <Avatar src={formData.image || null} size={100} radius="xl" color="blue">
                  {user.name?.charAt(0) || user.email.charAt(0)}
                </Avatar>
                <div style={{ textAlign: 'center' }}>
                  <Text fw={700} size="lg">{user.name || 'User'}</Text>
                  <Text size="xs" c="dimmed">{user.email}</Text>
                  <Badge color="blue" variant="light" mt={5}>
                    {user.role.replace('_', ' ')}
                  </Badge>
                </div>
              </Stack>

              <Tabs defaultValue="url" variant="pills" radius="md">
                <Tabs.List grow mb="md">
                  <Tabs.Tab value="url" leftSection={<LinkIcon size={14} />}>URL</Tabs.Tab>
                  <Tabs.Tab value="upload" leftSection={<Upload size={14} />}>Upload</Tabs.Tab>
                </Tabs.List>

                <Tabs.Panel value="url">
                  <TextInput
                    placeholder="https://example.com/avatar.jpg"
                    description="Paste a direct link to an image"
                    value={formData.image}
                    onChange={(e) => handleChange('image', e.currentTarget.value)}
                    disabled={isPending}
                    error={fieldErrors.image} 
                  />
                </Tabs.Panel>

                <Tabs.Panel value="upload">
                  <FileInput
                    placeholder="Select image file"
                    description="Simulates an upload"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handleMockUpload}
                    disabled={isPending || isUploading}
                    leftSection={<Upload size={16} />}
                  />
                </Tabs.Panel>
              </Tabs>
              
              {formData.image && (
                <Button 
                  variant="subtle" 
                  color="red" 
                  size="xs" 
                  fullWidth 
                  mt="sm" 
                  onClick={() => handleChange('image', '')}
                >
                  Remove Avatar
                </Button>
              )}
            </Paper>

            {staff && (
              <Paper shadow="xs" p="xl" radius="md" withBorder>
                <Group mb="md" gap="xs">
                  <ThemeIcon variant="light" color="grape" size="sm">
                    <Shield size={14} />
                  </ThemeIcon>
                  <Text fw={600} size="sm">Staff Profile</Text>
                </Group>
                
                <Stack gap="xs">
                  <Group justify="space-between">
                    <Text size="xs" c="dimmed">Employee ID</Text>
                    <Text size="xs" fw={500}>{staff.employeeId}</Text>
                  </Group>
                  <Group justify="space-between">
                    <Text size="xs" c="dimmed">Rank</Text>
                    <Text size="xs" fw={500}>{staff.rank?.replace('_', ' ') || 'N/A'}</Text>
                  </Group>
                  <Divider my={5} />
                  <Group justify="space-between">
                    <Text size="xs" c="dimmed">Base Airport</Text>
                    <Group gap={4}>
                      <MapPin size={12} color="gray" />
                      <Text size="xs" fw={500}>{staff.baseAirport?.iataCode || 'N/A'}</Text>
                    </Group>
                  </Group>
                  <Group justify="space-between">
                    <Text size="xs" c="dimmed">Station</Text>
                    <Group gap={4}>
                      <Briefcase size={12} color="gray" />
                      <Text size="xs" fw={500}>{staff.station?.iataCode || 'N/A'}</Text>
                    </Group>
                  </Group>
                </Stack>
                
                <Alert mt="md" p="xs" color="gray" variant="light" styles={{ label: { fontSize: '10px' }, message: { fontSize: '10px' } }}>
                  Professional details are managed by Human Resources.
                </Alert>
              </Paper>
            )}
          </Stack>
        </Grid.Col>

        {/* Edit Form */}
        <Grid.Col span={{ base: 12, md: 8 }}>
          <form onSubmit={handleSubmit}>
            <Paper shadow="xs" p="xl" radius="md" withBorder pos="relative">
              <LoadingOverlay visible={isPending} overlayProps={{ radius: "sm", blur: 1 }} />
              
              <Title order={4} mb="lg">General Information</Title>
              
              <Stack gap="md">
                {globalError && (
                  <Alert icon={<AlertTriangle size={16} />} color="red" variant="light">
                    {globalError}
                  </Alert>
                )}

                <TextInput 
                  label="Display Name" 
                  placeholder="Your full name"
                  leftSection={<User size={16} />}
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.currentTarget.value)}
                  error={fieldErrors.name}
                  disabled={isPending}
                />

                <TextInput 
                  label="Phone Number" 
                  placeholder="e.g. +66 81 234 5678"
                  leftSection={<Phone size={16} />}
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.currentTarget.value)}
                  error={fieldErrors.phone}
                  disabled={isPending}
                />

                <Divider my="md" />
                
                <Group justify="flex-end">
                  <Button type="submit" loading={isPending} leftSection={<Save size={18} />}>
                    Save Settings
                  </Button>
                </Group>
              </Stack>
            </Paper>
          </form>
        </Grid.Col>
      </Grid>
    </Container>
  );
}
