import { StyleSheet, Switch, View } from 'react-native';

import { Boton } from '@/components/Boton';
import { Texto } from '@/components/Texto';
import { colores, espaciado, radios, tamanios } from '@/constants/tema';
import { formatearFecha } from '@/lib/reservas';
import type { Prestamo } from '@/types';

type FilaPrestamoProps = {
  prestamo: Prestamo;
  onCambiarRecordatorio: (isbn: string, activar: boolean) => void;
  onDevolver: (isbn: string) => void;
};

export function FilaPrestamo({ prestamo, onCambiarRecordatorio, onDevolver }: FilaPrestamoProps) {
  return (
    <View style={estilos.fila}>
      <Texto variante="subtitulo">{prestamo.titulo}</Texto>
      <Texto variante="suave">Devolución: {formatearFecha(prestamo.devolucion)}</Texto>
      <View style={estilos.recordatorio}>
        <Texto>Recordarme</Texto>
        <Switch
          accessibilityLabel={'Recordarme la devolución de ' + prestamo.titulo}
          value={prestamo.recordatorioId !== null}
          onValueChange={(activar) => onCambiarRecordatorio(prestamo.isbn, activar)}
          trackColor={{ false: colores.borde, true: colores.primario }}
        />
      </View>
      <Boton titulo="Devolver" variante="secundario" onPress={() => onDevolver(prestamo.isbn)} />
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
    gap: espaciado.s,
  },
  recordatorio: {
    minHeight: tamanios.toqueMinimo,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
