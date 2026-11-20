import { useEffect, useState } from 'react';

import { buscarLibros } from '@/lib/api';
import type { Libro } from '@/types';

type Respuesta = {
  consulta: string;
  intento: number;
  resultados: Libro[];
  huboError: boolean;
};

const MENSAJE_ERROR = 'No pudimos hacer la búsqueda. Intentá de nuevo.';

export function useBusqueda(texto: string) {
  const consulta = texto.trim();
  const [intento, setIntento] = useState(0);
  const [respuesta, setRespuesta] = useState<Respuesta | null>(null);

  useEffect(() => {
    if (consulta === '') {
      return;
    }
    let vigente = true;
    buscarLibros(consulta)
      .then((resultados) => {
        if (vigente) {
          setRespuesta({ consulta, intento, resultados, huboError: false });
        }
      })
      .catch(() => {
        if (vigente) {
          setRespuesta({ consulta, intento, resultados: [], huboError: true });
        }
      });
    return () => {
      vigente = false;
    };
  }, [consulta, intento]);

  function reintentar() {
    setIntento((actual) => actual + 1);
  }

  const respondida =
    respuesta !== null && respuesta.consulta === consulta && respuesta.intento === intento;
  const cargando = consulta !== '' && !respondida;
  const resultados = consulta !== '' && respondida && !respuesta.huboError ? respuesta.resultados : [];
  const error = consulta !== '' && respondida && respuesta.huboError ? MENSAJE_ERROR : null;

  return { consulta, resultados, cargando, error, reintentar };
}
