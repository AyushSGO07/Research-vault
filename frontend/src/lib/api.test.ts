import { authApi } from "./api";

// Smoke test asserting api endpoints export expected methods
export function testApiStructure() {
  if (typeof authApi.login !== "function") throw new Error("Missing authApi.login");
  if (typeof authApi.register !== "function") throw new Error("Missing authApi.register");
  if (typeof authApi.getMe !== "function") throw new Error("Missing authApi.getMe");
  if (typeof authApi.healthCheck !== "function") throw new Error("Missing authApi.healthCheck");
  return true;
}

if (typeof window === "undefined") {
  testApiStructure();
}
