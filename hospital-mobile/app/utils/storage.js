import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';


const WEB_SESSION_KEYS = new Set(['token', 'user', 'patient']);

function useWebSessionStorage(key) {
    return (
        Platform.OS === 'web' &&
        typeof sessionStorage !== 'undefined' &&
        WEB_SESSION_KEYS.has(key)
    );
}

export default {
    async getItem(key) {
        if (useWebSessionStorage(key)) {
            try {
                return sessionStorage.getItem(key);
            } catch {
                return null;
            }
        }
        return AsyncStorage.getItem(key);
    },

    async setItem(key, value) {
        if (useWebSessionStorage(key)) {
            try {
                if (value == null) sessionStorage.removeItem(key);
                else sessionStorage.setItem(key, String(value));
            } catch {
            }
            return;
        }
        return AsyncStorage.setItem(key, value);
    },

    async removeItem(key) {
        if (useWebSessionStorage(key)) {
            try {
                sessionStorage.removeItem(key);
            } catch {
            }
            return;
        }
        return AsyncStorage.removeItem(key);
    },
};
