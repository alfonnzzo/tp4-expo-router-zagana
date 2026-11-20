import { Link } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';

import { Texto } from '@/components/Texto';
import { colores, espaciado, pesos, tamanios } from '@/constants/tema';
import { useBiblioteca } from '@/context/BibliotecaContext';

export function EnlacePersonal() {
  const { sesionIniciada } = useBiblioteca();

  return (
    <Link href={sesionIniciada ? '/mostrador' : '/login'} asChild>
      <Pressable accessibilityRole="link" style={estilos.enlace}>
        <Texto style={estilos.texto}>Personal</Texto>
      </Pressable>
    </Link>
  );
}

const estilos = StyleSheet.create({
  enlace: {
    minHeight: tamanios.toqueMinimo,
    minWidth: tamanios.toqueMinimo,
    paddingHorizontal: espaciado.s,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texto: {
    color: colores.primario,
    fontWeight: pesos.fuerte,
  },
});
