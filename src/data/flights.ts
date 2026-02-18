export interface Flight {
  id: string;
  airline: string;
  logo : string
  flightNumber: string;
  departure: string;
  arrival: string;
  departureTime: string;
  arrivalTime: string;
  duration : string,
  stops : string,
  price: number;
  currency: string
}


// src/data/flights.ts
export const DATE_PRICES = [
  { date: '18 Mar', price: '16.3K', status: 'view' },
  { date: '19 Mar', price: '8.9K', status: 'cheapest' },
  { date: '20 Mar', price: '9.5K', status: 'normal' },
  { date: '21 Mar', price: '17.0K', status: 'selected' },
  { date: '22 Mar', price: '11.5K', status: 'normal' },
  { date: '23 Mar', price: '11.4K', status: 'normal' },
  { date: '24 Mar', price: '12.4K', status: 'normal' },
   { date: '24 Mar', price: '12.4K', status: 'normal' },
    { date: '24 Mar', price: '12.4K', status: 'normal' },
     { date: '24 Mar', price: '12.4K', status: 'normal' },
     
];

export const MOCK_FLIGHTS: Flight[] = [
  {
    id: '1',
    airline: 'YokAirlines',
    logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/3/3d/Vietnam_Airlines_logo_2015.svg/1200px-Vietnam_Airlines_logo_2015.svg.png',
    flightNumber: 'YK101',
    departure: 'Bangkok (BKK)',
    arrival: 'Tokyo (NRT)',
    departureTime: '08:00 AM',
    arrivalTime: '03:30 PM',
    duration: '21h 10m',
    stops: '1 stop (14h 45m at Hanoi)',
    price: 450,
    currency: 'THB'
  },
  {
    id: '2',
    airline: 'YokAirlines',
    logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/3/3d/Vietnam_Airlines_logo_2015.svg/1200px-Vietnam_Airlines_logo_2015.svg.png',
    flightNumber: 'YK202',
    departure: 'Bangkok (BKK)',
    arrival: 'London (LHR)',
    departureTime: '11:45 PM',
    stops: '1 stop (14h 45m at Hanoi)',
    arrivalTime: '06:15 AM',
    duration: '21h 10m',
    price: 890,
    currency: 'THB'
  },
  {
    id: '3',
    airline: 'YokAirlines',
    logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/3/3d/Vietnam_Airlines_logo_2015.svg/1200px-Vietnam_Airlines_logo_2015.svg.png',
    flightNumber: 'YK303',
    departure: 'Bangkok (BKK)',
    arrival: 'New York (JFK)',
    departureTime: '10:20 AM',
    arrivalTime: '11:50 PM',
    duration: '21h 10m',
    stops: '1 stop (14h 45m at Hanoi)',
    price: 1200,
    currency: 'THB'
  }
];