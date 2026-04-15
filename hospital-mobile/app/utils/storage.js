import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const webStorage = {
    async getItem(key) {
        try {
            if (typeof window !== 'undefined' && window.sessionStorage) {
                return window.sessionStorage.getItem(key);
            }
        } catch {
            // Fallback to AsyncStorage below.
        }
        return AsyncStorage.getItem(key);
    },
    async setItem(key, value) {
        try {
            if (typeof window !== 'undefined' && window.sessionStorage) {
                window.sessionStorage.setItem(key, value);
                return;
            }
        } catch {
            // Fallback to AsyncStorage below.
        }
        await AsyncStorage.setItem(key, value);
    },
    async removeItem(key) {
        try {
            if (typeof window !== 'undefined' && window.sessionStorage) {
                window.sessionStorage.removeItem(key);
                return;
            }
        } catch {
            // Fallback to AsyncStorage below.
        }
        await AsyncStorage.removeItem(key);
    }
};

const storage = Platform.OS === 'web' ? webStorage : AsyncStorage;

export default storage;
