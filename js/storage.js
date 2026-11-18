// Guardado local (en el propio navegador/móvil). Si el navegador lo bloquea, la app sigue funcionando.

const PREFIX = 'poker:';

export function load(key, fallback) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw == null ? fallback : { ...fallback, ...JSON.parse(raw) };
  } catch {
    return fallback;
  }
}

export function save(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    /* sin almacenamiento: se pierde el progreso, pero no rompe nada */
  }
}
