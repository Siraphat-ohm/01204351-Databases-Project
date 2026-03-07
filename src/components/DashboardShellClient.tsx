"use client";

import { 
  AppShell, Burger, Group, Title, Text, NavLink, Button, 
  Avatar, Menu, UnstyledButton, ThemeIcon, Badge, ScrollArea, Divider
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { 
  LayoutDashboard, 
  PlaneTakeoff,     
  Plane,            
  MapPin,           
  Users,            
  MessageSquareWarning, 
  FileClock,        
  Settings,
  LogOut, 
  Bell,
  Milestone,
  Archive
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { notifications } from '@mantine/notifications';

// 🌟 Import your sign out helper (update the path to match your project structure)
import { signOutCurrentUser } from '@/services/auth-client.service';

// Keep your existing navData array here
const navData = [
  { category: 'Overview' },
  { label: 'Dashboard', icon: LayoutDashboard, link: '/admin/dashboard' },
  { category: 'Operations' },
  { label: 'Flight Schedule', icon: PlaneTakeoff, link: '/admin/dashboard/flights' }, 
  { label: 'Fleet / Aircraft', icon: Plane, link: '/admin/dashboard/aircraft' },      
  { label: 'Airports', icon: MapPin, link: '/admin/dashboard/airports' },             
  { label: 'Routes', icon: Milestone, link: '/admin/dashboard/routes' },
  { category: 'Management' },
  { label: 'Users & Crew', icon: Users, link: '/admin/dashboard/users' },             
  { label: 'Customer Issues', icon: MessageSquareWarning, link: '/admin/dashboard/issues', alert: true }, 
  { label: 'Report Issue', icon: MessageSquareWarning, link: '/admin/dashboard/report-issue' }, 
  { category: 'System' },
  { label: 'Payment Logs', icon: Archive, link: '/admin/dashboard/payment-logs' },
  { label: 'Flight Operation Logs', icon: FileClock, link: '/admin/dashboard/ops-log' },            
  { label: 'Settings', icon: Settings, link: '/admin/dashboard/settings' },
];

export default function DashboardShellClient({ 
  children, 
  user 
}: { 
  children: React.ReactNode,
  user: any 
}) {
  const [mobileOpened, { toggle: toggleMobile }] = useDisclosure();
  const [desktopOpened, { toggle: toggleDesktop }] = useDisclosure(true);
  
  const pathname = usePathname();
  const router = useRouter(); // 🌟 Initialize useRouter

  // 🌟 Handle Logout using Better Auth
  const handleLogout = async () => {
    await signOutCurrentUser({
      fetchOptions: {
        onSuccess: () => {
          // Hard redirect to clear any client-side cache and session states effectively
          notifications.show({
            title: "Logged Out",
            message: "You have been successfully logged out.",
            color: "green"});
          router.replace('/admin/login');
          
        }
      }
    });
  };

  const getInitials = (name?: string, email?: string) => {
    if (name) return name.substring(0, 2).toUpperCase();
    if (email) return email.substring(0, 2).toUpperCase();
    return "U";
  };

  const displayName = user?.name || user?.email?.split('@')[0] || "User";
  const displayRole = user?.role?.replace('_', ' ') || "Staff";

  const renderNavItems = () => {
    const isAdmin = user?.role === 'ADMIN';

    return navData
      .filter(item => {
        if (isAdmin) return true;
        // Staff filter
        if (item.category === 'Management') return false;
        if (item.category === 'System') return false;
        if (item.label === 'Users & Crew') return false;
        if (item.label === 'Customer Issues') return false;
        if (item.label === 'Payment Logs') return false;
        if (item.label === 'Flight Operation Logs') return false;
        return true;
      })
      .map((item, index) => {
        if (item.category) {
        return (
          <Text 
            key={index} 
            size="xs" fw={700} c="dimmed" tt="uppercase" 
            mt="md" mb="xs" pl="xs"
            style={{ display: !desktopOpened && window.innerWidth >= 768 ? 'none' : 'block' }}
          >
            {item.category}
          </Text>
        );
      }

      const Icon = item.icon;

      return (
        <NavLink
          key={item.label}
          component={Link}
          href={item.link!} 
          active={pathname === item.link}
          label={item.label}
          leftSection={Icon ? <Icon size="1rem" strokeWidth={1.5} /> : null}
          onClick={() => toggleMobile()}
          variant="light"
          rightSection={item.alert && <Badge size="xs" circle color="red" variant="filled">!</Badge>}
          styles={{
            root: { borderRadius: 8, marginBottom: 4 }
          }}
        />
      );
    });
  };

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{
        width: 300,
        breakpoint: 'sm',
        collapsed: { mobile: !mobileOpened, desktop: !desktopOpened },
      }}
      padding="md"
      layout="alt"
    >
      <AppShell.Header>
         <Group h="100%" px="md" justify="space-between">
           <Group>
             <Burger opened={mobileOpened} onClick={toggleMobile} hiddenFrom="sm" size="sm" />
             <Burger opened={desktopOpened} onClick={toggleDesktop} visibleFrom="sm" size="sm" />
             <Group style={{ display: (!desktopOpened || (typeof window !== 'undefined' && window.innerWidth < 768)) ? 'flex' : undefined }}> 
                <Group hiddenFrom="sm">
                  <PlaneTakeoff size={24} color="#228be6" />
                  <Title order={4}>YokAirline</Title>
                </Group>
                <Group visibleFrom="sm" style={{ display: !desktopOpened ? 'flex' : 'none' }}>
                  <PlaneTakeoff size={24} color="#228be6" />
                  <Title order={4}>YokAirline</Title>
                </Group>
             </Group>
           </Group>

           {/* --- REAL USER PROFILE SECTION --- */}
           <Group>
             <Button variant="subtle" size="compact-md" px={5}>
               <Bell size={20} />
             </Button>
             
             <Menu shadow="md" width={200} position="bottom-end">
               <Menu.Target>
                 <UnstyledButton>
                   <Group gap={8}>
                     <Avatar 
                       radius="xl" 
                       color="blue" 
                       src={user?.image || null}
                     >
                       {getInitials(user?.name, user?.email)}
                     </Avatar>
                     <div style={{ flex: 1 }}>
                       <Text size="sm" fw={500} style={{ textTransform: 'capitalize' }}>
                         {displayName}
                       </Text>
                       <Text c="dimmed" size="xs" style={{ textTransform: 'capitalize' }}>
                         {displayRole}
                       </Text>
                     </div>
                   </Group>
                 </UnstyledButton>
               </Menu.Target>
               
               <Menu.Dropdown>
                 <Menu.Label>Application</Menu.Label>
                 <Menu.Item leftSection={<Settings size={14} />} component={Link} href="/admin/dashboard/settings">
                   Account settings
                 </Menu.Item>
                 <Menu.Divider />
                 
                 {/* 🌟 LOGOUT BUTTON */}
                 <Menu.Item 
                   color="red" 
                   leftSection={<LogOut size={14} />} 
                   onClick={handleLogout}
                 >
                   Logout
                 </Menu.Item>
                 
               </Menu.Dropdown>
             </Menu>
           </Group>
         </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <Group px="md" mb="xl" visibleFrom="sm">
          <ThemeIcon size="lg" variant="light" color="blue">
            <PlaneTakeoff size={20} />
          </ThemeIcon>
          <Title order={3}>YokAirline</Title>
        </Group>

        <AppShell.Section grow component={ScrollArea}>
          {renderNavItems()}
        </AppShell.Section>
        
        <Divider my="sm" />
        
        <div style={{ paddingTop: '0.5rem' }}>
           <Text size="xs" c="dimmed" ta="center">System v2.5.0</Text>
        </div>
      </AppShell.Navbar>

      <AppShell.Main>
        {children}
      </AppShell.Main>
    </AppShell>
  );
}