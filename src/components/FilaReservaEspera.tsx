import { StyleSheet, View } from 'react-native';

import { Texto } from '@/components/Texto';
import { colores, espaciado, radios, tamanios } from '@/constants/tema';
import type { ReservaEnEspera } from '@/types';

type FilaReservaEsperaProps = {
  reserva: ReservaEnEspera;
};

export function FilaReservaEspera({ reserva }: FilaReservaEsperaProps) {
  return (
    <View style={estilos.fila}>
      <Texto variante="subtitulo">{reserva.titulo}</Texto>
      <Texto variante="suave">Posición en la lista de espera: {reserva.posicion}</Texto>
    </View>
  );
}

const estilos = StyleSheet.create({
  fila: {
    padding: espaciado.m,
    borderWidth: tamanios.borde,
    borderColor: colores.borde,
    borderRadius: radios.s,
    backgroundColor: colores.superficie,
    gap: espaciado.xs,
  },
});
