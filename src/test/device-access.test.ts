import { beforeEach, describe, expect, it } from "vitest";
import { getDeviceToken, forgetDeviceToken } from "@/lib/device-access";

describe("Private device access", () => {
  beforeEach(() => localStorage.clear());
  it("creates a random token and reuses it", () => {
    const token = getDeviceToken();
    expect(token).toMatch(/^[a-f0-9]{64}$/);
    expect(getDeviceToken()).toBe(token);
  });
  it("replaces invalid tokens and forgets the device", () => {
    localStorage.setItem("mon-compte-device-access", "invalid");
    const token = getDeviceToken();
    expect(token).not.toBe("invalid");
    forgetDeviceToken();
    expect(getDeviceToken()).not.toBe(token);
  });
});