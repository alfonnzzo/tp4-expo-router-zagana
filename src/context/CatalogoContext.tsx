import { createContext, useContext, type ReactNode } from 'react';

import { useLibros } from '@/hooks/useLibros';
import type { Libro } from '@/types';

type ValorCatalogo = {
  libros: Libro[];
  cargando: boolean;
  error: string | null;
  reintentar: () => void;
};

const CatalogoContext = createContext<ValorCatalogo | null>(null);

export function ProveedorCatalogo({ children }: { children: ReactNode }) {
  const valor = useLibros();
  return <CatalogoContext.Provider value={valor}>{children}</CatalogoContext.Provider>;
}

export function useCatalogo(): ValorCatalogo {
  const valor = useContext(CatalogoContext);
  if (valor === null) {
    throw new Error('useCatalogo tiene que usarse dentro de ProveedorCatalogo');
  }
  return valor;
}
