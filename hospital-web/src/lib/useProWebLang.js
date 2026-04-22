import { useSyncExternalStore } from 'react';
import { getProWebLang, PRO_WEB_LANG_EVENT, PRO_WEB_LANG_KEY } from './proWebI18n';

function subscribe(onStoreChange) {
    const onStorage = (e) => {
        if (!e.key || e.key === PRO_WEB_LANG_KEY) onStoreChange();
    };
    const onCustom = () => onStoreChange();
    window.addEventListener('storage', onStorage);
    window.addEventListener(PRO_WEB_LANG_EVENT, onCustom);
    return () => {
        window.removeEventListener('storage', onStorage);
        window.removeEventListener(PRO_WEB_LANG_EVENT, onCustom);
    };
}

function getSnapshot() {
    return getProWebLang();
}

function getServerSnapshot() {
    return 'fr';
}

export function useProWebLang() {
    return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
