import { OptionsFilter, ComboboxItem } from '@mantine/core';
import airportsData from './airports.json';

// Define a custom type to help TypeScript understand our extra fields
export interface AirportItem extends ComboboxItem {
  city: string;
  iata: string;
  airportName: string;
}

export const airportOptions: AirportItem[] = airportsData.map((ap) => ({
  value: ap.iataCode, 
  label: `${ap.city} (${ap.iataCode})`, 
  city: ap.city.toLowerCase(),
  iata: ap.iataCode.toLowerCase(),
  airportName: ap.name.toLowerCase(),
}));

export const airportFilter: OptionsFilter = ({ options, search }) => {
  const splittedSearch = search.toLowerCase().trim();
  // Cast options to AirportItem[] so we can access our custom properties
  return (options as AirportItem[]).filter((option) => 
    option.city.includes(splittedSearch) || 
    option.iata.includes(splittedSearch) ||
    option.airportName.includes(splittedSearch)
  );
};