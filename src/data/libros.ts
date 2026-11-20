import type { Libro } from '../types';

export const LIBROS: Libro[] = [
  { isbn: '9780307474728', titulo: 'Cien años de soledad', autor: 'Gabriel García Márquez', anio: 1967, ejemplares: 2 },
  { isbn: '9780451524935', titulo: '1984', autor: 'George Orwell', anio: 1949, ejemplares: 0 },
  { isbn: '9789871370115', titulo: 'Rayuela', autor: 'Julio Cortázar', anio: 1963, ejemplares: 0 },
  { isbn: '9789871740123', titulo: 'El Aleph', autor: 'Jorge Luis Borges', anio: 1949, ejemplares: 0 },
  { isbn: '9789872110130', titulo: 'Ficciones', autor: 'Jorge Luis Borges', anio: 1944, ejemplares: 3 },
  { isbn: '9789872480141', titulo: 'Sobre héroes y tumbas', autor: 'Ernesto Sabato', anio: 1961, ejemplares: 1 },
  { isbn: '9789872850159', titulo: 'El túnel', autor: 'Ernesto Sabato', anio: 1948, ejemplares: 2 },
  { isbn: '9789873220166', titulo: 'Martín Fierro', autor: 'José Hernández', anio: 1872, ejemplares: 4 },
  { isbn: '9789873590177', titulo: 'Don Quijote de la Mancha', autor: 'Miguel de Cervantes', anio: 1605, ejemplares: 1 },
  { isbn: '9789873960185', titulo: 'La casa de los espíritus', autor: 'Isabel Allende', anio: 1982, ejemplares: 2 },
  { isbn: '9789874330192', titulo: 'Pedro Páramo', autor: 'Juan Rulfo', anio: 1955, ejemplares: 0 },
  { isbn: '9789874700209', titulo: 'Los siete locos', autor: 'Roberto Arlt', anio: 1929, ejemplares: 1 },
  { isbn: '9789875070219', titulo: 'Bestiario', autor: 'Julio Cortázar', anio: 1951, ejemplares: 2 },
  { isbn: '9789875440227', titulo: 'Facundo', autor: 'Domingo F. Sarmiento', anio: 1845, ejemplares: 3 },
  { isbn: '9789875810235', titulo: 'Zama', autor: 'Antonio Di Benedetto', anio: 1956, ejemplares: 1 },
  { isbn: '9789876180245', titulo: 'Crónica de una muerte anunciada', autor: 'Gabriel García Márquez', anio: 1981, ejemplares: 2 },
];

export const ESPERA_INICIAL: Record<string, string[]> = {
  '9780451524935': ['Marcos Díaz'],
  '9789871370115': ['Camila Ortiz'],
  '9789871740123': ['Lucía Benítez', 'Tomás Ríos'],
};
