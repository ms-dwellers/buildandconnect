import { z } from "zod";

export const chatStartSchema = z
  .object({
    opportunityId: z.string().min(1).max(200),
    developerId: z.string().min(1).max(100).optional(),
  })
  .strict();

export const chatMessageSchema = z
  .object({
    clientId: z.uuid(),
    body: z.string().trim().min(1, "Write a message").max(4000),
  })
  .strict();

export const chatReadSchema = z
  .object({
    sequence: z.number().int().nonnegative(),
  })
  .strict();
