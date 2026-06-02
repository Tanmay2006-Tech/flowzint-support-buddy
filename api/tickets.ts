import { handleTickets } from "./lib/tickets";
import { nodeHandler } from "./lib/http";

export default nodeHandler(handleTickets);
