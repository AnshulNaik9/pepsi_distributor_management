import AsyncStorage from '@react-native-async-storage/async-storage';

export type Role = 'admin' | 'driver';

interface User {
  username: string;
  role: Role;
}

const USERS: Record<string, { password: string; role: Role }> = {
  admin: { password: '1968', role: 'admin' },
  seller: { password: '1122', role: 'driver' },
};

const AUTH_KEY = 'app_auth';
const TRUCK_KEY = 'driver_truck_id';
const ROUTE_KEY = 'driver_route_id';

export async function login(username: string, password: string): Promise<User | null> {
  console.log('[DEBUG] auth.ts/login', { username });
  const entry = USERS[username.toLowerCase().trim()];
  if (!entry || entry.password !== password) {
    console.log('[DEBUG] auth.ts/login: credentials mismatch');
    return null;
  }
  const user: User = { username, role: entry.role };
  console.log('[DEBUG] auth.ts/login: saving to AsyncStorage');
  await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(user));
  console.log('[DEBUG] auth.ts/login: success');
  return user;
}

export async function logout(): Promise<void> {
  await AsyncStorage.multiRemove([AUTH_KEY, TRUCK_KEY, ROUTE_KEY]);
}

export async function getUser(): Promise<User | null> {
  try {
    const raw = await AsyncStorage.getItem(AUTH_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function getRole(): Promise<Role | null> {
  const user = await getUser();
  return user?.role ?? null;
}

export async function setDriverTruckId(id: string): Promise<void> {
  await AsyncStorage.setItem(TRUCK_KEY, id);
}

export async function getDriverTruckId(): Promise<string | null> {
  return AsyncStorage.getItem(TRUCK_KEY);
}

export async function setDriverRouteId(id: string): Promise<void> {
  await AsyncStorage.setItem(ROUTE_KEY, id);
}

export async function getDriverRouteId(): Promise<string | null> {
  return AsyncStorage.getItem(ROUTE_KEY);
}
