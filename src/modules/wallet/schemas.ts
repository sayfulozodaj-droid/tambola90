import { z } from "zod";

export const depositSchema = z.object({
  amount: z.coerce
    .number()
    .min(1, "Маблаг бояд ҳадди ақал 1 бошад")
    .max(100000, "Маблаги аз ҳад калон"),
});
