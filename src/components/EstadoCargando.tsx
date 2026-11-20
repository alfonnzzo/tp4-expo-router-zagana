import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Texto } from '@/components/Texto';
import { colores, espaciado } from '@/constants/tema';

type EstadoCargandoProps = {
  mensaje?: string;
};

export function EstadoCargando({ mensaje = 'Cargando...' }: EstadoCargandoProps) {
  return (
    <View style={estilos.contenedor}>
      <ActivityIndicator size="large" color={colores.primario} />
      <Texto variante="suave">{mensaje}</Texto>
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    alignItems: 'center',
    gap: espaciado.m,
    padding: espaciado.xl,
  },
});
