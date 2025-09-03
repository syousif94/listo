// Backend API configuration
// export const API_BASE_URL =
//   process.env.NODE_ENV === 'development'
//     ? 'https://sammys-macbook-pro.tail2bbcb.ts.net'
//     : 'https://ubuntu-server.tail2bbcb.ts.net';

export const API_BASE_URL = 'https://ubuntu-server.tail2bbcb.ts.net';

export const API_ENDPOINTS = {
  chat: `${API_BASE_URL}/chat`,
  auth: {
    apple: `${API_BASE_URL}/auth/apple`,
  },
  user: {
    profile: `${API_BASE_URL}/user/profile`,
    deviceToken: `${API_BASE_URL}/user/device-token`,
    devices: `${API_BASE_URL}/user/devices`,
  },
} as const;
