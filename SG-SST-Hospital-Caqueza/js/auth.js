/**
 * auth.js
 * Gestión de sesión y autenticación para la plataforma SG-SST
 * ESE Hospital San Rafael de Cáqueza
 */

const Auth = {

  /** Clave de sesión en sessionStorage */
  SESSION_KEY: 'sgsstdb_session',

  /** Inicia sesión de un usuario */
  login(username, password) {
    const usuario = DB.findUsuarioByUsername(username);
    if (!usuario) return { ok: false, msg: 'Usuario no encontrado.' };
    if (usuario.password !== password) return { ok: false, msg: 'Contraseña incorrecta.' };
    if (!usuario.activo) return { ok: false, msg: 'Usuario inactivo. Contacte al administrador.' };

    // Guardar sesión
    sessionStorage.setItem(this.SESSION_KEY, JSON.stringify({
      id: usuario.id,
      username: usuario.username,
      nombre: usuario.nombre,
      rol: usuario.rol,
      sede: usuario.sede
    }));
    return { ok: true, usuario };
  },

  /** Cierra la sesión actual */
  logout() {
    sessionStorage.removeItem(this.SESSION_KEY);
    // Detectar si estamos en /pages/ o en la raíz para apuntar al login correctamente
    const enSubcarpeta = window.location.pathname.includes('/pages/');
    window.location.href = enSubcarpeta ? '../index.html' : 'index.html';
  },

  /** Retorna el usuario de sesión actual o null */
  getUsuarioActual() {
    const raw = sessionStorage.getItem(this.SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  },

  /** Verifica si hay una sesión activa */
  estaAutenticado() {
    return this.getUsuarioActual() !== null;
  },

  /** Verifica si el usuario actual es admin */
  esAdmin() {
    const u = this.getUsuarioActual();
    return u && u.rol === 'admin';
  },

  /** Redirige al login si no está autenticado */
  requerirAuth() {
    if (!this.estaAutenticado()) {
      const enSubcarpeta = window.location.pathname.includes('/pages/');
      window.location.href = enSubcarpeta ? '../index.html' : 'index.html';
      return false;
    }
    return true;
  },

  /** Redirige si no es admin */
  requerirAdmin() {
    if (!this.esAdmin()) {
      window.location.href = 'dashboard.html';
      return false;
    }
    return true;
  }
};

window.Auth = Auth;
