import { Stack } from 'expo-router';
import { StyleSheet } from 'react-native';

import { colores } from '@/constants/tema';
import { useBiblioteca } from '@/context/BibliotecaContext';

export function NavegacionRaiz() {
  const { sesionIniciada } = useBiblioteca();

  return (
    <Stack
      screenOptions={{
        headerBackButtonDisplayMode: 'minimal',
        contentStyle: estilos.contenido,
      }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="buscar" options={{ title: 'Buscar' }} />
      <Stack.Screen name="escanear" options={{ title: 'Escanear libro' }} />
      <Stack.Screen name="reservar/[isbn]" options={{ title: 'Reservar', presentation: 'modal' }} />
      <Stack.Screen name="permisos/[recurso]" options={{ title: 'Permiso', presentation: 'modal' }} />
      <Stack.Screen name="+not-found" options={{ title: 'Página no encontrada' }} />
      <Stack.Protected guard={!sesionIniciada}>
        <Stack.Screen name="login" options={{ title: 'Ingreso del personal', presentation: 'modal' }} />
      </Stack.Protected>
      <Stack.Protected guard={sesionIniciada}>
        <Stack.Screen name="mostrador" options={{ title: 'Mostrador' }} />
      </Stack.Protected>
    </Stack>
  );
}

const estilos = StyleSheet.create({
  contenido: {
    backgroundColor: colores.fondo,
  },
});
