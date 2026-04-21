import { Platform } from 'react-native';

let CURRENT_API_URL = Platform.OS === 'android' ? 'http://10.0.2.2:8082' : 'http://localhost:8082';

export const setApiUrl = (url: string) => { CURRENT_API_URL = url; };
export const getApiUrl = () => CURRENT_API_URL;

export async function apiRequest(method: string, url: string, data?: any) {
  const fullUrl = `${getApiUrl()}${url}`;
  const options: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (data) options.body = JSON.stringify(data);
  
  console.log(`[API] Fetching: ${method} ${fullUrl}`);
  
  try {
    const res = await fetch(fullUrl, options);
    console.log(`[API] Response: ${res.status} from ${url}`);

    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText);
      console.error(`[API] Error ${res.status}: ${text}`);
      throw new Error(`${res.status}: ${text}`);
    }
    if (res.status === 204) return null;
    const json = await res.json();
    console.log(`[API] Data: Received ${Array.isArray(json) ? json.length : '1'} item(s)`);
    return json;
  } catch (e: any) {
    console.error(`[API] Network/Logic Exception:`, e.name, e.message);
    throw e;
  }
}

export async function apiGet(url: string) {
  return apiRequest('GET', url);
}

export async function apiPost(url: string, data?: any) {
  return apiRequest('POST', url, data);
}

export async function apiPatch(url: string, data?: any) {
  return apiRequest('PATCH', url, data);
}

export async function apiDelete(url: string) {
  return apiRequest('DELETE', url);
}
