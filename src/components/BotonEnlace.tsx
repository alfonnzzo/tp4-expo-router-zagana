import { Link, type Href } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';

import { Texto } from '@/components/Texto';
import { colores, espaciado, pesos, radios, tamanios } from '@/constants/tema';

type BotonEnlaceProps = {
  href: Href;
  titulo: string;
  primario?: boolean;
};

export function BotonEnlace({ href, titulo, primario = false }: BotonEnlaceProps) {
  return (
    <Link href={href} asChild>
      <Pressable
        accessibilityRole="button"
        style={({ pressed }) => [
          estilos.boton,
          primario ? estilos.fondoPrimario : estilos.fondoSecundario,
          pressed && estilos.presionado,
        ]}>
        <Texto style={[estilos.texto, primario ? estilos.textoPrimario : estilos.textoSecundario]}>
          {titulo}
        </Texto>
      </Pressable>
    </Link>
  );
}

const estilos = StyleSheet.create({
  boton: {
    flex: 1,
    minHeight: tamanios.toqueMinimo,
    minWidth: tamanios.toqueMinimo,
    paddingHorizontal: espaciado.l,
    paddingVertical: espaciado.s,
    borderRadius: radios.s,
    borderWidth: tamanios.borde,
    borderColor: colores.primario,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fondoPrimario: {
    backgroundColor: colores.primario,
  },
  fondoSecundario: {
    backgroundColor: colores.superficie,
  },
  texto: {
    fontWeight: pesos.fuerte,
  },
  textoPrimario: {
    color: colores.textoPrimario,
  },
  textoSecundario: {
    color: colores.primario,
  },
  presionado: {
    opacity: 0.7,
  },
});
