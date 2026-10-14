import { describe, expect, it } from "vitest";
import { canManageClassContent, displayName, initials, isAdmin, isActiveMember } from "../roles";
import type { Profile } from "@/types/domain";

function makeProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: "user-1",
    class_id: "class-1",
    full_name: "Budi Santoso",
    role: "student",
    is_active: true,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("isAdmin", () => {
  it("returns false for a null profile", () => {
    expect(isAdmin(null)).toBe(false);
  });

  it("returns false for a student", () => {
    expect(isAdmin(makeProfile({ role: "student" }))).toBe(false);
  });

  it("returns true only for an ACTIVE admin", () => {
    expect(isAdmin(makeProfile({ role: "admin", is_active: true }))).toBe(true);
  });

  it("returns false for a deactivated admin — a disabled account must not keep admin powers", () => {
    expect(isAdmin(makeProfile({ role: "admin", is_active: false }))).toBe(false);
  });
});

describe("isActiveMember", () => {
  it("returns false when profile is missing or inactive", () => {
    expect(isActiveMember(null)).toBe(false);
    expect(isActiveMember(makeProfile({ is_active: false }))).toBe(false);
  });

  it("returns true for any active profile, student or admin", () => {
    expect(isActiveMember(makeProfile({ role: "student", is_active: true }))).toBe(true);
    expect(isActiveMember(makeProfile({ role: "admin", is_active: true }))).toBe(true);
  });
});

describe("canManageClassContent", () => {
  it("denies a student even within their own class", () => {
    expect(canManageClassContent(makeProfile({ role: "student" }), "class-1")).toBe(false);
  });

  it("denies an admin acting on a DIFFERENT class than their own", () => {
    expect(canManageClassContent(makeProfile({ role: "admin", class_id: "class-1" }), "class-2")).toBe(false);
  });

  it("allows an active admin acting within their own class", () => {
    expect(canManageClassContent(makeProfile({ role: "admin", class_id: "class-1" }), "class-1")).toBe(true);
  });
});

describe("displayName / initials", () => {
  it("falls back to a generic label when there is no profile", () => {
    expect(displayName(null)).toBe("Pengguna");
  });

  it("builds initials from first and last name", () => {
    expect(initials("Budi Santoso")).toBe("BS");
  });

  it("handles a single-word name", () => {
    expect(initials("Budi")).toBe("B");
  });
});
