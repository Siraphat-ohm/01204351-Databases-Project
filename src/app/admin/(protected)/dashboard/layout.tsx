"use client";

import { 
  AppShell, Burger, Group, Title, Text, NavLink, Button, 
  Avatar, Menu, UnstyledButton, ThemeIcon, Badge, ScrollArea, Divider
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { 
  // Icons สำหรับฟีเจอร์ใหม่
  LayoutDashboard, 
  PlaneTakeoff,     // สำหรับ Flights
  Plane,            // สำหรับ Aircraft
  MapPin,           // สำหรับ Airports
  Ticket,           // สำหรับ Bookings
  Users,            // สำหรับ User/Crew
  MessageSquareWarning, // สำหรับ Customer Issues
  FileClock,        // สำหรับ Logs
  Settings,
  LogOut, 
  Bell
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

// ปรับ Nav Data ตาม Requirement ใหม่
const navData = [
  { category: 'Overview' },
  { label: 'Dashboard', icon: LayoutDashboard, link: '/admin/dashboard' },

  { category: 'Operations' },
  { label: 'Flight Schedule', icon: PlaneTakeoff, link: '/admin/dashboard/flights' }, // Add/Mod/Del Flight
  { label: 'Fleet / Aircraft', icon: Plane, link: '/admin/dashboard/aircraft' },      // Add/Mod/Del Aircraft
  { label: 'Airports', icon: MapPin, link: '/admin/dashboard/airports' },             // Add/Mod/Del Airport
  
  { category: 'Commercial' },
  { label: 'Tickets & Booking', icon: Ticket, link: '/admin/dashboard/bookings' },    // Add/Mod/Cancel/Book for customer

  { category: 'Management' },
  { label: 'Users & Crew', icon: Users, link: '/admin/dashboard/users' },             // View/Mod/Del/Role Change
  { label: 'Customer Issues', icon: MessageSquareWarning, link: '/admin/dashboard/issues', alert: true }, // Answer Issues

  { category: 'System' },
  { label: 'Audit Logs', icon: FileClock, link: '/admin/dashboard/logs' },            // Login/Ticket/Trans/Flight Logs
  { label: 'Settings', icon: Settings, link: '/admin/dashboard/settings' },
];

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const [mobileOpened, { toggle: toggleMobile }] = useDisclosure();
  const [desktopOpened, { toggle: toggleDesktop }] = useDisclosure(true);
  const pathname = usePathname();

  // ฟังก์ชัน Helper เพื่อ render NavLink พร้อม Category
  const renderNavItems = () => {
    return navData.map((item, index) => {
      // 1. ถ้าเป็น Category Header
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

      // 2. ถ้าเป็น Link ปกติ
      // ดึง Icon ออกมาใส่ตัวแปรไว้ก่อน (เพื่อให้ใช้ JSX Tag ได้)
      const Icon = item.icon;

      return (
        <NavLink
          key={item.label}
          component={Link}
          href={item.link!} 
          active={pathname === item.link}
          label={item.label}
          // ✅ แก้ไขตรงนี้: เช็คว่ามี Icon ไหม ถ้ามีค่อย Render
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
      {/* ... (Header Code ส่วนเดิม ไม่เปลี่ยนแปลง) ... */}
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
           {/* ... (User Profile ส่วนเดิม) ... */}
           <Group>
             <Button variant="subtle" size="compact-md" px={5}>
               <Bell size={20} />
             </Button>
             <Menu shadow="md" width={200}>
               <Menu.Target>
                 <UnstyledButton>
                   <Group gap={8}>
                     <Avatar radius="xl" color="blue">AD</Avatar>
                     <div style={{ flex: 1 }}>
                       <Text size="sm" fw={500}>Admin</Text>
                       <Text c="dimmed" size="xs">Super User</Text>
                     </div>
                   </Group>
                 </UnstyledButton>
               </Menu.Target>
               <Menu.Dropdown>
                 <Menu.Item color="red" leftSection={<LogOut size={14} />}>Logout</Menu.Item>
               </Menu.Dropdown>
             </Menu>
           </Group>
         </Group>
      </AppShell.Header>

      {/* --- NAVBAR ที่ปรับปรุงแล้ว --- */}
      <AppShell.Navbar p="md">
        <Group px="md" mb="xl" visibleFrom="sm">
          <ThemeIcon size="lg" variant="light" color="blue">
            <PlaneTakeoff size={20} />
          </ThemeIcon>
          <Title order={3}>AeroAdmin</Title>
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