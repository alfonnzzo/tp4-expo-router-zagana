import { StyleSheet, View } from 'react-native';

import { Texto } from '@/components/Texto';
import { espaciado } from '@/constants/tema';

type EstadoVacioProps = {
  mensaje: string;
};

export function EstadoVacio({ mensaje }: EstadoVacioProps) {
  return (
    <View style={estilos.contenedor}>
      <Texto variante="suave" style={estilos.mensaje}>
        {mensaje}
      </Texto>
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    alignItems: 'center',
    padding: espaciado.xl,
  },
  mensaje: {
    textAlign: 'center',
  },
});
