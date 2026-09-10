/**
 * Storefront API layer.
 * Components import services from here — never from mock data directly —
 * so connecting the Node.js backend only requires NEXT_PUBLIC_API_BASE_URL.
 */
export * from "./services/catalog";
export * from "./services/commerce";
export * from "./services/customer";
export * from "./services/content";
export { ApiError, isApiError, toUserMessage } from "./errors";
export { USE_MOCK_API } from "./config";
