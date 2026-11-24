import { Role } from "@prisma/client";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        phone: string;
        name: string;
        role: Role;
        balance: number;
        freeTickets: number;
        isBlocked: boolean;
      };
    }
  }
}

export {};
