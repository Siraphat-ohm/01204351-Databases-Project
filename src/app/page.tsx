"use client";

import { Center, Button, Stack, Title, Text } from '@mantine/core';
import Link from 'next/link';

export default function Home() {
  return (
    <Center h="100vh" bg="gray.1">
      <Stack align="center" gap="md">
        <Title>Airline Backoffice</Title>
        <Text c="dimmed">Internal System v2.0</Text>
        
        <Button component={Link} href="/dashboard" size="lg">
          Enter Dashboard
        </Button>
      </Stack>
    </Center>
  );
}