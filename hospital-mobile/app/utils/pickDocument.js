import ExpoDocumentPicker from 'expo-document-picker/build/ExpoDocumentPicker';


export async function getDocumentAsync({
    type = '*/*',
    copyToCacheDirectory = true,
    multiple = false
} = {}) {
    let types = type;
    if (typeof types === 'string') {
        types = [types];
    }
    return ExpoDocumentPicker.getDocumentAsync({
        type: types,
        copyToCacheDirectory,
        multiple
    });
}
