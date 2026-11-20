import { StyleSheet, View } from 'react-native';

import { Boton } from '@/components/Boton';
import { Texto } from '@/components/Texto';
import { colores, espaciado, radios, tamanios } from '@/constants/tema';
import type { Libro, PersonaEnEspera } from '@/types';

type FilaMostradorProps = {
  libro: Libro;
  personas: PersonaEnEspera[];
  onEntregar: (libro: Libro) => void;
};

export function FilaMostrador({ libro, personas, onEntregar }: FilaMostradorProps) {
  const alFrente = personas[0];

  return (
    <View style={estilos.fila}>
      <Texto variante="subtitulo">{libro.titulo}</Texto>
      <Texto>Al frente: {alFrente ? alFrente.nombre : 'nadie'}</Texto>
      <Texto variante="suave">Personas esperando: {personas.length}</Texto>
      <Boton titulo="Entregar al siguiente" onPress={() => onEntregar(libro)} />
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
});
