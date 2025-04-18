const isDevelopment = process.env.NODE_ENV === 'development';

export const API_URL = isDevelopment 
  ? 'http://localhost:3001/api' 
  : '/api';

export default {
  API_URL
}; 