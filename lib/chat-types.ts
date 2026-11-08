import type { FunctionReturnType } from "convex/server";
import type { api } from "../convex/_generated/api";

export type ChatSnapshot = FunctionReturnType<typeof api.chat.watch>;
export type Conversation = NonNullable<ChatSnapshot["conversation"]>;
export type ChatMessage = Conversation["messages"][number];
export type ChatHistory = Pick<Conversation, "messages" | "hasMore">;
