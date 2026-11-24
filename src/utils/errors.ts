export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

export const badRequest = (msg: string) => new ApiError(400, msg);
export const unauthorized = (msg = "Шумо вуруд накардаед") => new ApiError(401, msg);
export const forbidden = (msg = "Дастрасӣ манъ аст") => new ApiError(403, msg);
export const notFound = (msg = "Ёфт нашуд") => new ApiError(404, msg);
export const conflict = (msg: string) => new ApiError(409, msg);
