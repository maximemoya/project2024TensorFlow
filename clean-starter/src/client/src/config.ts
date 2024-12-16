export const config = {
  API_URL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_FILE_TYPES: ['image/jpeg', 'image/png', 'image/gif'],
};
