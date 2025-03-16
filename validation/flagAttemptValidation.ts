import { z } from "zod";

export const addCommentSchema = z.object({
  comment: z.string().min(1, "Le commentaire ne peut pas être vide"),
});

export type AddCommentInput = z.infer<typeof addCommentSchema>;
