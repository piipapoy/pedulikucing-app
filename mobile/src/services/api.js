import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ⚠️ PENTING: GANTI 192.168.x.x DENGAN IP LAPTOP KAMU (Cek pakai 'ipconfig')
// Jangan pakai localhost!
const API_URL = 'http://192.168.1.8:3000/api'; 

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor: Otomatis tempel Token kalau user sudah login
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('userToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default api;