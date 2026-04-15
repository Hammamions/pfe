import { Stack } from 'expo-router';
import '../i18n';
import { AppProvider } from './AppContext';

export default function RootLayout() {
    return (
        <AppProvider>
            <Stack
                screenOptions={{
                    headerStyle: {
                        backgroundColor: '#0f172a',
                    },
                    headerTintColor: '#fff',
                    headerTitleStyle: {
                        fontWeight: 'bold',
                    },
                }}
            >
                <Stack.Screen name="index" options={{ headerShown: false }} />
                <Stack.Screen name="login" options={{ headerShown: false }} />
                <Stack.Screen name="forgot-password" options={{ headerShown: false }} />
            </Stack>
        </AppProvider>
    );
}
