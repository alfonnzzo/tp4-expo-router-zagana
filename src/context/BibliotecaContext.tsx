import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { CANTIDAD_RECIENTES, NOMBRE_PROPIO } from '@/constants/biblioteca';
import { ESPERA_INICIAL } from '@/data/libros';
import { Cola } from '@/estructuras/Cola';
import { Pila } from '@/estructuras/Pila';
import {
  cancelarRecordatorio,
  notificarLibroListo,
  programarRecordatorio,
} from '@/lib/notificaciones';
import { consultarPermiso } from '@/lib/permisos';
import { calcularDevolucion, calcularDisponibles } from '@/lib/reservas';
import type { Aviso, Libro, PersonaEnEspera, Prestamo, ResultadoReserva } from '@/types';

type Esperas = Record<string, PersonaEnEspera[]>;

type ValorBiblioteca = {
  sesionIniciada: boolean;
  iniciarSesion: () => void;
  cerrarSesion: () => void;
  recientes: Libro[];
  registrarVisto: (libro: Libro) => void;
  prestamos: Prestamo[];
  esperas: Esperas;
  avisos: Aviso[];
  reservar: (libro: Libro) => ResultadoReserva;
  devolver: (isbn: string) => Promise<void>;
  activarRecordatorio: (isbn: string) => Promise<void>;
  desactivarRecordatorio: (isbn: string) => Promise<void>;
  entregarSiguiente: (libro: Libro) => Promise<PersonaEnEspera | undefined>;
};

const BibliotecaContext = createContext<ValorBiblioteca | null>(null);

function crearColasIniciales(): Map<string, Cola<PersonaEnEspera>> {
  const colas = new Map<string, Cola<PersonaEnEspera>>();
  for (const isbn of Object.keys(ESPERA_INICIAL)) {
    const cola = new Cola<PersonaEnEspera>();
    ESPERA_INICIAL[isbn].forEach((nombre, indice) => {
      cola.encolar({ id: 'inicial-' + isbn + '-' + indice, nombre, esMia: false });
    });
    colas.set(isbn, cola);
  }
  return colas;
}

function copiarEsperas(colas: Map<string, Cola<PersonaEnEspera>>): Esperas {
  const copia: Esperas = {};
  colas.forEach((cola, isbn) => {
    copia[isbn] = cola.aArray();
  });
  return copia;
}

export function ProveedorBiblioteca({ children }: { children: ReactNode }) {
  const [colas] = useState(crearColasIniciales);
  const [pilaVistos] = useState(() => new Pila<Libro>());
  const contadorAvisos = useRef(0);
  const prestamosActuales = useRef<Prestamo[]>([]);
  const programando = useRef(new Set<string>());
  const cancelarAlTerminar = useRef(new Set<string>());

  const [sesionIniciada, setSesionIniciada] = useState(false);
  const [recientes, setRecientes] = useState<Libro[]>([]);
  const [prestamos, setPrestamos] = useState<Prestamo[]>([]);
  const [esperas, setEsperas] = useState<Esperas>(() => copiarEsperas(colas));
  const [avisos, setAvisos] = useState<Aviso[]>([]);

  useEffect(() => {
    prestamosActuales.current = prestamos;
  }, [prestamos]);

  const iniciarSesion = useCallback(() => {
    setSesionIniciada(true);
  }, []);

  const cerrarSesion = useCallback(() => {
    setSesionIniciada(false);
  }, []);

  const registrarVisto = useCallback(
    (libro: Libro) => {
      if (pilaVistos.tope()?.isbn === libro.isbn) {
        return;
      }
      pilaVistos.push(libro);
      setRecientes(pilaVistos.aArray().reverse().slice(0, CANTIDAD_RECIENTES));
    },
    [pilaVistos],
  );

  const agregarAviso = useCallback((mensaje: string) => {
    contadorAvisos.current = contadorAvisos.current + 1;
    const aviso: Aviso = { id: 'aviso-' + contadorAvisos.current, mensaje };
    setAvisos((actual) => [aviso, ...actual]);
  }, []);

  const reservar = useCallback(
    (libro: Libro): ResultadoReserva => {
      const cola = colas.get(libro.isbn) ?? new Cola<PersonaEnEspera>();
      const yaPrestado = prestamos.some((prestamo) => prestamo.isbn === libro.isbn);
      const yaEnEspera = cola.aArray().some((persona) => persona.esMia);
      if (yaPrestado || yaEnEspera) {
        return { tipo: 'repetida' };
      }
      if (calcularDisponibles(libro, prestamos) > 0) {
        const devolucion = calcularDevolucion(Date.now());
        const nuevo: Prestamo = {
          isbn: libro.isbn,
          titulo: libro.titulo,
          devolucion,
          recordatorioId: null,
        };
        setPrestamos((actual) => [...actual, nuevo]);
        return { tipo: 'prestamo', devolucion };
      }
      cola.encolar({ id: 'propia-' + libro.isbn, nombre: NOMBRE_PROPIO, esMia: true });
      colas.set(libro.isbn, cola);
      setEsperas(copiarEsperas(colas));
      return { tipo: 'espera', posicion: cola.tamanio };
    },
    [colas, prestamos],
  );

  const devolver = useCallback(
    async (isbn: string) => {
      const prestamo = prestamos.find((item) => item.isbn === isbn);
      if (prestamo === undefined) {
        return;
      }
      setPrestamos((actual) => actual.filter((item) => item.isbn !== isbn));
      if (prestamo.recordatorioId !== null) {
        await cancelarRecordatorio(prestamo.recordatorioId);
      }
    },
    [prestamos],
  );

  const activarRecordatorio = useCallback(
    async (isbn: string) => {
      const prestamo = prestamos.find((item) => item.isbn === isbn);
      if (prestamo === undefined || prestamo.recordatorioId !== null || programando.current.has(isbn)) {
        return;
      }
      programando.current.add(isbn);
      cancelarAlTerminar.current.delete(isbn);
      try {
        const identificador = await programarRecordatorio(prestamo);
        const sigueVigente = prestamosActuales.current.some((item) => item.isbn === isbn);
        if (!sigueVigente || cancelarAlTerminar.current.has(isbn)) {
          await cancelarRecordatorio(identificador);
          return;
        }
        setPrestamos((actual) =>
          actual.map((item) =>
            item.isbn === isbn ? { ...item, recordatorioId: identificador } : item,
          ),
        );
      } catch {
        agregarAviso('No pudimos programar el recordatorio de ' + prestamo.titulo + '. Intentá de nuevo.');
      } finally {
        programando.current.delete(isbn);
        cancelarAlTerminar.current.delete(isbn);
      }
    },
    [prestamos, agregarAviso],
  );

  const desactivarRecordatorio = useCallback(
    async (isbn: string) => {
      if (programando.current.has(isbn)) {
        cancelarAlTerminar.current.add(isbn);
        return;
      }
      const prestamo = prestamos.find((item) => item.isbn === isbn);
      if (prestamo === undefined || prestamo.recordatorioId === null) {
        return;
      }
      setPrestamos((actual) =>
        actual.map((item) => (item.isbn === isbn ? { ...item, recordatorioId: null } : item)),
      );
      await cancelarRecordatorio(prestamo.recordatorioId);
    },
    [prestamos],
  );

  const entregarSiguiente = useCallback(
    async (libro: Libro): Promise<PersonaEnEspera | undefined> => {
      const persona = colas.get(libro.isbn)?.desencolar();
      setEsperas(copiarEsperas(colas));
      if (persona === undefined || !persona.esMia) {
        return persona;
      }
      const estado = await consultarPermiso('notificaciones');
      if (estado === 'concedido') {
        try {
          await notificarLibroListo(libro.titulo);
          return persona;
        } catch {
          agregarAviso('Tu reserva de ' + libro.titulo + ' está lista. Pasá a retirarla.');
          return persona;
        }
      }
      agregarAviso('Tu reserva de ' + libro.titulo + ' está lista. Pasá a retirarla.');
      return persona;
    },
    [colas, agregarAviso],
  );

  const valor = useMemo<ValorBiblioteca>(
    () => ({
      sesionIniciada,
      iniciarSesion,
      cerrarSesion,
      recientes,
      registrarVisto,
      prestamos,
      esperas,
      avisos,
      reservar,
      devolver,
      activarRecordatorio,
      desactivarRecordatorio,
      entregarSiguiente,
    }),
    [
      sesionIniciada,
      iniciarSesion,
      cerrarSesion,
      recientes,
      registrarVisto,
      prestamos,
      esperas,
      avisos,
      reservar,
      devolver,
      activarRecordatorio,
      desactivarRecordatorio,
      entregarSiguiente,
    ],
  );

  return <BibliotecaContext.Provider value={valor}>{children}</BibliotecaContext.Provider>;
}

export function useBiblioteca(): ValorBiblioteca {
  const valor = useContext(BibliotecaContext);
  if (valor === null) {
    throw new Error('useBiblioteca tiene que usarse dentro de ProveedorBiblioteca');
  }
  return valor;
}
