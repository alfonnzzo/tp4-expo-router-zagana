import { Link } from 'expo-router';
import { StyleSheet } from 'react-native';

import { colores, espaciado, pesos, tamanios } from '@/constants/tema';

export function EnlaceCatalogo() {
  return (
    <Link href="/" dismissTo accessibilityRole="link" style={estilos.enlace}>
      Ir al Catálogo
    </Link>
  );
}

const estilos = StyleSheet.create({
  enlace: {
    minHeight: tamanios.toqueMinimo,
    color: colores.primario,
    fontSize: tamanios.texto,
    fontWeight: pesos.fuerte,
    paddingVertical: espaciado.m,
  },
});
