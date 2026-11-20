import { StyleSheet, Text, type TextProps } from 'react-native';

import { colores, pesos, tamanios } from '@/constants/tema';

type Variante = 'normal' | 'suave' | 'pequeno' | 'subtitulo' | 'titulo' | 'error' | 'exito';

type TextoProps = TextProps & {
  variante?: Variante;
};

export function Texto({ variante = 'normal', style, ...resto }: TextoProps) {
  return <Text style={[estilos.base, estilos[variante], style]} {...resto} />;
}

const estilos = StyleSheet.create({
  base: {
    color: colores.texto,
    fontSize: tamanios.texto,
  },
  normal: {},
  suave: {
    color: colores.textoSuave,
  },
  pequeno: {
    color: colores.textoSuave,
    fontSize: tamanios.textoPequeno,
  },
  subtitulo: {
    fontSize: tamanios.subtitulo,
    fontWeight: pesos.fuerte,
  },
  titulo: {
    fontSize: tamanios.titulo,
    fontWeight: pesos.fuerte,
  },
  error: {
    color: colores.peligro,
  },
  exito: {
    color: colores.exito,
  },
});
