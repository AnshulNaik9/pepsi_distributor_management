import { Platform } from 'react-native';

let CURRENT_API_URL = 'http://192.168.1.2:8082';

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

    const contentType = res.headers.get('content-type');
    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText);
      console.error(`[API] Error ${res.status}: ${text}`);
      throw new Error(`${res.status}: ${text}`);
    }
    
    if (res.status === 204) return null;
    
    if (contentType && !contentType.includes('application/json')) {
      const text = await res.text();
      console.error(`[API] Expected JSON but received ${contentType}. Content:`, text.substring(0, 100));
      throw new Error('Server returned an invalid response (HTML instead of JSON). Is the backend running?');
    }

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
