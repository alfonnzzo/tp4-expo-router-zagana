import { LARGO_ISBN } from '@/constants/biblioteca';

export function esIsbnValido(texto: string): boolean {
  return texto.length === LARGO_ISBN && /^[0-9]+$/.test(texto);
}
