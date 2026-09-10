import type { ApiErrorShape } from "@/types/common";

export type ApiErrorCode = ApiErrorShape["code"];

const friendlyMessages: Record<ApiErrorCode, string> = {
  network_error: "We couldn't connect. Please check your internet connection and try again.",
  not_found: "We couldn't find what you were looking for.",
  unauthorized: "Please sign in to continue.",
  session_expired: "Your session has expired. Please sign in again.",
  validation_error: "Please review the highlighted fields.",
  out_of_stock: "This piece is currently unavailable.",
  coupon_invalid: "This coupon code isn't valid for your order.",
  payment_failed: "Your payment couldn't be completed. Please try again or choose another method.",
  rate_limited: "Too many attempts. Please wait a moment and try again.",
  server_error: "Something went wrong on our side. Please try again shortly.",
};

/** Customer-safe error. Raw technical details are never shown to users. */
export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status?: number;
  readonly fieldErrors?: Record<string, string>;

  constructor(shape: ApiErrorShape, status?: number) {
    super(shape.message || friendlyMessages[shape.code]);
    this.name = "ApiError";
    this.code = shape.code;
    this.status = status;
    this.fieldErrors = shape.fieldErrors;
  }
}

export function apiError(code: ApiErrorCode, message = "", fieldErrors?: Record<string, string>) {
  return new ApiError({ code, message, fieldErrors });
}

export function statusToCode(status: number): ApiErrorCode {
  if (status === 401) return "unauthorized";
  if (status === 403) return "unauthorized";
  if (status === 404) return "not_found";
  if (status === 409) return "out_of_stock";
  if (status === 419 || status === 440) return "session_expired";
  if (status === 422 || status === 400) return "validation_error";
  if (status === 429) return "rate_limited";
  return "server_error";
}

export function toUserMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message || friendlyMessages[error.code];
  return friendlyMessages.server_error;
}

export function isApiError(error: unknown, code?: ApiErrorCode): error is ApiError {
  return error instanceof ApiError && (code === undefined || error.code === code);
}
