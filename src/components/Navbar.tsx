"use client";

import { Group, Button, Text, Menu, Avatar, rem, UnstyledButton } from "@mantine/core";
import { IconLogout, IconChevronDown, IconTicket, IconPlane } from "@tabler/icons-react"; // Added IconPlane
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useAuthSession, signOutCurrentUser } from "@/services/auth-client.service";

export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data: session } = useAuthSession();

  const handleLoginRedirect = () => {
    const currentFullUrl = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : "");
    router.push(`/login?callbackURL=${encodeURIComponent(currentFullUrl)}`);
  };

  const handleLogout = async () => {
    await signOutCurrentUser();
    router.refresh();
  };

  return (
    <nav style={{ height: rem(60), padding: '0 30px', borderBottom: '1px solid #eee', backgroundColor: 'white' }}>
      <Group justify="space-between" h="100%">
        <Text fw={900} size="xl" style={{ cursor: 'pointer', letterSpacing: '1px' }} onClick={() => router.push('/')}>
          YOKAIRLINES
        </Text>

        <Group>
          {session ? (
            <Menu shadow="md" width={200} transitionProps={{ transition: 'pop-top-right' }}>
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
                <Menu.Label>Services</Menu.Label>
                
                {/* --- ADDED SEARCH FLIGHTS ITEM --- */}
                <Menu.Item 
                  leftSection={<IconPlane size={14} />}
                  onClick={() => router.push('/FlightSearch')}
                >
                  Search Flights
                </Menu.Item>

                <Menu.Item 
                  leftSection={<IconTicket size={14} />}
                  onClick={() => router.push('/history')}
                >
                  My Tickets
                </Menu.Item>

                <Menu.Divider />

                <Menu.Label>Account</Menu.Label>
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
            <Button variant="filled" onClick={handleLoginRedirect}>
              Login
            </Button>
          )}
        </Group>
      </Group>
    </nav>
  );
}