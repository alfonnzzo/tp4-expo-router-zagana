import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router/js-tabs';
import { StyleSheet } from 'react-native';

import { colores, tamanios } from '@/constants/tema';

function colorIcono(activo: boolean): string {
  return activo ? colores.primario : colores.textoSuave;
}

export default function LayoutPestanias() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colores.primario,
        tabBarInactiveTintColor: colores.textoSuave,
        sceneStyle: estilos.escena,
      }}>
      <Tabs.Screen
        name="(catalogo)"
        options={{
          title: 'Catálogo',
          headerShown: false,
          tabBarIcon: ({ focused }) => (
            <Ionicons name="library" size={tamanios.icono} color={colorIcono(focused)} />
          ),
        }}
      />
      <Tabs.Screen
        name="reservas"
        options={{
          title: 'Mis reservas',
          tabBarIcon: ({ focused }) => (
            <Ionicons name="bookmarks" size={tamanios.icono} color={colorIcono(focused)} />
          ),
        }}
      />
    </Tabs>
  );
}

const estilos = StyleSheet.create({
  escena: {
    backgroundColor: colores.fondo,
  },
});
