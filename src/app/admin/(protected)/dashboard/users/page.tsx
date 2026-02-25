import { UserManagement } from "@/components/UserManagement";

// --- Types mirroring Prisma Result ---
type Role = 'PASSENGER' | 'ADMIN' | 'PILOT' | 'CABIN_CREW' | 'GROUND_STAFF' | 'MECHANIC';
type Rank = 'CAPTAIN' | 'FIRST_OFFICER' | 'PURSER' | 'CREW' | 'MANAGER' | 'SUPERVISOR' | 'STAFF';

interface User {
  id: number;
  username: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: Role;
  // Relation
  staffProfile: {
    employeeId: string;
    rank: Rank | null;
    baseAirport: {
      iataCode: string;
      city: string;
    } | null;
  } | null;
}

// --- Mock Service ---
async function getUsers(): Promise<User[]> {
  // Simulate Network Latency
  await new Promise((resolve) => setTimeout(resolve, 600));

  // Mock Data
  return [
    {
      id: 1,
      username: 'admin_sys',
      email: 'admin@yokairline.com',
      firstName: 'System',
      lastName: 'Administrator',
      role: 'ADMIN',
      staffProfile: {
        employeeId: 'ADM-001',
        rank: 'MANAGER',
        baseAirport: { iataCode: 'BKK', city: 'Bangkok' }
      }
    },
    {
      id: 2,
      username: 'capt_maverick',
      email: 'maverick@yokairline.com',
      firstName: 'Pete',
      lastName: 'Mitchell',
      role: 'PILOT',
      staffProfile: {
        employeeId: 'PLT-101',
        rank: 'CAPTAIN',
        baseAirport: { iataCode: 'BKK', city: 'Bangkok' }
      }
    },
    {
      id: 3,
      username: 'fo_goose',
      email: 'goose@yokairline.com',
      firstName: 'Nick',
      lastName: 'Bradshaw',
      role: 'PILOT',
      staffProfile: {
        employeeId: 'PLT-102',
        rank: 'FIRST_OFFICER',
        baseAirport: { iataCode: 'CNX', city: 'Chiang Mai' }
      }
    },
    {
      id: 4,
      username: 'sarah_crew',
      email: 'sarah.c@yokairline.com',
      firstName: 'Sarah',
      lastName: 'Connor',
      role: 'CABIN_CREW',
      staffProfile: {
        employeeId: 'CC-205',
        rank: 'PURSER',
        baseAirport: { iataCode: 'NRT', city: 'Tokyo' }
      }
    },
    {
      id: 5,
      username: 'john_mechanic',
      email: 'john.m@yokairline.com',
      firstName: 'John',
      lastName: 'McClane',
      role: 'MECHANIC',
      staffProfile: {
        employeeId: 'MEC-099',
        rank: 'SUPERVISOR',
        baseAirport: { iataCode: 'LHR', city: 'London' }
      }
    },
    {
      id: 6,
      username: 'passenger_01',
      email: 'traveler@gmail.com',
      firstName: 'Alice',
      lastName: 'Wonderland',
      role: 'PASSENGER',
      staffProfile: null // Regular users have no staff profile
    },
    {
      id: 7,
      username: 'gate_staff_01',
      email: 'gate.bkk@yokairline.com',
      firstName: 'Somchai',
      lastName: 'Dee',
      role: 'GROUND_STAFF',
      staffProfile: {
        employeeId: 'GND-555',
        rank: 'STAFF',
        baseAirport: { iataCode: 'BKK', city: 'Bangkok' }
      }
    },
  ];
}

export default async function UsersPage() {
  const usersData = await getUsers();

  return (
    <UserManagement initialUsers={usersData} />
  );
}