import 'react-native-gesture-handler';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import '../i18n';
import { patientPastel } from '../theme';
import { AppProvider } from './AppContext';
import { StyleSheet } from 'react-native';

export default function RootLayout() {
    return (
        <GestureHandlerRootView style={styles.root}>
        <SafeAreaProvider>
        <AppProvider>
            <Stack
                screenOptions={{
                    headerStyle: {
                        backgroundColor: patientPastel.primaryDeep,
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
                <Stack.Screen name="complete-profile" options={{ headerShown: false }} />
            </Stack>
        </AppProvider>
        </SafeAreaProvider>
        </GestureHandlerRootView>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1 },
});
