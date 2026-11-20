import type { ReactNode } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import { colores, espaciado } from '@/constants/tema';

type PantallaProps = {
  children: ReactNode;
};

export function Pantalla({ children }: PantallaProps) {
  return (
    <ScrollView
      style={estilos.pantalla}
      contentContainerStyle={estilos.contenido}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled">
      {children}
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  pantalla: {
    flex: 1,
    backgroundColor: colores.fondo,
  },
  contenido: {
    padding: espaciado.l,
    gap: espaciado.m,
  },
});
