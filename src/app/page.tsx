// app/page.tsx
"use client";
import { Button, Group, Title, Text, AppShell,Burger } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';

export default function Home() {
  const [opened, { toggle }] = useDisclosure();
  return (
    <AppShell
      padding="md"
      header={{ height: 60 }}
      navbar={{
        width: 300,
        breakpoint: 'sm',
        collapsed: { mobile: !opened },
      }}
    >
      <AppShell.Header>
        <Burger
          opened={opened}
          onClick={toggle}
          hiddenFrom="sm"
          size="sm"
        />

        <div>Logo</div>
      </AppShell.Header>

      <AppShell.Navbar>Navbar</AppShell.Navbar>

      <AppShell.Main>Main</AppShell.Main>
    </AppShell>
  );
}