import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { colores, espaciado } from '@/constants/tema';

type PantallaProps = {
  children: ReactNode;
};

export function Pantalla({ children }: PantallaProps) {
  return <View style={estilos.pantalla}>{children}</View>;
}

const estilos = StyleSheet.create({
  pantalla: {
    flex: 1,
    backgroundColor: colores.fondo,
    padding: espaciado.l,
    gap: espaciado.m,
  },
});
