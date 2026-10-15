export const API_CONFIG = {
  baseUrl: 'http://localhost:3000/api',
  endpoints: {
    auth: 'http://localhost:3000/api/auth',
    words: 'http://localhost:3000/api/words',
    sketches: 'http://localhost:3000/api/sketches',
    stats: 'http://localhost:3000/api/stats',
  },
} as const;