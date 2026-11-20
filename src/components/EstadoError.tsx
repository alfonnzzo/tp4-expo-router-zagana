import { StyleSheet, View } from 'react-native';

import { Boton } from '@/components/Boton';
import { Texto } from '@/components/Texto';
import { espaciado } from '@/constants/tema';

type EstadoErrorProps = {
  mensaje: string;
  onReintentar: () => void;
};

export function EstadoError({ mensaje, onReintentar }: EstadoErrorProps) {
  return (
    <View style={estilos.contenedor}>
      <Texto variante="error" style={estilos.mensaje}>
        {mensaje}
      </Texto>
      <Boton titulo="Reintentar" onPress={onReintentar} />
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    alignItems: 'center',
    gap: espaciado.m,
    padding: espaciado.xl,
  },
  mensaje: {
    textAlign: 'center',
  },
});
