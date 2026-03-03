import { getServerSession } from "@/services/auth.services";
import { userService } from "@/services/user.services";
import { flightService } from "@/services/flight.services";


export default async function Page() {
   // const { data } = await AircraftService.getAllAircraft();
    const session = await getServerSession();
    if(!session){
      throw new Error("Unauthorized");
      return <h1>Unauthorized</h1>
    }
    const data = await flightService.findAllPaginated(session, {})
  
    const bultify_json = JSON.stringify(data, null, 2);
  return <h1>{bultify_json}</h1>
}