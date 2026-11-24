import { Request, Response, NextFunction, RequestHandler } from "express";
import { AnyZodObject, ZodError } from "zod";
import { badRequest } from "./errors";

interface Schemas {
  body?: AnyZodObject;
  params?: AnyZodObject;
  query?: AnyZodObject;
}

/** Middleware барои валидатсияи Zod — body, params ва query */
export const validate =
  (schemas: Schemas): RequestHandler =>
  (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (schemas.body) {
        req.body = schemas.body.parse(req.body);
      }
      if (schemas.params) {
        req.params = schemas.params.parse(req.params);
      }
      if (schemas.query) {
        req.query = schemas.query.parse(req.query);
      }
      next();
    } catch (e) {
      if (e instanceof ZodError) {
        const first = e.errors[0];
        const msg = first ? `${first.path.join(".")}: ${first.message}` : "Маълумоти нодуруст";
        next(badRequest(msg));
      } else {
        next(e);
      }
    }
  };
