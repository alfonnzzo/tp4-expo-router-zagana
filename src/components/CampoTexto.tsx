import { StyleSheet, TextInput, View, type KeyboardTypeOptions } from 'react-native';

import { Texto } from '@/components/Texto';
import { colores, espaciado, radios, tamanios } from '@/constants/tema';

type CampoTextoProps = {
  etiqueta: string;
  valor: string;
  onCambiar: (texto: string) => void;
  placeholder?: string;
  teclado?: KeyboardTypeOptions;
  oculto?: boolean;
  largoMaximo?: number;
};

export function CampoTexto({
  etiqueta,
  valor,
  onCambiar,
  placeholder,
  teclado = 'default',
  oculto = false,
  largoMaximo,
}: CampoTextoProps) {
  return (
    <View style={estilos.contenedor}>
      <Texto variante="pequeno">{etiqueta}</Texto>
      <TextInput
        accessibilityLabel={etiqueta}
        style={estilos.campo}
        value={valor}
        onChangeText={onCambiar}
        placeholder={placeholder}
        placeholderTextColor={colores.textoSuave}
        keyboardType={teclado}
        secureTextEntry={oculto}
        maxLength={largoMaximo}
        autoCapitalize="none"
        autoCorrect={false}
      />
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    gap: espaciado.xs,
  },
  campo: {
    minHeight: tamanios.toqueMinimo,
    paddingHorizontal: espaciado.m,
    borderWidth: tamanios.borde,
    borderColor: colores.borde,
    borderRadius: radios.s,
    backgroundColor: colores.superficie,
    color: colores.texto,
    fontSize: tamanios.texto,
  },
});
