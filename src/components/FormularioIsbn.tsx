import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Boton } from '@/components/Boton';
import { CampoTexto } from '@/components/CampoTexto';
import { Texto } from '@/components/Texto';
import { LARGO_ISBN } from '@/constants/biblioteca';
import { espaciado } from '@/constants/tema';
import { esIsbnValido } from '@/lib/isbn';

type FormularioIsbnProps = {
  onBuscar: (isbn: string) => void;
};

export function FormularioIsbn({ onBuscar }: FormularioIsbnProps) {
  const [texto, setTexto] = useState('');
  const [error, setError] = useState<string | null>(null);

  function enviar() {
    const isbn = texto.trim();
    if (!esIsbnValido(isbn)) {
      setError('El ISBN tiene que tener ' + LARGO_ISBN + ' números, sin guiones.');
      return;
    }
    setError(null);
    onBuscar(isbn);
  }

  return (
    <View style={estilos.contenedor}>
      <CampoTexto
        etiqueta="Escribir el ISBN a mano"
        valor={texto}
        onCambiar={setTexto}
        placeholder="13 números, sin guiones"
        teclado="number-pad"
        largoMaximo={LARGO_ISBN}
      />
      {error !== null ? <Texto variante="error">{error}</Texto> : null}
      <Boton titulo="Abrir libro" variante="secundario" onPress={enviar} />
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    gap: espaciado.s,
  },
});
