import { Pressable, StyleSheet } from 'react-native';

import { Texto } from '@/components/Texto';
import { colores, espaciado, opacidades, pesos, radios, tamanios } from '@/constants/tema';

type Variante = 'primario' | 'secundario' | 'peligro';

type BotonProps = {
  titulo: string;
  onPress: () => void;
  variante?: Variante;
  deshabilitado?: boolean;
};

export function Boton({ titulo, onPress, variante = 'primario', deshabilitado = false }: BotonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: deshabilitado }}
      disabled={deshabilitado}
      onPress={onPress}
      style={({ pressed }) => [
        estilos.boton,
        estilosFondo[variante],
        deshabilitado && estilos.deshabilitado,
        pressed && estilos.presionado,
      ]}>
      <Texto style={[estilos.texto, estilosTexto[variante]]}>{titulo}</Texto>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  boton: {
    minHeight: tamanios.toqueMinimo,
    minWidth: tamanios.toqueMinimo,
    paddingHorizontal: espaciado.l,
    paddingVertical: espaciado.s,
    borderRadius: radios.s,
    borderWidth: tamanios.borde,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texto: {
    fontWeight: pesos.fuerte,
  },
  deshabilitado: {
    opacity: opacidades.deshabilitado,
  },
  presionado: {
    opacity: opacidades.presionado,
  },
});

const estilosFondo = StyleSheet.create({
  primario: {
    backgroundColor: colores.primario,
    borderColor: colores.primario,
  },
  secundario: {
    backgroundColor: colores.superficie,
    borderColor: colores.primario,
  },
  peligro: {
    backgroundColor: colores.superficie,
    borderColor: colores.peligro,
  },
});

const estilosTexto = StyleSheet.create({
  primario: {
    color: colores.textoPrimario,
  },
  secundario: {
    color: colores.primario,
  },
  peligro: {
    color: colores.peligro,
  },
});
