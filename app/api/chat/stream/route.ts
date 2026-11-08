import { env } from "cloudflare:workers";
import { streamChat } from "@/lib/chat-stream";

export const GET = (request: Request) => streamChat(request, env);
