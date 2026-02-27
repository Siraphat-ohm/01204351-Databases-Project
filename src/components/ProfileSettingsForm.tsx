"use client";

import { 
  Title, Group, Button, TextInput, Paper, Container, 
  Grid, Stack, LoadingOverlay, Text, Avatar, Tabs, FileInput, Divider, Alert
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Save, User, Link as LinkIcon, Upload, Check, X, AlertTriangle, Phone } from 'lucide-react';
import { updateMyProfileAction } from '@/actions/user-actions';
import { UserSelf } from '@/types/user.type';

interface ProfileSettingsFormProps {
  user: UserSelf;
}

export function ProfileSettingsForm({ user }: ProfileSettingsFormProps) {
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

    // Basic Client-Side Validation
    if (formData.phone && formData.phone.length < 7) {
      setFieldErrors({ phone: "Phone number is too short" });
      return;
    }

    startTransition(async () => {
      const payload = {
        name: formData.name.trim() || undefined,
        phone: formData.phone.trim() || undefined,
        image: formData.image.trim() || undefined,
      };

      try {
        const result = await updateMyProfileAction(payload);
        
        // Handle Errors (Validation or Server Errors)
        if (result?.error || result?.fieldErrors) {
          if (result.fieldErrors) {
            const formattedErrors: Record<string, string> = {};
            // Extract the first error message for each field from Zod's format
            for (const [key, messages] of Object.entries(result.fieldErrors)) {
              if (messages && messages.length > 0) {
                formattedErrors[key] = messages[0];
              }
            }
            setFieldErrors(formattedErrors);
          }
          
          setGlobalError(result.error || "Could not save your profile.");
          
          notifications.show({
            title: "Update Failed",
            message: result.error || "Please fix the errors in the form.",
            color: "red",
            icon: <X size={18} />,
          });
          return;
        }

        // 🌟 SUCCESS BLOCK 🌟
        if (result?.success) {
          notifications.show({
            title: "Profile Updated",
            message: "Your profile has been saved successfully.",
            color: "green",
            icon: <Check size={18} />,
          });
          router.refresh(); // Refresh to get updated data
          router.back();
        }
      } catch (err) {
        setGlobalError("A critical error occurred while communicating with the server.");
        notifications.show({
          title: "Network Error",
          message: "Could not reach the server.",
          color: "red",
          icon: <X size={18} />,
        });
      }
    });
  };

  const getInitials = () => {
    if (formData.name) return formData.name.substring(0, 2).toUpperCase();
    if (user.email) return user.email.substring(0, 2).toUpperCase();
    return "U";
  };

  return (
    <Container size="lg" py="xl">
      <Group justify="space-between" mb="xl">
        <div>
          <Title order={2}>Profile Settings</Title>
          <Text c="dimmed" size="sm">Manage your personal information and avatar</Text>
        </div>
      </Group>

      <form onSubmit={handleSubmit}>
        <Grid gutter="xl">
          {/* Avatar Settings */}
          <Grid.Col span={{ base: 12, md: 4 }}>
            <Paper shadow="xs" p="xl" radius="md" withBorder pos="relative">
              <LoadingOverlay visible={isUploading} overlayProps={{ radius: "sm", blur: 2 }} loaderProps={{ type: 'dots' }} />
              
              <Stack align="center" mb="lg">
                <Avatar 
                  src={formData.image || null} 
                  size={120} 
                  radius="100%" 
                  color="blue"
                  style={{ border: '4px solid var(--mantine-color-gray-1)' }}
                  alt={formData.name || "User Avatar"}
                >
                  <Text size="xl" fw={700}>{getInitials()}</Text>
                </Avatar>
                <div>
                  <Text fw={600} ta="center">{formData.name || "Unnamed User"}</Text>
                  <Text size="xs" c="dimmed" ta="center">{user.role.replace('_', ' ')}</Text>
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
                    description="Simulates an upload and generates a mock URL"
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
          </Grid.Col>

          {/* Personal Details */}
          <Grid.Col span={{ base: 12, md: 8 }}>
            <Paper shadow="xs" p="xl" radius="md" withBorder pos="relative">
              <LoadingOverlay visible={isPending} overlayProps={{ radius: "sm", blur: 2 }} />
              
              <Title order={4} mb="md">Personal Details</Title>
              
              <Stack gap="md">
                {globalError && (
                  <Alert icon={<AlertTriangle size={16} />} title="Error" color="red" variant="light">
                    {globalError}
                  </Alert>
                )}

                <Grid>
                  <Grid.Col span={{ base: 12, sm: 6 }}>
                    <TextInput 
                      label="Full Name" 
                      placeholder="e.g. John Doe"
                      description="Your display name in the system"
                      leftSection={<User size={16} color="var(--mantine-color-gray-5)" />}
                      value={formData.name}
                      onChange={(e) => handleChange('name', e.currentTarget.value)}
                      required
                      error={fieldErrors.name} 
                    />
                  </Grid.Col>
                  <Grid.Col span={{ base: 12, sm: 6 }}>
                    <TextInput 
                      label="Email Address" 
                      value={user.email}
                      disabled
                      description="Contact IT Admin to change email"
                    />
                  </Grid.Col>
                  <Grid.Col span={{ base: 12, sm: 6 }}>
                    <TextInput 
                      label="Phone Number" 
                      placeholder="e.g. +66 81 234 5678"
                      leftSection={<Phone size={16} color="var(--mantine-color-gray-5)" />}
                      value={formData.phone}
                      onChange={(e) => handleChange('phone', e.currentTarget.value)}
                      error={fieldErrors.phone} 
                    />
                  </Grid.Col>
                </Grid>

                <Divider my="md" />

                <Group justify="flex-end">
                  <Button 
                    variant="default" 
                    onClick={() => router.back()} 
                    disabled={isPending}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    loading={isPending} 
                    leftSection={<Save size={18} />}
                  >
                    Save Changes
                  </Button>
                </Group>
              </Stack>
            </Paper>
          </Grid.Col>
        </Grid>
      </form>
    </Container>
  );
}