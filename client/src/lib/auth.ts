// Simple credential-based auth stored in localStorage
// Credentials: admin/admin123 (admin), driver/driver123 (driver)

export type Role = "admin" | "driver";

interface User {
  username: string;
  role: Role;
}

const USERS: Record<string, { password: string; role: Role }> = {
  admin: { password: "admin123", role: "admin" },
  driver: { password: "driver123", role: "driver" },
};

const AUTH_KEY = "app_auth";

export function login(username: string, password: string): User | null {
  const entry = USERS[username.toLowerCase().trim()];
  if (!entry || entry.password !== password) return null;
  const user: User = { username, role: entry.role };
  localStorage.setItem(AUTH_KEY, JSON.stringify(user));
  return user;
}

export function logout() {
  localStorage.removeItem(AUTH_KEY);
  localStorage.removeItem("driver_truck_id");
}

export function getUser(): User | null {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function getRole(): Role | null {
  return getUser()?.role ?? null;
}

export function isAdmin(): boolean {
  return getRole() === "admin";
}

export function isDriver(): boolean {
  const role = getRole();
  return role === "driver" || role === "admin";
}
