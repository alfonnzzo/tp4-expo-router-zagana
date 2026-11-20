import { router } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';

import { Texto } from '@/components/Texto';
import { colores, espaciado, opacidades, radios, tamanios } from '@/constants/tema';
import type { Libro } from '@/types';

type FilaLibroProps = {
  libro: Libro;
};

export function FilaLibro({ libro }: FilaLibroProps) {
  function abrirDetalle() {
    router.push({ pathname: '/libro/[isbn]', params: { isbn: libro.isbn } });
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={libro.titulo + ', de ' + libro.autor}
      onPress={abrirDetalle}
      style={({ pressed }) => [estilos.fila, pressed && estilos.presionada]}>
      <Texto variante="subtitulo">{libro.titulo}</Texto>
      <Texto variante="suave">
        {libro.autor} - {libro.anio}
      </Texto>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  fila: {
    minHeight: tamanios.toqueMinimo,
    padding: espaciado.m,
    borderWidth: tamanios.borde,
    borderColor: colores.borde,
    borderRadius: radios.s,
    backgroundColor: colores.superficie,
    gap: espaciado.xs,
  },
  presionada: {
    opacity: opacidades.presionado,
  },
});
