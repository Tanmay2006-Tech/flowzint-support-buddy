import { handleChat } from "./lib/chat";
import { nodeHandler } from "./lib/http";

export default nodeHandler(handleChat);
