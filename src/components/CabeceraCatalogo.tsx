import { StyleSheet, View } from 'react-native';

import { BotonEnlace } from '@/components/BotonEnlace';
import { FilaLibro } from '@/components/FilaLibro';
import { Texto } from '@/components/Texto';
import { TituloSeccion } from '@/components/TituloSeccion';
import { espaciado } from '@/constants/tema';
import type { Libro } from '@/types';

type CabeceraCatalogoProps = {
  recientes: Libro[];
};

type LibroConClave = {
  clave: string;
  libro: Libro;
};

function agregarClaves(libros: Libro[]): LibroConClave[] {
  const apariciones: Record<string, number> = {};
  return libros.map((libro) => {
    const numero = (apariciones[libro.isbn] ?? 0) + 1;
    apariciones[libro.isbn] = numero;
    return { clave: libro.isbn + '-' + numero, libro };
  });
}

export function CabeceraCatalogo({ recientes }: CabeceraCatalogoProps) {
  return (
    <View style={estilos.contenedor}>
      <View style={estilos.accesos}>
        <BotonEnlace href="/buscar" titulo="Buscar" />
        <BotonEnlace href="/escanear" titulo="Escanear" primario />
      </View>
      <TituloSeccion texto="Vistos recientemente" />
      {recientes.length === 0 ? (
        <Texto variante="suave">Todavía no abriste ningún libro.</Texto>
      ) : (
        agregarClaves(recientes).map((item) => <FilaLibro key={item.clave} libro={item.libro} />)
      )}
      <TituloSeccion texto="Catálogo" />
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    gap: espaciado.s,
  },
  accesos: {
    flexDirection: 'row',
    gap: espaciado.s,
  },
});
