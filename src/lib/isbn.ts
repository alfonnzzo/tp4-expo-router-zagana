import { LARGO_ISBN } from '@/constants/biblioteca';

export function esIsbnValido(texto: string): boolean {
  return texto.length === LARGO_ISBN && /^[0-9]+$/.test(texto);
}

export function leerParametro(valor: string | string[] | undefined): string {
  if (Array.isArray(valor)) {
    return valor[0] ?? '';
  }
  return valor ?? '';
}
