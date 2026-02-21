"use client";

import { Group, Button, Text, Menu, Avatar, rem, UnstyledButton } from "@mantine/core";
import { IconLogout, IconChevronDown } from "@tabler/icons-react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useAuthSession, signOutCurrentUser } from "@/services/auth-client.service";

export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data: session } = useAuthSession();

  // Helper to capture current URL and send to login
  const handleLoginRedirect = () => {
    // pathname (e.g. /FlightSearch) + searchParams (e.g. ?origin=BKK...)
    const currentFullUrl = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : "");
    
    // Redirect with encoded callback
    router.push(`/login?callbackURL=${encodeURIComponent(currentFullUrl)}`);
  };

  const handleLogout = async () => {
    await signOutCurrentUser();
    router.refresh(); // Update session state across the app
  };

  

  return (
    <nav style={{ height: rem(60), padding: '0 30px', borderBottom: '1px solid #eee', backgroundColor: 'white' }}>
      <Group justify="space-between" h="100%">
        <Text fw={900} size="xl" style={{ cursor: 'pointer' }} onClick={() => router.push('/')}>
          YOKAIRLINES
        </Text>

        <Group>
          {session ? (
            /* --- LOGGED IN STATE --- */
            <Menu shadow="md" width={200}>
              <Menu.Target>
                <UnstyledButton>
                  <Group gap="xs">
                    <Avatar color="blue" radius="xl" size="sm">
                      {session.user.name?.charAt(0).toUpperCase() || "U"}
                    </Avatar>
                    <Text size="sm" fw={500}>{session.user.name}</Text>
                    <IconChevronDown size={14} />
                  </Group>
                </UnstyledButton>
              </Menu.Target>

              <Menu.Dropdown>
                <Menu.Item 
                  color="red" 
                  leftSection={<IconLogout size={14} />}
                  onClick={handleLogout}
                >
                  Logout
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          ) : (
            /* --- LOGGED OUT STATE --- */
            <Button variant="filled" onClick={handleLoginRedirect}>
              Login
            </Button>
          )}
        </Group>
      </Group>
    </nav>
  );
}