import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Default fallback (Production)
const DEFAULT_API_URL = 'https://optimal-manager.vercel.app/api';
// const DEFAULT_API_URL = 'http://192.168.100.26:3000/api'; // Local fallback
const API_URL_KEY = 'api_base_url';

const api = axios.create({
  baseURL: DEFAULT_API_URL,
  headers: {
    'Content-Type': 'application/json',
  }
});

export const getApiUrl = async () => {
  try {
    const url = await AsyncStorage.getItem(API_URL_KEY);
    return url || DEFAULT_API_URL;
  } catch (error) {
    return DEFAULT_API_URL;
  }
};

export const updateApiUrl = async (url) => {
  try {
    // Basic validation/normalization
    let finalUrl = url.trim();
    
    // Ensure protocol is present
    if (!/^https?:\/\//i.test(finalUrl)) {
        // If it looks like an IP address or localhost, default to http
        // IPv4 regex (simple) or localhost
        if (/^(\d{1,3}\.){3}\d{1,3}/.test(finalUrl) || finalUrl.startsWith('localhost')) {
             finalUrl = 'http://' + finalUrl;
        } else {
             finalUrl = 'https://' + finalUrl;
        }
    }

    // Remove trailing slash
    if (finalUrl.endsWith('/')) {
        finalUrl = finalUrl.slice(0, -1);
    }
    
    await AsyncStorage.setItem(API_URL_KEY, finalUrl);
    api.defaults.baseURL = finalUrl;
    return true;
  } catch (error) {
    console.error('Failed to save API URL:', error);
    return false;
  }
};

export const testApiConnection = async (url) => {
    try {
        // Create a temporary instance to test without affecting the global one yet
        // We'll try to hit a harmless endpoint. Since we don't know a guaranteed public one,
        // we might just try the base URL.
        // If the user provided '.../api', hitting that might 404 or 401, but that means network is OK.
        // Network Error is what we want to catch.
        const testInstance = axios.create({ baseURL: url, timeout: 5000 });
        await testInstance.get('/'); // Just ping the root of the API
        return { success: true };
    } catch (error) {
        if (error.response) {
            // Server responded (even with 404 or 401), so connection is successful
            return { success: true };
        }
        return { success: false, error: error.message };
    }
};

export const initApi = async () => {
  const url = await getApiUrl();
  api.defaults.baseURL = url;
  return url;
};

export const setAuthToken = (token) => {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
};

// Add a request interceptor
api.interceptors.request.use(
  async (config) => {
    console.log(`API Request: ${config.method.toUpperCase()} ${config.baseURL}${config.url}`, config.data ? JSON.stringify(config.data) : '');
    const token = await AsyncStorage.getItem('userToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor to log errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response ? error.response.data : error.message);
    return Promise.reject(error);
  }
);

export default api;
