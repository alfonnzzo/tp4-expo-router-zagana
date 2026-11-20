import { Pressable, StyleSheet, Switch, View } from 'react-native';

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
  const recordatorioActivo = prestamo.recordatorioId !== null;

  return (
    <View style={estilos.fila}>
      <Texto variante="subtitulo">{prestamo.titulo}</Texto>
      <Texto variante="suave">Devolución: {formatearFecha(prestamo.devolucion)}</Texto>
      <Pressable
        accessibilityRole="switch"
        accessibilityLabel={'Recordarme la devolución de ' + prestamo.titulo}
        accessibilityState={{ checked: recordatorioActivo }}
        onPress={() => onCambiarRecordatorio(prestamo.isbn, !recordatorioActivo)}
        style={estilos.recordatorio}>
        <Texto>Recordarme</Texto>
        <View pointerEvents="none">
          <Switch
            value={recordatorioActivo}
            trackColor={{ false: colores.borde, true: colores.primario }}
          />
        </View>
      </Pressable>
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
