import { useEffect, useState } from 'react';

import { obtenerLibros } from '@/lib/api';
import type { Libro } from '@/types';

type Respuesta = {
  intento: number;
  libros: Libro[];
  huboError: boolean;
};

const MENSAJE_ERROR = 'No pudimos cargar el catálogo. Revisá tu conexión e intentá de nuevo.';

export function useLibros() {
  const [intento, setIntento] = useState(0);
  const [respuesta, setRespuesta] = useState<Respuesta | null>(null);

  useEffect(() => {
    let vigente = true;
    obtenerLibros()
      .then((libros) => {
        if (vigente) {
          setRespuesta({ intento, libros, huboError: false });
        }
      })
      .catch(() => {
        if (vigente) {
          setRespuesta({ intento, libros: [], huboError: true });
        }
      });
    return () => {
      vigente = false;
    };
  }, [intento]);

  function reintentar() {
    setIntento((actual) => actual + 1);
  }

  const cargando = respuesta === null || respuesta.intento !== intento;
  const libros = cargando || respuesta.huboError ? [] : respuesta.libros;
  const error = !cargando && respuesta.huboError ? MENSAJE_ERROR : null;

  return { libros, cargando, error, reintentar };
}
