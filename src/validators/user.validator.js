import { z } from "zod";

export const createUserSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).max(100),

    username: z
      .string()
      .trim()
      .min(3)
      .max(50)
      .regex(
        /^[a-zA-Z0-9._-]+$/,
        "Username can contain letters, numbers, dot, underscore and hyphen only"
      ),

    email: z
      .string()
      .email("Invalid email")
      .optional()
      .or(z.literal("")),

    password: z
      .string()
      .min(8, "Password must be at least 8 characters"),
  }),
});

export const updateUserSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).max(100).optional(),

    email: z
      .string()
      .email("Invalid email")
      .optional()
      .or(z.literal("")),
  }),
});

export const updateStatusSchema = z.object({
  body: z.object({
    isActive: z.boolean(),
  }),
});

export const resetPasswordSchema = z.object({
  body: z.object({
    password: z
      .string()
      .min(8, "Password must be at least 8 characters"),
  }),
});