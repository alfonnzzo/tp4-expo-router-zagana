import { StyleSheet, View } from 'react-native';

import { Texto } from '@/components/Texto';
import { colores, espaciado, radios, tamanios } from '@/constants/tema';

type Tono = 'info' | 'exito' | 'aviso' | 'peligro';

type CajaMensajeProps = {
  mensaje: string;
  tono?: Tono;
};

export function CajaMensaje({ mensaje, tono = 'info' }: CajaMensajeProps) {
  return (
    <View accessibilityRole="alert" style={[estilos.caja, estilosTono[tono]]}>
      <Texto>{mensaje}</Texto>
    </View>
  );
}

const estilos = StyleSheet.create({
  caja: {
    padding: espaciado.m,
    borderRadius: radios.s,
    borderWidth: tamanios.borde,
  },
});

const estilosTono = StyleSheet.create({
  info: {
    backgroundColor: colores.superficie,
    borderColor: colores.borde,
  },
  exito: {
    backgroundColor: colores.fondoExito,
    borderColor: colores.exito,
  },
  aviso: {
    backgroundColor: colores.fondoAviso,
    borderColor: colores.aviso,
  },
  peligro: {
    backgroundColor: colores.fondoPeligro,
    borderColor: colores.peligro,
  },
});
