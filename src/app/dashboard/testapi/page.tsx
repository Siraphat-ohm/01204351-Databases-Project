import { FlightService } from "@/lib/services/backoffice/flight"


export default async function Page() {
    const { data } = await FlightService.getAllFlights({ page: 1, limit: 5 });
    const bultify_json = JSON.stringify(data, null, 2);
  return <h1>{bultify_json}</h1>
}