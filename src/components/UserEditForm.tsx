"use client";

import { 
  Title, Group, Button, TextInput, Paper, Container, 
  Grid, Stack, LoadingOverlay, Text, Avatar, Tabs, FileInput, Divider, Alert
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Save, User, Link as LinkIcon, Upload, Check, X, AlertTriangle, Phone, ArrowLeft } from 'lucide-react';
import { adminUpdateUserAction } from '@/actions/user-actions';
import { UserAdmin } from '@/types/user.type'; 

interface UserEditFormProps {
  user: UserAdmin;
}

export function UserEditForm({ user }: UserEditFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isUploading, setIsUploading] = useState(false);
  
  // 🌟 ENHANCED ERROR STATE
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

      const result = await adminUpdateUserAction(user.id, payload);

      if (!result || 'error' in result) {
        if ('fieldErrors' in result && result.fieldErrors) {
          const rawErrors = result.fieldErrors as Record<string, string[] | undefined>;
          const formattedErrors: Record<string, string> = {};
          
          for (const key in rawErrors) {
            const messages = rawErrors[key];
            if (messages && messages.length > 0) {
              formattedErrors[key] = messages[0];
            }
          }
          
          setFieldErrors(formattedErrors);
          setGlobalError("Please fix the highlighted fields.");
        } else {
          setGlobalError(result.error as string);
        }

        notifications.show({
          title: "Update Failed",
          message: "Could not update user details.",
          color: "red",
          icon: <X size={18} />,
        });
      } else {
        notifications.show({
          title: "User Updated",
          message: `${formData.name || user.email}'s profile was updated successfully.`,
          color: "green",
          icon: <Check size={18} />,
        });
        // Note: No router.refresh() here, the Server Action handles the redirect back to the table!
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
      <Button 
        variant="subtle" 
        color="gray" 
        leftSection={<ArrowLeft size={16} />} 
        mb="md" 
        onClick={() => router.back()}
      >
        Back to Users
      </Button>

      <Group justify="space-between" mb="xl">
        <div>
          <Title order={2}>Edit User Details</Title>
          <Text c="dimmed" size="sm">Modifying details for {user.email}</Text>
        </div>
      </Group>

      <form onSubmit={handleSubmit}>
        <Grid gutter="xl">
          
          {/* ────────────────────────────────────────────────
              LEFT COLUMN: AVATAR & IMAGE UPLOAD
              ──────────────────────────────────────────────── */}
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

          {/* ────────────────────────────────────────────────
              RIGHT COLUMN: PERSONAL DETAILS
              ──────────────────────────────────────────────── */}
          <Grid.Col span={{ base: 12, md: 8 }}>
            <Paper shadow="xs" p="xl" radius="md" withBorder pos="relative">
              <LoadingOverlay visible={isPending} overlayProps={{ radius: "sm", blur: 2 }} />
              
              <Title order={4} mb="md">Personal Information</Title>
              
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
                      leftSection={<User size={16} color="var(--mantine-color-gray-5)" />}
                      value={formData.name}
                      onChange={(e) => handleChange('name', e.currentTarget.value)}
                      error={fieldErrors.name} 
                      description="Your Full name and Sir name"
                    />
                  </Grid.Col>
                  <Grid.Col span={{ base: 12, sm: 6 }}>
                    <TextInput 
                      label="Email Address" 
                      value={user.email}
                      disabled
                      description="Email cannot be changed directly"
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