import type {
  Address,
  AddressInput,
  AuthSession,
  Customer,
  Enquiry,
  EnquiryInput,
  LoginInput,
  OtpRequestInput,
  OtpVerifyInput,
  RegisterInput,
} from "@/types/customer";
import { MOCK_LATENCY, runMock, USE_MOCK_API } from "../config";
import { apiRequest } from "../http";

const mock = () => import("@/mocks/handlers/account");

/* ------------------------------------------------------------------ */
/* Authentication                                                      */
/* ------------------------------------------------------------------ */

export async function login(input: LoginInput): Promise<AuthSession> {
  if (USE_MOCK_API) {
    const m = await mock();
    return runMock(() => m.login(input), MOCK_LATENCY.slow);
  }
  return apiRequest("/auth/login", { method: "POST", body: input });
}

export async function register(input: RegisterInput): Promise<AuthSession> {
  if (USE_MOCK_API) {
    const m = await mock();
    return runMock(() => m.register(input), MOCK_LATENCY.slow);
  }
  return apiRequest("/auth/register", { method: "POST", body: input });
}

export async function requestOtp(input: OtpRequestInput): Promise<{ sent: boolean; expiresInSeconds: number; demoCode?: string }> {
  if (USE_MOCK_API) {
    const m = await mock();
    return runMock(() => m.requestOtp(input));
  }
  return apiRequest("/auth/otp/request", { method: "POST", body: input });
}

export async function verifyOtp(input: OtpVerifyInput): Promise<AuthSession> {
  if (USE_MOCK_API) {
    const m = await mock();
    return runMock(() => m.verifyOtp(input), MOCK_LATENCY.slow);
  }
  return apiRequest("/auth/otp/verify", { method: "POST", body: input });
}

/** Staff sign in on the same page: returns the admin profile when the signed-in account has admin access. */
export async function getStaffProfile(token: string): Promise<{ email: string; name: string } | null> {
  if (USE_MOCK_API) return null;
  try {
    const { admin } = await apiRequest<{ admin: { email: string; name: string } }>("/admin/auth/me", { token });
    return admin;
  } catch {
    return null;
  }
}

export async function requestPasswordReset(email: string): Promise<{ ok: boolean }> {
  if (USE_MOCK_API) {
    const m = await mock();
    return runMock(() => m.requestPasswordReset(email), MOCK_LATENCY.slow);
  }
  return apiRequest("/auth/password/forgot", { method: "POST", body: { email } });
}

export async function logout(token?: string | null): Promise<void> {
  if (USE_MOCK_API || !token) return;
  await apiRequest("/auth/logout", { method: "POST", token });
}

/* ------------------------------------------------------------------ */
/* Profile & addresses                                                 */
/* ------------------------------------------------------------------ */

export async function getCustomerProfile(token: string): Promise<Customer> {
  if (USE_MOCK_API) {
    const m = await mock();
    return runMock(() => m.getProfile(token));
  }
  return apiRequest("/me", { token });
}

export async function updateCustomerProfile(
  token: string,
  patch: Partial<Pick<Customer, "firstName" | "lastName" | "phone" | "marketingOptIn">>,
): Promise<Customer> {
  if (USE_MOCK_API) {
    const m = await mock();
    return runMock(() => m.updateProfile(token, patch));
  }
  return apiRequest("/me", { method: "PATCH", body: patch, token });
}

export async function changePassword(token: string, currentPassword: string, newPassword: string): Promise<{ ok: boolean }> {
  if (USE_MOCK_API) {
    const m = await mock();
    return runMock(() => m.changePassword(token, currentPassword, newPassword));
  }
  return apiRequest("/me/password", { method: "POST", body: { currentPassword, newPassword }, token });
}

export async function getAddresses(token: string): Promise<Address[]> {
  if (USE_MOCK_API) {
    const m = await mock();
    return runMock(() => m.listAddresses(token));
  }
  return apiRequest("/me/addresses", { token });
}

export async function saveAddress(token: string, address: AddressInput & { id?: string }): Promise<Address[]> {
  if (USE_MOCK_API) {
    const m = await mock();
    return runMock(() => m.saveAddress(token, address));
  }
  return address.id
    ? apiRequest(`/me/addresses/${encodeURIComponent(address.id)}`, { method: "PUT", body: address, token })
    : apiRequest("/me/addresses", { method: "POST", body: address, token });
}

export async function deleteAddress(token: string, id: string): Promise<Address[]> {
  if (USE_MOCK_API) {
    const m = await mock();
    return runMock(() => m.deleteAddress(token, id));
  }
  return apiRequest(`/me/addresses/${encodeURIComponent(id)}`, { method: "DELETE", token });
}

/* ------------------------------------------------------------------ */
/* Enquiries & leads                                                   */
/* ------------------------------------------------------------------ */

export async function submitEnquiry(input: EnquiryInput, token?: string | null): Promise<Enquiry> {
  if (USE_MOCK_API) {
    const m = await mock();
    return runMock(() => m.submitEnquiry(input, token), MOCK_LATENCY.slow);
  }
  return apiRequest("/enquiries", { method: "POST", body: input, token });
}

export async function getEnquiries(token: string): Promise<Enquiry[]> {
  if (USE_MOCK_API) {
    const m = await mock();
    return runMock(() => m.listEnquiries(token));
  }
  return apiRequest("/me/enquiries", { token });
}

export async function subscribeNewsletter(email: string): Promise<{ ok: boolean; alreadySubscribed: boolean }> {
  if (USE_MOCK_API) {
    const m = await mock();
    return runMock(() => m.subscribeNewsletter(email));
  }
  return apiRequest("/newsletter", { method: "POST", body: { email } });
}
