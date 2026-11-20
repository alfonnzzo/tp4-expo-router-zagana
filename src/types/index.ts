export type Libro = {
  isbn: string;
  titulo: string;
  autor: string;
  anio: number;
  ejemplares: number;
};

export type Recurso = 'camara' | 'notificaciones';

export type EstadoPermiso = 'cargando' | 'concedido' | 'preguntable' | 'bloqueado';

export type PersonaEnEspera = {
  id: string;
  nombre: string;
  esMia: boolean;
};

export type Prestamo = {
  isbn: string;
  titulo: string;
  devolucion: number;
  recordatorioId: string | null;
};

export type ReservaEnEspera = {
  isbn: string;
  titulo: string;
  posicion: number;
};

export type Aviso = {
  id: string;
  mensaje: string;
};

export type ResultadoReserva =
  | { tipo: 'prestamo'; devolucion: number }
  | { tipo: 'espera'; posicion: number }
  | { tipo: 'repetida' };

export type ItemReservas =
  | { clave: string; tipo: 'titulo'; texto: string }
  | { clave: string; tipo: 'vacio'; mensaje: string }
  | { clave: string; tipo: 'prestamo'; prestamo: Prestamo }
  | { clave: string; tipo: 'espera'; reserva: ReservaEnEspera }
  | { clave: string; tipo: 'aviso'; aviso: Aviso };
