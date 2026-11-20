import { DIAS_PRESTAMO, MILISEGUNDOS_POR_DIA } from '@/constants/biblioteca';
import type { Libro, PersonaEnEspera, Prestamo, ReservaEnEspera } from '@/types';

export function calcularDevolucion(ahora: number): number {
  return ahora + DIAS_PRESTAMO * MILISEGUNDOS_POR_DIA;
}

export function calcularDisponibles(libro: Libro, prestamos: Prestamo[]): number {
  const prestados = prestamos.filter((prestamo) => prestamo.isbn === libro.isbn).length;
  return Math.max(0, libro.ejemplares - prestados);
}

export function formatearFecha(milisegundos: number): string {
  return new Date(milisegundos).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function obtenerReservasEnEspera(
  esperas: Record<string, PersonaEnEspera[]>,
  libros: Libro[],
): ReservaEnEspera[] {
  const reservas: ReservaEnEspera[] = [];
  for (const isbn of Object.keys(esperas)) {
    const indice = esperas[isbn].findIndex((persona) => persona.esMia);
    if (indice >= 0) {
      const libro = libros.find((item) => item.isbn === isbn);
      reservas.push({
        isbn,
        titulo: libro?.titulo ?? 'Libro ' + isbn,
        posicion: indice + 1,
      });
    }
  }
  return reservas;
}
