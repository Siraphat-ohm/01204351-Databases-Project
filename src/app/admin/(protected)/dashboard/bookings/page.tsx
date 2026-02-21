import { BookingTable } from "@/components/BookingTable";

// --- Types mirroring Prisma Result (with relations) ---
type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED';

interface Booking {
  id: number;
  bookingRef: string;
  status: BookingStatus;
  totalPrice: number; // Prisma Decimal -> mapped to number
  createdAt: Date;
  user: {
    username: string;
    email: string;
  };
  flight: {
    flightCode: string;
    departureTime: Date;
    route: {
      origin: { iataCode: string };
      destination: { iataCode: string };
    };
  };
  _count: {
    tickets: number;
  };
}

// --- Mock Service ---
async function getBookings(): Promise<Booking[]> {
  // Simulate Network Latency
  await new Promise((resolve) => setTimeout(resolve, 600));

  // Mock Data
  return [
    {
      id: 1,
      bookingRef: 'PNR8X2',
      status: 'CONFIRMED',
      totalPrice: 450.00,
      createdAt: new Date('2024-05-18T10:30:00'),
      user: { username: 'john_doe', email: 'john@example.com' },
      flight: {
        flightCode: 'TG101',
        departureTime: new Date('2024-05-20T08:00:00'),
        route: { origin: { iataCode: 'BKK' }, destination: { iataCode: 'CNX' } }
      },
      _count: { tickets: 2 }
    },
    {
      id: 2,
      bookingRef: 'PNR99A',
      status: 'PENDING',
      totalPrice: 1200.50,
      createdAt: new Date('2024-05-19T14:15:00'),
      user: { username: 'alice_smith', email: 'alice@test.com' },
      flight: {
        flightCode: 'TG676',
        departureTime: new Date('2024-05-21T23:45:00'),
        route: { origin: { iataCode: 'BKK' }, destination: { iataCode: 'NRT' } }
      },
      _count: { tickets: 1 }
    },
    {
      id: 3,
      bookingRef: 'PNR77B',
      status: 'CANCELLED',
      totalPrice: 320.00,
      createdAt: new Date('2024-05-10T09:00:00'),
      user: { username: 'bob_w', email: 'bob@work.com' },
      flight: {
        flightCode: 'WE244',
        departureTime: new Date('2024-05-15T10:30:00'),
        route: { origin: { iataCode: 'DMK' }, destination: { iataCode: 'HKT' } }
      },
      _count: { tickets: 1 }
    },
    {
      id: 4,
      bookingRef: 'PNR33C',
      status: 'CONFIRMED',
      totalPrice: 2800.00,
      createdAt: new Date('2024-05-18T16:45:00'),
      user: { username: 'travel_agency', email: 'agent@agency.com' },
      flight: {
        flightCode: 'TG911',
        departureTime: new Date('2024-06-01T13:15:00'),
        route: { origin: { iataCode: 'LHR' }, destination: { iataCode: 'BKK' } }
      },
      _count: { tickets: 4 }
    },
  ];
}

export default async function BookingsPage() {
  const bookingsData = await getBookings();

  return (
    <BookingTable initialBookings={bookingsData} />
  );
}