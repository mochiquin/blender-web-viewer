import type { Route } from '../router';

/** One full-screen section of the site. Rooms are built once and shown or hidden by the router. */
export interface Room {
  readonly element: HTMLElement;
  enter(route: Route): void | Promise<void>;
  leave(): void;
}

export function el<K extends keyof HTMLElementTagNameMap>(tag: K, className = '', html = ''): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (html) node.innerHTML = html;
  return node;
}
