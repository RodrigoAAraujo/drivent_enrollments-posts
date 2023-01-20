import { ApplicationError } from "@/protocols";

export function badRequestError(message: string): ApplicationError {
  return {
    name: "BadRequestError",
    message,
  };
}