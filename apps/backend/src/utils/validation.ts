import { z } from 'zod';

export const createRoomSchema = z.object({
  userId: z.string().min(1),
  bestOf: z.number().min(1).max(7).default(3)
});

export const joinRoomSchema = z.object({
  inviteCode: z.string().length(6),
  userId: z.string().min(1)
});

export const createUserSchema = z.object({
  handle: z.string().min(3).max(20)
});

export type CreateRoomInput = z.infer<typeof createRoomSchema>;
export type JoinRoomInput = z.infer<typeof joinRoomSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;