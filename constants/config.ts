// Backend API configuration
export const API_BASE_URL = 'https://sammys-macbook-pro.tail2bbcb.ts.net';

export const API_ENDPOINTS = {
  chat: `${API_BASE_URL}/chat`,
  auth: {
    apple: `${API_BASE_URL}/auth/apple`,
  },
  user: {
    profile: `${API_BASE_URL}/user/profile`,
  },
} as const;
