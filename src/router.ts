/** Hash-based routes, so the site works as static files on GitHub Pages (no server rewrites). */
export type Route =
  | { room: 'prelude' }
  | { room: 'catalogue' }
  | { room: 'inspect'; id: string | null }
  | { room: 'about' };

export type RoomName = Route['room'];

export function parseRoute(hash: string): Route {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  switch (parts[0]) {
    case 'catalogue':
      return { room: 'catalogue' };
    case 'inspect':
      return { room: 'inspect', id: parts[1] ?? null };
    case 'about':
      return { room: 'about' };
    default:
      return { room: 'prelude' };
  }
}

export function routeHref(route: Route): string {
  switch (route.room) {
    case 'prelude':
      return '#/';
    case 'inspect':
      return route.id ? `#/inspect/${encodeURIComponent(route.id)}` : '#/inspect';
    default:
      return `#/${route.room}`;
  }
}
