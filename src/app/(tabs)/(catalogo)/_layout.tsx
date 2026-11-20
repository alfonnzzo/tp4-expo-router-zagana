import { Stack } from 'expo-router';
import { StyleSheet } from 'react-native';

import { EnlacePersonal } from '@/components/EnlacePersonal';
import { colores } from '@/constants/tema';

export const unstable_settings = {
  anchor: 'index',
};

export default function LayoutCatalogo() {
  return (
    <Stack
      screenOptions={{
        headerBackButtonDisplayMode: 'minimal',
        contentStyle: estilos.contenido,
      }}>
      <Stack.Screen name="index" options={{ title: 'Catálogo', headerRight: EnlacePersonal }} />
      <Stack.Screen name="libro/[isbn]" options={{ title: 'Libro' }} />
    </Stack>
  );
}

const estilos = StyleSheet.create({
  contenido: {
    backgroundColor: colores.fondo,
  },
});
