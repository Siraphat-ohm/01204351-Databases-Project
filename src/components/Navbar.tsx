'use client';

import { Group, Button, Text, Container, Anchor } from '@mantine/core';
import Link from 'next/link';

export function Navbar() {
  return (
    <nav style={{ borderBottom: '1px solid #e9ecef', height: '60px', display: 'flex', alignItems: 'center' }}>
      <Container size="xl" style={{ width: '100%' }}>
        <Group justify="space-between">
          <Anchor component={Link} href="/" underline="never">
            <Text size="xl" fw={900} variant="gradient" gradient={{ from: 'blue', to: 'cyan' }}>
              YokAirlines
            </Text>
          </Anchor>

          <Group>
            <Button variant="subtle" component={Link} href="/">Flight</Button>
            <Button variant="filled" component={Link} href="/Login">Login</Button>
          </Group>
        </Group>
      </Container>
    </nav>
  );
}