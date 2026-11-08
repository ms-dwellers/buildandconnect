import { execFileSync } from "node:child_process";
import { appendFileSync, chmodSync, readFileSync } from "node:fs";
import { interviewAgentConfig } from "../backend/hiring/interview-agent.ts";

if (!process.env.ELEVENLABS_API_KEY)
  throw new Error("Set ELEVENLABS_API_KEY in .env.local first.");
if (process.env.ELEVENLABS_AGENT_ID)
  throw new Error("A voice agent is already configured. No agent was created.");

execFileSync("git", ["check-ignore", "--quiet", ".env.local"]);
const local = readFileSync(".env.local", "utf8");
if (/^ELEVENLABS_AGENT_ID=\s*\S/m.test(local))
  throw new Error("A voice agent is already configured in .env.local.");
chmodSync(".env.local", 0o600);

const response = await fetch(
  "https://api.elevenlabs.io/v1/convai/agents/create",
  {
    method: "POST",
    headers: {
      "xi-api-key": process.env.ELEVENLABS_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(interviewAgentConfig),
    signal: AbortSignal.timeout(30_000),
  },
);
if (!response.ok)
  throw new Error(
    `ElevenLabs agent creation failed (HTTP ${response.status}). No local configuration was changed.`,
  );
const data = await response.json();
if (!/^agent_[a-zA-Z0-9]+$/.test(data.agent_id))
  throw new Error(
    "ElevenLabs returned an invalid agent ID. Check the dashboard before retrying.",
  );
appendFileSync(".env.local", `\nELEVENLABS_AGENT_ID=${data.agent_id}\n`, {
  mode: 0o600,
});
console.log(
  "Created a private interview agent and configured .env.local. Restart the development server.",
);
