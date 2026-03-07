"use client";

import { 
  Button, Group, TextInput, Title, Paper, Container, 
  Stack, LoadingOverlay, Text, ThemeIcon, Select, Textarea, Grid,
  Combobox, useCombobox, InputBase, Loader, ActionIcon
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useState, useTransition, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, MessageSquareWarning, Check, X, Info, Search, ChevronDown } from 'lucide-react';
import { createIssueReportAction } from '@/actions/issue-actions';
import { searchFlightsAction } from '@/actions/flight-actions';
import { useDebouncedValue } from '@mantine/hooks';

interface IssueReportFormProps {
  initialFlights?: { id: string; flightCode: string; route: string }[];
}

export function IssueReportForm({ initialFlights = [] }: IssueReportFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const [formData, setFormData] = useState({
    category: 'flight',
    description: '',
    flightId: '',
  });

  // --- Flight Search State ---
  const [search, setSearch] = useState('');
  const [debouncedSearch] = useDebouncedValue(search, 300);
  const [flights, setFlights] = useState(initialFlights);
  const [isSearching, setIsSearching] = useState(false);

  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
  });

  // Fetch flights when search term changes
  useEffect(() => {
    if (formData.category !== 'flight') return;
    
    const fetchFlights = async () => {
      setIsSearching(true);
      const result = await searchFlightsAction(debouncedSearch, 1, 50);
      setFlights(result.data);
      setIsSearching(false);
    };

    fetchFlights();
  }, [debouncedSearch, formData.category]);

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

  const selectedFlight = flights.find((f) => f.id === formData.flightId);

  const options = flights.map((item) => (
    <Combobox.Option value={item.id} key={item.id}>
      <Group gap="xs">
        <Text fw={500} size="sm">{item.flightCode}</Text>
        <Text size="xs" c="dimmed">{item.route}</Text>
      </Group>
    </Combobox.Option>
  ));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});

    startTransition(async () => {
      // payload matches CreateIssueReportInput + flightId
      const result = await createIssueReportAction({
        category: formData.category as any,
        description: formData.description,
        attachments: [], 
        flightId: formData.category === 'flight' ? formData.flightId : undefined,
      });

      if (result?.error) {
        notifications.show({
          title: "Submission Failed",
          message: result.error,
          color: "red",
          icon: <X size={18} />,
        });
      } else {
        notifications.show({
          title: "Report Submitted",
          message: "Your issue has been reported successfully. It has also been logged in Flight Operations.",
          color: "green",
          icon: <Check size={18} />,
        });
        router.push('/admin/dashboard');
      }
    });
  };

  return (
    <Container size="lg" py="xl" pos="relative">
      <LoadingOverlay visible={isPending} overlayProps={{ radius: "sm", blur: 2 }} />

      {/* HEADER */}
      <Group justify="space-between" mb="xl">
        <div>
          <Title order={2}>Report an Issue</Title>
          <Text c="dimmed" size="sm">Please provide details about the problem you encountered</Text>
        </div>
        <Button 
          variant="subtle" 
          color="gray" 
          leftSection={<ArrowLeft size={18} />} 
          onClick={() => router.back()} 
          disabled={isPending}
        >
          Back to Dashboard
        </Button>
      </Group>

      <form onSubmit={handleSubmit}>
        <Grid gutter="xl">
          {/* LEFT COLUMN: Form Fields */}
          <Grid.Col span={{ base: 12, md: 8 }}>
            <Stack gap="lg">
              
              {/* SECTION: Issue Details */}
              <Paper shadow="xs" p="xl" radius="md" withBorder>
                <Group mb="md" gap="sm">
                  <ThemeIcon variant="light" size="md" color="blue">
                    <MessageSquareWarning size={16} />
                  </ThemeIcon>
                  <Text fw={600} size="lg">Issue Details</Text>
                </Group>

                <Stack gap="md">
                    <Select
                      label="Category"
                      description="Select the most relevant category for this issue"
                      placeholder="Select issue category"
                      data={[
                        { value: 'flight', label: 'Flight' },
                        { value: 'payment', label: 'Payment' },
                      ]}
                      value={formData.category}
                      onChange={(val) => handleChange('category', val || 'flight')}
                      required
                      disabled={isPending}
                    />

                    {formData.category === 'flight' && (
                      <Combobox
                        store={combobox}
                        onOptionSubmit={(val) => {
                          handleChange('flightId', val);
                          combobox.closeDropdown();
                        }}
                      >
                        <Combobox.Target>
                          <InputBase
                            label="Related Flight"
                            description="Search by flight code"
                            placeholder="Type to search flights (e.g. TG123)"
                            component="button"
                            type="button"
                            pointer
                            rightSection={isSearching ? <Loader size={16} /> : <ChevronDown size={16} />}
                            onClick={() => combobox.toggleDropdown()}
                          >
                            {selectedFlight ? `${selectedFlight.flightCode} (${selectedFlight.route})` : <Text c="dimmed" size="sm">Select flight</Text>}
                          </InputBase>
                        </Combobox.Target>

                        <Combobox.Dropdown>
                          <Combobox.Search
                            value={search}
                            onChange={(event) => setSearch(event.currentTarget.value)}
                            placeholder="Search flight code..."
                            leftSection={<Search size={16} />}
                          />
                          <Combobox.Options>
                            {options.length > 0 ? options : <Combobox.Empty>No flights found</Combobox.Empty>}
                          </Combobox.Options>
                        </Combobox.Dropdown>
                      </Combobox>
                    )}

                    <Textarea
                      label="Description"
                      description="Describe the issue in detail so we can investigate"
                      placeholder="Describe the issue in detail..."
                      minRows={6}
                      value={formData.description}
                      onChange={(e) => handleChange('description', e.currentTarget.value)}
                      required
                      disabled={isPending}
                    />
                </Stack>
              </Paper>
            </Stack>
          </Grid.Col>

          {/* RIGHT COLUMN: Action Panel */}
          <Grid.Col span={{ base: 12, md: 4 }}>
            <Paper shadow="xs" p="xl" radius="md" withBorder style={{ position: 'sticky', top: 20 }}>
                <Group mb="xs" gap="xs">
                    <ThemeIcon variant="light" size="xs" color="gray">
                        <Info size={12} />
                    </ThemeIcon>
                    <Text fw={600} size="md">Submit Report</Text>
                </Group>
              
              <Text size="sm" c="dimmed" mb="xl">
                Once submitted, our support team will review the issue. You can check the status of your reports in the dashboard.
              </Text>
              
              <Stack>
                <Button 
                  type="submit" 
                  size="md"
                  leftSection={<Save size={18} />} 
                  loading={isPending}
                  fullWidth
                >
                  Submit Issue
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
