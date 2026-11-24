import { z } from "zod";

export const updateProfileSchema = z.object({
  name: z.string().min(2, "Ном бояд ҳадди ақал 2 ҳарф бошад").max(50),
});

export const changePasswordSchema = z.object({
  oldPassword: z.string().min(1, "Пароли ҷорӣ лозим аст"),
  newPassword: z.string().min(6, "Пароли нав бояд ҳадди ақал 6 рамз бошад").max(100),
});
