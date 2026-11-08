import { expect, test } from "vitest";
import { api as publicApi } from "../../convex/_generated/api";
import { chatMessageSchema } from "../../backend/chat";
import {
  actor,
  api,
  setup,
  job,
  profile,
  analysis,
  embedding,
  components,
} from "./harness";

async function connectedProject() {
  const t = setup();
  const requester = await actor(t, "requester");
  const developer = await actor(t, "developer");
  const stranger = await actor(t, "developer");
  await requester.client.mutation(api.data.createOpportunity, {
    id: "chat-project",
    details: job,
    analysis,
    embedding,
  });
  await developer.client.mutation(api.data.putDeveloper, {
    profile,
    embedding,
  });
  await requester.client.mutation(api.data.setInterest, {
    id: "chat-project",
    developerId: developer.id,
    interested: true,
  });
  await developer.client.mutation(api.data.setInterest, {
    id: "chat-project",
    interested: true,
  });
  const { id } = await requester.client.mutation(api.chat.start, {
    opportunityId: "chat-project",
    developerId: developer.id,
  });
  const viewer = (member: typeof developer) =>
    t.withIdentity({ subject: member.id, sessionId: member.sessionId });
  const send = (
    member = developer,
    body = "Can we discuss the timeline?",
    clientId = crypto.randomUUID(),
  ) =>
    member.client.mutation(api.chat.send, {
      conversationId: id,
      body,
      clientId,
    });
  const watch = (member = requester) =>
    viewer(member).query(publicApi.chat.watch, {
      conversationId: id,
      inboxLimit: 20,
    });
  return { t, requester, developer, stranger, id, send, watch, viewer };
}

test("chat requires mutual interest, belongs to a project, and creates one thread on retries", async () => {
  const { t, requester, developer, stranger, id } = await connectedProject();
  const otherRequester = await actor(t, "requester");
  await expect(
    otherRequester.client.mutation(api.chat.start, {
      opportunityId: "chat-project",
      developerId: developer.id,
    }),
  ).rejects.toThrow(/not found/);
  await expect(
    stranger.client.mutation(api.chat.start, {
      opportunityId: "chat-project",
      developerId: developer.id,
    }),
  ).rejects.toThrow(/not found/);
  const attempts = await Promise.all([
    requester.client.mutation(api.chat.start, {
      opportunityId: "chat-project",
      developerId: developer.id,
    }),
    developer.client.mutation(api.chat.start, {
      opportunityId: "chat-project",
    }),
  ]);
  expect(attempts.map((value) => value.id)).toEqual([id, id]);
  expect(
    await t.run((ctx) => ctx.db.query("conversations").collect()),
  ).toHaveLength(1);
  await requester.client.mutation(api.data.createOpportunity, {
    id: "another-project",
    details: job,
    analysis,
    embedding,
  });
  await expect(
    developer.client.mutation(api.chat.start, {
      opportunityId: "another-project",
    }),
  ).rejects.toThrow(/Both sides/);
  await requester.client.mutation(api.data.setInterest, {
    id: "another-project",
    developerId: developer.id,
    interested: true,
  });
  await expect(
    developer.client.mutation(api.chat.start, {
      opportunityId: "another-project",
    }),
  ).rejects.toThrow(/Both sides/);
  await developer.client.mutation(api.data.setInterest, {
    id: "another-project",
    interested: true,
  });
  expect(
    (
      await developer.client.mutation(api.chat.start, {
        opportunityId: "another-project",
      })
    ).id,
  ).not.toBe(id);
});

test("messages are ordered, trimmed, retry-safe and never trust a client-supplied sender", async () => {
  const { t, developer, id, send, watch } = await connectedProject();
  const clientId = crypto.randomUUID();
  const results = await Promise.all([
    send(developer, "  Hello  ", clientId),
    send(developer, "  Hello  ", clientId),
  ]);
  expect(results[0]).toMatchObject({
    senderId: developer.id,
    body: "Hello",
    sequence: 1,
  });
  expect(results[0].id).toBe(results[1].id);
  await expect(send(developer, "Changed", clientId)).rejects.toThrow(
    /different text/,
  );
  await expect(send(developer, "  ")).rejects.toThrow();
  await expect(send(developer, "x".repeat(4001))).rejects.toThrow();
  await expect(send(developer, "Hello", "invalid-id")).rejects.toThrow();
  expect((await watch()).conversation?.messages).toHaveLength(1);
  expect(await t.run((ctx) => ctx.db.query("messages").collect())).toHaveLength(
    1,
  );
  expect(
    chatMessageSchema.safeParse({ body: "Hello", clientId, senderId: "forged" })
      .success,
  ).toBe(false);
  await expect(
    t.mutation(api.chat.send, {
      conversationId: id,
      clientId: crypto.randomUUID(),
      body: "Forged",
    }),
  ).rejects.toThrow(/Sign in/);
});

test("only participants can subscribe, read history, send, or mark messages read", async () => {
  const { t, stranger, requester, developer, id, send, watch } =
    await connectedProject();
  await send();
  await expect(watch(stranger)).rejects.toThrow(/not found/);
  await expect(send(stranger)).rejects.toThrow(/not found/);
  await expect(
    stranger.client.query(api.chat.older, { conversationId: id, before: 2 }),
  ).rejects.toThrow(/not found/);
  await expect(
    stranger.client.mutation(api.chat.markRead, {
      conversationId: id,
      sequence: 1,
    }),
  ).rejects.toThrow(/not found/);
  await expect(
    t.query(publicApi.chat.watch, { inboxLimit: 20 }),
  ).rejects.toThrow(/Sign in/);
  await expect(
    t
      .withIdentity({ subject: stranger.id, sessionId: developer.sessionId })
      .query(publicApi.chat.watch, { inboxLimit: 20 }),
  ).rejects.toThrow(/Sign in/);
  expect((await watch(requester)).inbox[0].unread).toBe(1);
  expect((await watch(developer)).inbox[0].unread).toBe(0);
});

test("read receipts are monotonic and cannot acknowledge future messages", async () => {
  const { requester, developer, id, send, watch } = await connectedProject();
  await send();
  await requester.client.mutation(api.chat.markRead, {
    conversationId: id,
    sequence: 1,
  });
  await requester.client.mutation(api.chat.markRead, {
    conversationId: id,
    sequence: 0,
  });
  expect((await watch()).inbox[0].unread).toBe(0);
  expect((await watch(developer)).conversation?.peerReadSequence).toBe(1);
  await expect(
    requester.client.mutation(api.chat.markRead, {
      conversationId: id,
      sequence: 2,
    }),
  ).rejects.toThrow(/received/);
  await expect(
    requester.client.mutation(api.chat.markRead, {
      conversationId: id,
      sequence: -1,
    }),
  ).rejects.toThrow();
});

test("closing a project keeps chat, while withdrawing consent pauses both senders without deleting history", async () => {
  const { requester, developer, id, send, watch } = await connectedProject();
  const sent = await send();
  await requester.client.mutation(api.data.updateOpportunity, {
    id: "chat-project",
    status: "closed",
  });
  await send(requester, "Let's wrap up the project.");
  await developer.client.mutation(api.data.setInterest, {
    id: "chat-project",
    interested: false,
  });
  expect((await watch()).conversation).toMatchObject({ canSend: false });
  expect((await watch()).conversation?.messages).toHaveLength(2);
  await expect(send()).rejects.toThrow(/paused/);
  await expect(send(requester)).rejects.toThrow(/paused/);
  expect((await send(developer, sent.body, sent.clientId)).id).toBe(sent.id);
  expect(
    (
      await developer.client.mutation(api.chat.start, {
        opportunityId: "chat-project",
      })
    ).id,
  ).toBe(id);
});

test("revoking a session removes subscription and mutation access immediately", async () => {
  const { t, developer, send, watch } = await connectedProject();
  await send();
  await t.run((ctx) =>
    ctx.runMutation(components.betterAuth.adapter.deleteOne, {
      input: {
        model: "session",
        where: [{ field: "_id", value: developer.sessionId }],
      },
    }),
  );
  await expect(watch(developer)).rejects.toThrow(/Sign in/);
  await expect(send()).rejects.toThrow(/Sign in/);
});

test("history pages use stable sequences without gaps or duplicates", async () => {
  const { t, requester, developer, id, watch } = await connectedProject();
  await t.run(async (ctx) => {
    for (let sequence = 1; sequence <= 55; sequence++) {
      await ctx.db.insert("messages", {
        conversationId: id,
        sequence,
        senderId: developer.id,
        clientId: crypto.randomUUID(),
        body: `Message ${sequence}`,
        sentAt: Date.now(),
      });
    }
    await ctx.db.patch(id, { lastSequence: 55 });
  });
  const latest = (await watch()).conversation!;
  expect(latest.messages.map((value) => value.sequence)).toEqual(
    Array.from({ length: 50 }, (_, index) => index + 6),
  );
  expect(latest.hasMore).toBe(true);
  const earlier = await requester.client.query(api.chat.older, {
    conversationId: id,
    before: 6,
  });
  expect(earlier.messages.map((value) => value.sequence)).toEqual([
    1, 2, 3, 4, 5,
  ]);
  expect(earlier.hasMore).toBe(false);
});

test("per-sender message limits are enforced without charging identical retries", async () => {
  const { developer, send, watch } = await connectedProject();
  const first = await send();
  for (let index = 1; index < 30; index++)
    await send(developer, `Message ${index}`);
  expect((await send(developer, first.body, first.clientId)).id).toBe(first.id);
  await expect(send()).rejects.toThrow(/Too many messages/);
  expect((await watch()).conversation?.messages).toHaveLength(30);
});
