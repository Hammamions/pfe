import Constants from 'expo-constants';
import { Platform } from 'react-native';


export function getApiBaseUrl() {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
        const h = window.location.hostname || 'localhost';
        return `http://${h}:4000`;
    }

    const hostUri =
        Constants.expoConfig?.hostUri ||
        Constants.manifest2?.extra?.expoGo?.debuggerHost ||
        '';
    const host = String(hostUri).split(':')[0];

    if (host) return `http://${host}:4000`;
    if (Platform.OS === 'android') return 'http://10.0.2.2:4000';
    return 'http://localhost:4000';
}
