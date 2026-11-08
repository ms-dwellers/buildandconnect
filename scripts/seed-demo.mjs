import { createHash, randomBytes } from "node:crypto";
import {
  lstat,
  mkdir,
  open,
  readFile,
  rename,
  unlink,
  writeFile,
} from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";
import { isDeepStrictEqual } from "node:util";
import {
  demoAccounts,
  demoCareerTarget,
  demoInterests,
  demoProjects,
  demoRequests,
  DEMO_NOTICE,
} from "./demo-data.ts";

const root = fileURLToPath(new URL("../", import.meta.url));
const directory = resolve(root, ".demo");
const statePath = resolve(directory, "state.json");

export function demoEnvironment(env) {
  if (!env.CONVEX_DEPLOYMENT?.startsWith("dev:") || env.CONVEX_DEPLOY_KEY)
    throw new Error(
      "Demo seeding only accepts a development deployment without a deploy key.",
    );
  const url = new URL(env.SITE_URL);
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash ||
    (!local &&
      !(url.protocol === "https:" && url.hostname.endsWith(".ts.net"))) ||
    !["http:", "https:"].includes(url.protocol)
  )
    throw new Error(
      "SITE_URL must be the local or private Tailscale development origin.",
    );
  return { origin: url.origin, deployment: env.CONVEX_DEPLOYMENT };
}

export function demoDraftId(key) {
  const bytes = createHash("sha256")
    .update(`build-and-connect-demo-v1/${key}`)
    .digest()
    .subarray(0, 16);
  bytes[6] = (bytes[6] & 15) | 80;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function demoDraft(details) {
  return {
    title: details.title,
    description: details.description,
    city: details.city,
    kind: details.kind,
    remote: details.remote,
    collaboration: details.collaboration,
    essentialTechnologies: details.essentialTechnologies.join(", "),
    interests: details.interests.join(", "),
    minimumWeeklyHours: String(details.minimumWeeklyHours),
    compensation: details.compensation ?? "",
    commitment: details.commitment ?? "",
    place: details.place ?? "",
    pin:
      details.latitude === undefined
        ? null
        : {
            latitude: details.latitude,
            longitude: details.longitude,
            place: details.place,
          },
  };
}

class DemoClient {
  constructor(origin) {
    this.origin = origin;
    this.cookies = new Map();
  }
  async request(path, method = "GET", body) {
    for (let attempt = 0; attempt < 3; attempt++) {
      const response = await fetch(`${this.origin}/api${path}`, {
        method,
        redirect: "error",
        signal: AbortSignal.timeout(90_000),
        headers: {
          "Content-Type": "application/json",
          Origin: this.origin,
          Cookie: [...this.cookies]
            .map(([key, value]) => `${key}=${value}`)
            .join("; "),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      for (const cookie of response.headers.getSetCookie()) {
        const pair = cookie.split(";", 1)[0];
        const at = pair.indexOf("=");
        this.cookies.set(pair.slice(0, at), pair.slice(at + 1));
      }
      if (response.status === 429 && attempt < 2) {
        const seconds = Number(response.headers.get("retry-after")) || 15;
        await response.body?.cancel();
        await delay(Math.min(60, Math.max(1, seconds)) * 1000);
        continue;
      }
      let data;
      try {
        data = await response.json();
      } catch {
        throw new Error(
          `${method} ${path} returned non-JSON (HTTP ${response.status}). Check that the development server is ready, then rerun to resume.`,
        );
      }
      return {
        status: response.status,
        ok: response.ok,
        data,
      };
    }
  }
  async call(path, method = "GET", body) {
    const response = await this.request(path, method, body);
    if (!response.ok)
      throw new Error(
        `${method} ${path} returned HTTP ${response.status}. Rerun the seed to resume.`,
      );
    return response.data;
  }
  async list(path) {
    const items = [],
      seen = new Set();
    let cursor = "";
    do {
      if (seen.has(cursor)) throw new Error("Pagination did not advance.");
      seen.add(cursor);
      const page = await this.call(
        `${path}?limit=100&after=${encodeURIComponent(cursor)}`,
      );
      items.push(...page.data);
      cursor = page.nextCursor;
    } while (cursor);
    return items;
  }
}

async function saveState(state) {
  const temporary = `${statePath}.${randomBytes(6).toString("hex")}.tmp`;
  await writeFile(temporary, JSON.stringify(state, null, 2) + "\n", {
    mode: 0o600,
    flag: "wx",
  });
  await rename(temporary, statePath);
}

export async function main(env = process.env) {
  const target = demoEnvironment(env);
  const ignored = spawnSync(
    "git",
    ["check-ignore", "--quiet", "--no-index", ".demo/state.json"],
    { cwd: root },
  );
  if (ignored.status !== 0)
    throw new Error("Ignore .demo/ before creating local demo credentials.");
  await mkdir(directory, { recursive: true, mode: 0o700 });
  if (
    !(await lstat(directory)).isDirectory() ||
    (await lstat(directory)).isSymbolicLink()
  )
    throw new Error("Use a real local .demo directory, not a symlink.");
  const lockPath = resolve(directory, "seed.lock");
  const lock = await open(lockPath, "wx", 0o600).catch(() => {
    throw new Error(
      "A seed lock already exists. Check whether another seed is running.",
    );
  });
  const clients = new Map();
  try {
    let state;
    try {
      const info = await lstat(statePath);
      if (
        !info.isFile() ||
        info.isSymbolicLink() ||
        (process.platform !== "win32" && info.mode & 0o077)
      )
        throw new Error(
          "Demo state must be a private regular file (mode 600).",
        );
      state = JSON.parse(await readFile(statePath, "utf8"));
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
      state = {
        version: 1,
        ...target,
        accounts: {},
        projects: {},
        requests: {},
        done: [],
      };
    }
    if (
      state.version !== 1 ||
      state.origin !== target.origin ||
      state.deployment !== target.deployment
    )
      throw new Error(
        "Demo state belongs to a different target. Do not reuse it across deployments.",
      );

    for (const account of demoAccounts) {
      const stored = (state.accounts[account.key] ??= {
        name: account.name,
        role: account.role,
        email: `${account.key}@demo.example.test`,
        password: randomBytes(24).toString("base64url"),
      });
      await saveState(state);
      const client = new DemoClient(target.origin);
      clients.set(account.key, client);
      const auth = { email: stored.email, password: stored.password };
      if (stored.id) await client.call("/auth/sign-in/email", "POST", auth);
      else {
        const created = await client.request("/auth/sign-up/email", "POST", {
          ...auth,
          name: account.name,
        });
        if (!created.ok) await client.call("/auth/sign-in/email", "POST", auth);
      }
      let me = await client.call("/me");
      if (!me.role) {
        await client.call("/me/role", "PUT", { role: account.role });
        me = await client.call("/me");
      }
      if (me.role !== account.role)
        throw new Error(
          "A demo account has a different role. Existing roles were not changed.",
        );
      stored.id = me.user.id;
      await saveState(state);
      if (account.role === "developer") {
        const existing = await client.request("/developers/me");
        if (existing.status === 404)
          await client.call("/developers/me", "PUT", account.profile);
        else if (!existing.ok)
          throw new Error("Could not read a demo profile.");
        const current = await client.call("/developers/me");
        if (!current.location)
          await client.call("/developers/me/location", "PATCH", {
            latitude: 51.0447,
            longitude: -114.0719,
            radiusKm: 25,
          });
      }
      console.log(`Ready: ${account.name}`);
    }

    for (const item of demoProjects) {
      const client = clients.get(item.owner);
      const id = demoDraftId(`project/${item.key}`);
      let response = await client.request(`/project-drafts/${id}`);
      if (response.status === 404)
        response = {
          ok: true,
          data: await client.call("/project-drafts", "POST", {
            id,
            content: demoDraft(item.details),
          }),
        };
      if (!response.ok) throw new Error(`Could not read draft ${item.key}.`);
      const draft = response.data;
      if (draft.publishedOpportunityId)
        state.projects[item.key] = draft.publishedOpportunityId;
      else {
        if (!isDeepStrictEqual(draft.content, demoDraft(item.details)))
          throw new Error(
            `Draft ${item.key} was edited; it was not published or overwritten.`,
          );
        const published = await client.call(
          `/project-drafts/${id}/publish`,
          "POST",
          { expectedUpdatedAt: draft.updatedAt },
        );
        state.projects[item.key] = published.id;
      }
      await saveState(state);
      console.log(`Project: ${item.details.title}`);
    }

    for (const item of demoRequests) {
      const client = clients.get(item.owner);
      const existing = (await client.list("/requests")).find(
        (row) => row.title === item.details.title,
      );
      if (existing && !existing.description.startsWith(DEMO_NOTICE))
        throw new Error(
          "A request title is already in use; no data was overwritten.",
        );
      const row =
        existing ?? (await client.call("/requests", "POST", item.details));
      state.requests[item.key] = row.id;
      await saveState(state);
      console.log(`Request: ${item.details.title}`);
    }

    const extra = demoDraftId("private-draft");
    const draft = await clients.get("maya").request(`/project-drafts/${extra}`);
    if (draft.status === 404)
      await clients.get("maya").call("/project-drafts", "POST", {
        id: extra,
        content: {
          ...demoDraft(demoProjects[0].details),
          title: "A welcome page for new volunteers",
          description: `${DEMO_NOTICE}\n\nAn unfinished idea for a simple volunteer welcome page.`,
          pin: null,
          place: "",
        },
      });
    else if (!draft.ok)
      throw new Error("Could not read the private demo draft.");
    state.draftId = extra;

    for (const interest of demoInterests) {
      const item = demoProjects.find(
        (project) => project.key === interest.project,
      );
      const id = state.projects[interest.project];
      for (const side of ["requester", "developer"]) {
        const wanted =
          side === "requester" ? interest.requester : interest.interested;
        const key = `${interest.project}/${interest.developer}/${side}`;
        if (!wanted || state.done.includes(key)) continue;
        await clients
          .get(side === "requester" ? item.owner : interest.developer)
          .call(`/opportunities/${id}/interest`, "PUT", {
            interested: true,
            ...(side === "requester"
              ? { developerId: state.accounts[interest.developer].id }
              : {}),
          });
        state.done.push(key);
        await saveState(state);
      }
    }
    if (!state.done.includes("accept-compost")) {
      const request = await clients
        .get("jordan")
        .call(`/requests/${state.requests.compost}`);
      if (request.status === "open")
        await clients
          .get("theo")
          .call(`/requests/${state.requests.compost}/accept`, "POST", {});
      state.done.push("accept-compost");
      await saveState(state);
    }
    const avery = clients.get("avery");
    if (!(await avery.call("/developers/me/career-target")))
      await avery.call("/developers/me/career-target", "PUT", {
        ...demoCareerTarget,
        expectedUpdatedAt: 0,
      });
    const recommendations = await avery.call(
      "/developers/me/career-projects?limit=100",
    );
    if (
      !recommendations.data.some(
        (item) =>
          item.id === state.projects["food-bank"] &&
          item.requirementLinks.length,
      )
    )
      throw new Error(
        "The main demo project is not linked to the target job; inspect analysis before presenting.",
      );
    const feed = await clients.get("maya").call("/map");
    console.log(
      `Seed complete: ${demoAccounts.length} accounts, ${demoProjects.length} projects, ${demoRequests.length} requests, 1 private draft, 1 career target.`,
    );
    console.log(
      `${feed.listings.length} map listings visible to the demo requester. Credentials and record IDs are in ignored .demo/state.json.`,
    );
  } finally {
    await Promise.all(
      [...clients.values()].map((client) =>
        client.request("/auth/sign-out", "POST", {}).catch(() => null),
      ),
    );
    await lock.close();
    await unlink(lockPath);
  }
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  main().catch((error) => {
    console.error(
      error instanceof Error
        ? error.message
        : "Demo seed failed. Existing data was retained.",
    );
    process.exitCode = 1;
  });
}
