import jwt from "jsonwebtoken";
import env from "../config/env";

export interface TokenPayload {
  id: string;
  role: string;
}

export const signToken = (payload: TokenPayload): string =>
  jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpiresIn } as jwt.SignOptions);

export const verifyToken = (token: string): TokenPayload => {
  const decoded = jwt.verify(token, env.jwtSecret);
  return decoded as TokenPayload;
};
