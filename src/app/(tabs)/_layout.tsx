import { Tabs } from 'expo-router/js-tabs';
import { StyleSheet } from 'react-native';

import { IconoPestania } from '@/components/IconoPestania';
import { colores } from '@/constants/tema';

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
          tabBarIcon: ({ focused }) => <IconoPestania nombre="library" activo={focused} />,
        }}
      />
      <Tabs.Screen
        name="reservas"
        options={{
          title: 'Mis reservas',
          tabBarIcon: ({ focused }) => <IconoPestania nombre="bookmarks" activo={focused} />,
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
