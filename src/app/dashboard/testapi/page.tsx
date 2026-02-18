import { FlightService } from "@/lib/services/backoffice/flight"
import { AircraftService } from "@/lib/services/backoffice/aircraft";

export default async function Page() {
   // const { data } = await AircraftService.getAllAircraft();
    const { data: flights } = await FlightService.getAllFlights({ page: 1, limit: 10 });
  
    const bultify_json = JSON.stringify(flights, null, 2);
  return <h1>{bultify_json}</h1>
}