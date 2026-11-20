import { StyleSheet } from 'react-native';

import { Texto } from '@/components/Texto';
import { espaciado } from '@/constants/tema';

type TituloSeccionProps = {
  texto: string;
};

export function TituloSeccion({ texto }: TituloSeccionProps) {
  return (
    <Texto variante="subtitulo" accessibilityRole="header" style={estilos.titulo}>
      {texto}
    </Texto>
  );
}

const estilos = StyleSheet.create({
  titulo: {
    marginTop: espaciado.s,
  },
});
