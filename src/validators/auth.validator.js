import { z } from "zod";

export const loginSchema = z.object({
  body: z.object({
    username: z
      .string()
      .trim()
      .min(3, "Username is required"),

    password: z
      .string()
      .min(8, "Password must be at least 8 characters"),
  }),
});