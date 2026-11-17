/**
 * database.js
 * Base de datos simulada con localStorage para la plataforma SG-SST
 * ESE Hospital San Rafael de Cáqueza
 *
 * Estructura de datos:
 *  - usuarios: array de objetos usuario
 *  - modulos: array de objetos módulo con contenido y preguntas
 *  - progreso_{userId}: progreso individual por usuario
 */

// ============================================================
//  CONFIGURACIÓN INICIAL DE LA BASE DE DATOS
// ============================================================
const DB = {

  /** Inicializa la base de datos con datos por defecto si no existe */
  init() {
    if (!localStorage.getItem('sgsstdb_initialized')) {
      this._seedUsuarios();
      this._seedModulos();
      localStorage.setItem('sgsstdb_initialized', 'true');
      console.log('[DB] Base de datos inicializada con datos por defecto.');
    }
  },

  // ----------------------------------------------------------
  //  USUARIOS
  // ----------------------------------------------------------

  /** Retorna todos los usuarios registrados */
  getUsuarios() {
    return JSON.parse(localStorage.getItem('sgsstdb_usuarios') || '[]');
  },

  /** Guarda el array completo de usuarios */
  setUsuarios(arr) {
    localStorage.setItem('sgsstdb_usuarios', JSON.stringify(arr));
  },

  /** Busca un usuario por nombre de usuario */
  findUsuarioByUsername(username) {
    return this.getUsuarios().find(u => u.username === username) || null;
  },

  /** Busca un usuario por ID */
  findUsuarioById(id) {
    return this.getUsuarios().find(u => u.id === id) || null;
  },

  /** Registra un nuevo usuario invitado */
  registrarUsuario(datos) {
    const usuarios = this.getUsuarios();
    // Verificar que el documento no esté ya registrado
    if (usuarios.find(u => u.documento === datos.documento)) {
      return { ok: false, msg: 'Ya existe un usuario con ese número de documento.' };
    }
    const nuevo = {
      id: 'usr_' + Date.now(),
      nombre: datos.nombre,
      documento: datos.documento,
      cargo: datos.cargo,
      area: datos.area,
      vinculacion: datos.vinculacion,
      sede: datos.sede,
      correo: datos.correo,
      tipoFormacion: datos.tipoFormacion,
      aceptaPrivacidad: datos.aceptaPrivacidad,
      username: datos.documento,       // el usuario inicia sesión con su documento
      password: datos.documento,       // contraseña inicial = documento
      rol: 'invitado',
      fechaRegistro: new Date().toISOString(),
      activo: true
    };
    usuarios.push(nuevo);
    this.setUsuarios(usuarios);
    // Inicializar progreso vacío
    this._initProgreso(nuevo.id);
    return { ok: true, usuario: nuevo };
  },

  /** Elimina un usuario (solo admin) */
  eliminarUsuario(id) {
    const usuarios = this.getUsuarios().filter(u => u.id !== id);
    this.setUsuarios(usuarios);
    localStorage.removeItem('sgsstdb_progreso_' + id);
  },

  /** Seed inicial: crea el usuario admin */
  _seedUsuarios() {
    const usuarios = [
      {
        id: 'admin_001',
        nombre: 'Administrador SG-SST',
        documento: 'admin',
        cargo: 'Profesional SST',
        area: 'Seguridad y Salud en el Trabajo',
        vinculacion: 'Planta',
        sede: 'Hospital San Rafael de Cáqueza',
        correo: 'sst@hospitaldecaqueza.gov.co',
        tipoFormacion: 'Inducción',
        aceptaPrivacidad: true,
        username: 'admin',
        password: 'admin2026',
        rol: 'admin',
        fechaRegistro: new Date().toISOString(),
        activo: true
      }
    ];
    this.setUsuarios(usuarios);
  },

  // ----------------------------------------------------------
  //  PROGRESO DE USUARIO
  // ----------------------------------------------------------

  /** Inicializa el progreso de un usuario nuevo */
  _initProgreso(userId) {
    const progreso = {
      userId,
      modulos: {}     // { [moduloId]: { pantallasVistas: [], aprobado: false, intentos: [], fechaAprobacion: null } }
    };
    localStorage.setItem('sgsstdb_progreso_' + userId, JSON.stringify(progreso));
  },

  /** Retorna el progreso de un usuario */
  getProgreso(userId) {
    const raw = localStorage.getItem('sgsstdb_progreso_' + userId);
    if (!raw) {
      this._initProgreso(userId);
      return this.getProgreso(userId);
    }
    return JSON.parse(raw);
  },

  /** Guarda el progreso de un usuario */
  setProgreso(userId, progreso) {
    localStorage.setItem('sgsstdb_progreso_' + userId, JSON.stringify(progreso));
  },

  /** Marca una pantalla como vista */
  marcarPantallaVista(userId, moduloId, pantallaIdx) {
    const prog = this.getProgreso(userId);
    if (!prog.modulos[moduloId]) {
      prog.modulos[moduloId] = { pantallasVistas: [], aprobado: false, intentos: [], fechaAprobacion: null };
    }
    if (!prog.modulos[moduloId].pantallasVistas.includes(pantallaIdx)) {
      prog.modulos[moduloId].pantallasVistas.push(pantallaIdx);
    }
    this.setProgreso(userId, prog);
  },

  /** Registra un intento de evaluación */
  registrarIntento(userId, moduloId, respuestas, aprobado) {
    const prog = this.getProgreso(userId);
    if (!prog.modulos[moduloId]) {
      prog.modulos[moduloId] = { pantallasVistas: [], aprobado: false, intentos: [], fechaAprobacion: null };
    }
    prog.modulos[moduloId].intentos.push({
      fecha: new Date().toISOString(),
      respuestas,
      aprobado
    });
    if (aprobado && !prog.modulos[moduloId].aprobado) {
      prog.modulos[moduloId].aprobado = true;
      prog.modulos[moduloId].fechaAprobacion = new Date().toISOString();
    }
    this.setProgreso(userId, prog);
    return prog;
  },

  /** Verifica si todos los módulos están aprobados */
  todoAprobado(userId) {
    const prog = this.getProgreso(userId);
    const modulos = this.getModulos();
    return modulos.every(m => prog.modulos[m.id]?.aprobado === true);
  },

  /** Verifica si un módulo está desbloqueado (anterior aprobado o es el primero) */
  moduloDesbloqueado(userId, moduloId) {
    const modulos = this.getModulos();
    const idx = modulos.findIndex(m => m.id === moduloId);
    if (idx === 0) return true;   // el primer módulo siempre está disponible
    const anterior = modulos[idx - 1];
    const prog = this.getProgreso(userId);
    return prog.modulos[anterior.id]?.aprobado === true;
  },

  // ----------------------------------------------------------
  //  MÓDULOS Y CONTENIDO
  // ----------------------------------------------------------

  /** Retorna todos los módulos */
  getModulos() {
    return JSON.parse(localStorage.getItem('sgsstdb_modulos') || '[]');
  },

  /** Guarda el array de módulos */
  setModulos(arr) {
    localStorage.setItem('sgsstdb_modulos', JSON.stringify(arr));
  },

  /** Retorna un módulo por ID */
  getModuloById(id) {
    return this.getModulos().find(m => m.id === id) || null;
  },

  /** Actualiza el contenido de un módulo (admin) */
  actualizarModulo(id, campos) {
    const modulos = this.getModulos();
    const idx = modulos.findIndex(m => m.id === id);
    if (idx === -1) return false;
    modulos[idx] = { ...modulos[idx], ...campos };
    this.setModulos(modulos);
    return true;
  },

  /** Seed: carga los 10 módulos con contenido y preguntas del guión */
  _seedModulos() {
    const modulos = [
      // -------------------------------------------------------
      // MÓDULO 1
      // -------------------------------------------------------
      {
        id: 'mod_1',
        numero: 1,
        titulo: 'Conoce nuestro SG-SST',
        descripcion: 'Comprende qué es el Sistema de Gestión de Seguridad y Salud en el Trabajo y por qué es fundamental para todos.',
        icono: '🏥',
        color: '#1565C0',
        pantallas: [
          {
            titulo: '¿Qué es el SG-SST?',
            contenido: 'El Sistema de Gestión de Seguridad y Salud en el Trabajo (SG-SST) es un sistema de gestión basado en la mejora continua para <strong>anticipar, reconocer, evaluar y controlar</strong> los riesgos que puedan afectar la seguridad y salud en el trabajo.',
            icono: '📋'
          },
          {
            titulo: '¿Para qué sirve?',
            contenido: 'Permite <strong>prevenir accidentes y enfermedades laborales</strong> mediante la identificación de peligros, la implementación de controles, la capacitación continua y el seguimiento permanente a las condiciones de trabajo.',
            icono: '🛡️'
          },
          {
            titulo: '¿Quién participa?',
            contenido: 'La gestión de la seguridad y salud en el trabajo es una responsabilidad compartida. La <strong>gerencia, el profesional SST, los líderes de área y los colaboradores</strong> tienen responsabilidades diferenciadas pero complementarias dentro del sistema.',
            icono: '👥'
          },
          {
            titulo: 'Normatividad esencial',
            contenido: 'El SG-SST en Colombia se rige por un marco normativo robusto: <ul class="screen-list"><li><strong>Ley 1562 de 2012</strong> – Sistema General de Riesgos Laborales</li><li><strong>Decreto 1072 de 2015</strong> – Decreto Único Reglamentario del Sector Trabajo</li><li><strong>Resolución 0312 de 2019</strong> – Estándares mínimos SG-SST</li><li><strong>Resolución 2400 de 1979</strong> – Estatuto de Seguridad Industrial</li><li><strong>Decreto 1295 de 1994</strong> – Sistema General de Riesgos Profesionales</li><li><strong>GTC 45</strong> – Identificación de peligros y valoración de riesgos</li></ul>',
            icono: '⚖️'
          }
        ],
        preguntas: [
          {
            id: 'p1_1',
            texto: '¿Cuál es el propósito principal del SG-SST?',
            opciones: [
              'Prevenir riesgos y proteger la salud de los trabajadores',
              'Registrar únicamente los accidentes ocurridos',
              'Reemplazar la atención médica de los empleados',
              'Aplicar sanciones disciplinarias al personal'
            ],
            correcta: 0,
            retroalimentacion: 'El SG-SST busca prevenir y controlar los riesgos para proteger la seguridad y salud de todos los trabajadores.'
          },
          {
            id: 'p1_2',
            texto: '¿Quién participa en la gestión del SG-SST?',
            opciones: [
              'Únicamente el área de SST',
              'Todos los integrantes según sus responsabilidades',
              'Solo la gerencia de la institución',
              'Exclusivamente los brigadistas de emergencias'
            ],
            correcta: 1,
            retroalimentacion: 'La gestión preventiva requiere la participación activa de todos los integrantes de la organización.'
          },
          {
            id: 'p1_3',
            texto: '¿Cuál de las siguientes normas regula el SG-SST en Colombia?',
            opciones: [
              'Decreto 1072 de 2015',
              'Ley 100 de 1993',
              'Decreto 2309 de 2002',
              'Resolución 1234 de 2010'
            ],
            correcta: 0,
            retroalimentacion: 'El Decreto 1072 de 2015 es el Decreto Único Reglamentario del Sector Trabajo y contiene las disposiciones del SG-SST.'
          },
          {
            id: 'p1_4',
            texto: 'El SG-SST se basa en el principio de:',
            opciones: [
              'Mejora continua',
              'Administración de sanciones',
              'Contratación externa de seguridad',
              'Supervisión policial'
            ],
            correcta: 0,
            retroalimentacion: 'El SG-SST se estructura sobre el ciclo PHVA (Planear-Hacer-Verificar-Actuar) como principio de mejora continua.'
          }
        ]
      },
      // -------------------------------------------------------
      // MÓDULO 2
      // -------------------------------------------------------
      {
        id: 'mod_2',
        numero: 2,
        titulo: 'Nuestro compromiso con la seguridad',
        descripcion: 'Conoce la política institucional de seguridad y salud en el trabajo y los compromisos de convivencia laboral.',
        icono: '🤝',
        color: '#2E7D32',
        pantallas: [
          {
            titulo: 'Política de SST',
            contenido: 'El Hospital San Rafael de Cáqueza y sus centros de salud adscritos se comprometen a: <ul class="screen-list"><li>Asignar los recursos necesarios para el SG-SST</li><li>Identificar, evaluar y controlar los peligros laborales</li><li>Prevenir accidentes y enfermedades laborales</li><li>Cumplir todos los requisitos legales aplicables</li><li>Mejorar continuamente el SG-SST</li></ul>',
            icono: '📜'
          },
          {
            titulo: 'Prevención del acoso laboral',
            contenido: 'La institución promueve un ambiente de <strong>respeto y dignidad</strong>. Los valores que guían la convivencia incluyen: comunicación asertiva, confidencialidad e imparcialidad. Se rechazan conductas como: maltrato, persecución, discriminación, entorpecimiento, inequidad y desprotección.',
            icono: '🤲'
          },
          {
            titulo: 'Prevención del consumo de sustancias',
            contenido: 'La política institucional <strong>prohíbe</strong> presentarse a trabajar bajo los efectos de alcohol u otras sustancias psicoactivas que afecten el desempeño. El hospital promueve la participación en programas de sensibilización y apoyo.',
            icono: '🚫'
          },
          {
            titulo: 'Compromiso cotidiano',
            contenido: 'Cada colaborador se compromete diariamente a: <ul class="screen-list"><li>Cumplir todos los procedimientos de seguridad establecidos</li><li>Reportar oportunamente cualquier riesgo identificado</li><li>Tratar respetuosamente a todas las personas</li><li>Participar activamente en las actividades de prevención</li></ul>',
            icono: '⭐'
          }
        ],
        preguntas: [
          {
            id: 'p2_1',
            texto: '¿Qué compromete principalmente la Política de SST del hospital?',
            opciones: [
              'Eliminar todas las capacitaciones del personal',
              'Identificar, evaluar y controlar los riesgos laborales',
              'No reportar los incidentes menores',
              'Delegar toda la responsabilidad al trabajador'
            ],
            correcta: 1,
            retroalimentacion: 'La política de SST contempla la asignación de recursos, la prevención y el control de peligros como compromisos centrales.'
          },
          {
            id: 'p2_2',
            texto: '¿Qué conducta es coherente con la política de convivencia del hospital?',
            opciones: [
              'Maltrato verbal hacia compañeros',
              'Discriminación por cargo o área',
              'Comunicación respetuosa y asertiva',
              'Ocultar quejas ante situaciones de acoso'
            ],
            correcta: 2,
            retroalimentacion: 'El respeto y la comunicación asertiva son pilares del compromiso institucional con la convivencia laboral.'
          },
          {
            id: 'p2_3',
            texto: 'Según la política institucional, ¿qué está prohibido?',
            opciones: [
              'Participar en capacitaciones',
              'Reportar condiciones inseguras',
              'Presentarse bajo efectos de alcohol o sustancias psicoactivas',
              'Usar elementos de protección personal'
            ],
            correcta: 2,
            retroalimentacion: 'La institución prohíbe presentarse a trabajar bajo efectos de sustancias que comprometan el desempeño y la seguridad.'
          },
          {
            id: 'p2_4',
            texto: '¿Cuál es un ejemplo de compromiso cotidiano con la seguridad?',
            opciones: [
              'Ignorar los procedimientos si generan demoras',
              'Reportar oportunamente cualquier riesgo identificado',
              'Esperar a que otro reporte los problemas',
              'Saltarse la inducción si ya tiene experiencia'
            ],
            correcta: 1,
            retroalimentacion: 'El reporte oportuno de riesgos es uno de los compromisos cotidianos fundamentales de cada colaborador.'
          }
        ]
      },
      // -------------------------------------------------------
      // MÓDULO 3
      // -------------------------------------------------------
      {
        id: 'mod_3',
        numero: 3,
        titulo: 'Trabajamos por un entorno seguro',
        descripcion: 'Comprende los objetivos del SG-SST y cómo contribuyes a un ambiente de trabajo seguro y saludable.',
        icono: '🏗️',
        color: '#6A1B9A',
        pantallas: [
          {
            titulo: 'Prevenir',
            contenido: 'El objetivo principal es <strong>reducir accidentes y enfermedades laborales</strong>, priorizando los riesgos más frecuentes en el sector salud: <ul class="screen-list"><li>Riesgos biológicos</li><li>Riesgos biomecánicos</li><li>Riesgos psicosociales</li><li>Riesgos químicos</li><li>Riesgos de seguridad</li></ul>',
            icono: '🛡️'
          },
          {
            titulo: 'Autocuidado',
            contenido: 'Fortalecer la <strong>cultura de prevención</strong> mediante acciones continuas de: capacitación, inducción, reinducción y sensibilización. El autocuidado empieza por reconocer los propios riesgos y adoptar las medidas adecuadas.',
            icono: '💪'
          },
          {
            titulo: 'Cumplimiento normativo',
            contenido: 'El hospital está comprometido con el <strong>cumplimiento de la normativa legal</strong> aplicable al sector salud, incluyendo todas las disposiciones en materia de seguridad y salud en el trabajo vigentes en Colombia.',
            icono: '⚖️'
          },
          {
            titulo: 'Control y mejora',
            contenido: 'El sistema busca constantemente identificar y controlar peligros en los procesos asistenciales, administrativos y de apoyo. Los mecanismos de mejora incluyen: <ul class="screen-list"><li>Auditorías internas y externas</li><li>Investigación de incidentes y accidentes</li><li>Seguimiento a indicadores de gestión</li><li>Implementación de acciones correctivas</li></ul>',
            icono: '📈'
          }
        ],
        preguntas: [
          {
            id: 'p3_1',
            texto: '¿Qué aporta el reporte oportuno de un peligro identificado?',
            opciones: [
              'Ayuda a identificar y controlar el riesgo',
              'Evita que se tomen medidas de prevención',
              'Reemplaza los controles de seguridad existentes',
              'Cancela las inspecciones programadas'
            ],
            correcta: 0,
            retroalimentacion: 'El reporte oportuno es la base para gestionar el riesgo: sin identificación no hay control posible.'
          },
          {
            id: 'p3_2',
            texto: '¿Para qué sirven las capacitaciones en SST?',
            opciones: [
              'Solo para registrar la asistencia del personal',
              'Para fortalecer la prevención y el autocuidado',
              'Para sustituir el uso de EPP',
              'Para eliminar responsabilidades del trabajador'
            ],
            correcta: 1,
            retroalimentacion: 'La formación en SST fortalece la cultura preventiva y el autocuidado de cada trabajador.'
          },
          {
            id: 'p3_3',
            texto: '¿Cuál de los siguientes es un riesgo prioritario en el sector salud?',
            opciones: [
              'Riesgo de tránsito aéreo',
              'Riesgo biológico',
              'Riesgo de avalancha',
              'Riesgo volcánico'
            ],
            correcta: 1,
            retroalimentacion: 'Los riesgos biológicos, biomecánicos y psicosociales son prioritarios en el sector salud.'
          },
          {
            id: 'p3_4',
            texto: '¿Qué herramienta usa el SG-SST para mejorar continuamente?',
            opciones: [
              'Sanciones disciplinarias únicamente',
              'Auditorías, investigación e indicadores de gestión',
              'Solo la observación informal',
              'Cambio frecuente de personal'
            ],
            correcta: 1,
            retroalimentacion: 'Las auditorías, la investigación de eventos y el seguimiento a indicadores son mecanismos clave de mejora.'
          }
        ]
      },
      // -------------------------------------------------------
      // MÓDULO 4
      // -------------------------------------------------------
      {
        id: 'mod_4',
        numero: 4,
        titulo: 'La seguridad es responsabilidad de todos',
        descripcion: 'Reconoce el papel de cada actor en el SG-SST: gerencia, SST, líderes y colaboradores.',
        icono: '👷',
        color: '#E65100',
        pantallas: [
          {
            titulo: 'Gerencia',
            contenido: 'La gerencia es responsable de <strong>garantizar la implementación, los recursos y la mejora continua</strong> del SG-SST. Sus compromisos incluyen: definir la política, asignar presupuesto, designar el responsable SST y participar activamente en la revisión del sistema.',
            icono: '🏛️'
          },
          {
            titulo: 'Profesional SST',
            contenido: 'El profesional de SST <strong>planea, ejecuta, evalúa y mejora</strong> el sistema. Es responsable de coordinar la capacitación, liderar la identificación de peligros, investigar eventos y asegurar el cumplimiento normativo.',
            icono: '🔬'
          },
          {
            titulo: 'Líderes de área',
            contenido: 'Los líderes de área deben: <ul class="screen-list"><li>Velar por el cumplimiento de las normas de seguridad</li><li>Promover el uso adecuado de EPP en su equipo</li><li>Reportar oportunamente las condiciones inseguras</li><li>Facilitar la participación de su equipo en SST</li></ul>',
            icono: '👔'
          },
          {
            titulo: 'Colaboradores y participación',
            contenido: 'Todos los colaboradores deben: <ul class="screen-list"><li>Cumplir las normas y procedimientos de seguridad</li><li>Usar correctamente los EPP asignados</li><li>Reportar accidentes, incidentes y condiciones inseguras</li><li>Participar en la identificación de peligros</li><li>Proponer mejoras para el SG-SST</li></ul>',
            icono: '👥'
          }
        ],
        preguntas: [
          {
            id: 'p4_1',
            texto: 'Si usted identifica una condición insegura en su área, ¿qué debe hacer?',
            opciones: [
              'Esperar a que solo la gerencia la resuelva',
              'Reportarla por el canal definido a quien corresponde',
              'Comunicársela únicamente a la ARL',
              'No hacer nada si no le parece grave'
            ],
            correcta: 1,
            retroalimentacion: 'El reporte oportuno por el canal correcto es parte fundamental de la prevención.'
          },
          {
            id: 'p4_2',
            texto: '¿La identificación de peligros corresponde únicamente al área de SST?',
            opciones: [
              'Sí, solo SST tiene esa responsabilidad',
              'No, requiere la participación de todos los trabajadores',
              'Solo le corresponde a los visitantes externos',
              'Solo al COPASST en sus reuniones mensuales'
            ],
            correcta: 1,
            retroalimentacion: 'La participación de los trabajadores es esencial para una identificación de peligros completa y oportuna.'
          },
          {
            id: 'p4_3',
            texto: '¿Cuál es la responsabilidad principal de los líderes de área en SST?',
            opciones: [
              'Realizar exámenes médicos al personal',
              'Velar por el cumplimiento de normas y promover el uso de EPP',
              'Diseñar la política institucional de SST',
              'Investigar los accidentes de otras áreas'
            ],
            correcta: 1,
            retroalimentacion: 'Los líderes velan por las normas de su equipo, promueven EPP y reportan condiciones inseguras.'
          },
          {
            id: 'p4_4',
            texto: '¿Qué debe hacer el profesional SST ante un evento de accidente?',
            opciones: [
              'Esperar el informe de la ARL antes de actuar',
              'Liderar la investigación e implementar acciones correctivas',
              'Despedir al trabajador accidentado',
              'Ocultar el evento para no afectar las estadísticas'
            ],
            correcta: 1,
            retroalimentacion: 'El profesional SST coordina la investigación del evento y propone acciones para evitar su recurrencia.'
          }
        ]
      },
      // -------------------------------------------------------
      // MÓDULO 5
      // -------------------------------------------------------
      {
        id: 'mod_5',
        numero: 5,
        titulo: 'Tu voz cuenta: comités',
        descripcion: 'Conoce el COPASST y el Comité de Convivencia Laboral, sus funciones y cómo participar.',
        icono: '🗣️',
        color: '#00695C',
        pantallas: [
          {
            titulo: 'COPASST',
            contenido: 'El <strong>Comité Paritario de Seguridad y Salud en el Trabajo (COPASST)</strong> es un órgano paritario (igual número de representantes de empleados y empleadores) que: <ul class="screen-list"><li>Apoya y vigila el SG-SST</li><li>Promueve acciones de prevención</li><li>Participa en inspecciones e investigaciones</li><li>Propone mejoras al sistema</li></ul>',
            icono: '⚙️'
          },
          {
            titulo: 'Comité de Convivencia Laboral',
            contenido: 'El <strong>Comité de Convivencia Laboral (CCL)</strong> es una instancia preventiva, orientadora y canalizadora de situaciones de convivencia. <strong>Importante:</strong> el CCL no determina judicialmente si existe o no acoso laboral; su función es preventiva y de apoyo.',
            icono: '🤝'
          },
          {
            titulo: 'Integrantes y vigencias',
            contenido: 'Ambos comités cuentan con representantes de los trabajadores y de la empresa, elegidos por votación. Para conocer los integrantes vigentes del COPASST y del CCL en tu sede, consulta con el área de SST o en los tableros informativos institucionales. Los períodos son renovados periódicamente según la normativa.',
            icono: '📋'
          },
          {
            titulo: 'Cómo contactarlos',
            contenido: 'Para comunicarte con los comités: <ul class="screen-list"><li>Consulta al área de <strong>Seguridad y Salud en el Trabajo</strong> de tu sede</li><li>Revisa los <strong>tableros informativos</strong> con datos de contacto vigentes</li><li>Ante una situación de presunto acoso, existe una <strong>ruta diferenciada y confidencial</strong></li><li>Para reportes de seguridad, utiliza los canales oficiales del SG-SST</li></ul>',
            icono: '📞'
          }
        ],
        preguntas: [
          {
            id: 'p5_1',
            texto: '¿Qué comité recibe propuestas sobre seguridad y salud laboral?',
            opciones: [
              'COPASST',
              'Comité de cafetería',
              'Comité editorial',
              'Ningún comité tiene esa función'
            ],
            correcta: 0,
            retroalimentacion: 'El COPASST participa activamente en la prevención y propone mejoras al SG-SST.'
          },
          {
            id: 'p5_2',
            texto: '¿Cuál es la función principal del Comité de Convivencia Laboral?',
            opciones: [
              'Declarar judicialmente si hubo acoso laboral',
              'Promover la convivencia y tramitar asuntos de su competencia',
              'Entregar los elementos de protección personal',
              'Realizar exámenes médicos al personal'
            ],
            correcta: 1,
            retroalimentacion: 'Su función es preventiva y orientadora; no tiene facultades judiciales.'
          },
          {
            id: 'p5_3',
            texto: '¿Cómo está conformado el COPASST?',
            opciones: [
              'Solo por representantes de la gerencia',
              'Solo por representantes de los trabajadores',
              'De forma paritaria: empleados y empleadores en igual número',
              'Por contratistas externos de seguridad'
            ],
            correcta: 2,
            retroalimentacion: 'El COPASST es paritario: igual representación de trabajadores y empleadores.'
          },
          {
            id: 'p5_4',
            texto: '¿Qué debe hacer un trabajador que enfrenta una situación de acoso laboral?',
            opciones: [
              'Ignorar la situación y seguir trabajando',
              'Publicarlo en redes sociales',
              'Acudir al Comité de Convivencia Laboral por la ruta confidencial',
              'Resolver el conflicto por sus propios medios sin reportarlo'
            ],
            correcta: 2,
            retroalimentacion: 'El CCL tiene una ruta confidencial y diferenciada para tramitar estas situaciones.'
          }
        ]
      },
      // -------------------------------------------------------
      // MÓDULO 6
      // -------------------------------------------------------
      {
        id: 'mod_6',
        numero: 6,
        titulo: 'Reconoce los peligros, previene los riesgos',
        descripcion: 'Aprende a identificar los tipos de peligros presentes en el ambiente hospitalario y las medidas preventivas.',
        icono: '⚠️',
        color: '#C62828',
        pantallas: [
          {
            titulo: 'Identificación de peligros',
            contenido: 'Identificar un peligro significa <strong>reconocer fuentes, situaciones o actos</strong> que pueden causar daño. En el hospital esto aplica a procesos asistenciales, administrativos y de apoyo. Es fundamental identificar también qué actividades y personas están expuestas.',
            icono: '🔍'
          },
          {
            titulo: 'Tipos de peligros en el hospital',
            contenido: 'Los principales peligros en nuestro entorno incluyen: <ul class="screen-list"><li>🦠 <strong>Biológicos:</strong> fluidos corporales, material cortopunzante</li><li>🧪 <strong>Químicos:</strong> desinfectantes, medicamentos</li><li>🔊 <strong>Físicos:</strong> ruido, radiaciones ionizantes</li><li>💪 <strong>Biomecánicos:</strong> movilización de pacientes, posturas</li><li>🏚️ <strong>Locativos:</strong> pisos húmedos, espacios reducidos</li><li>⚡ <strong>Eléctricos:</strong> cables expuestos, equipos en mal estado</li><li>🧠 <strong>Psicosociales:</strong> carga laboral, turnos nocturnos</li></ul>',
            icono: '📊'
          },
          {
            titulo: 'Actos y condiciones inseguras',
            contenido: '<strong>Acto inseguro:</strong> acción humana que aumenta la probabilidad de que ocurra un accidente. Ejemplo: no realizar higiene de manos antes de un procedimiento.<br><br><strong>Condición insegura:</strong> característica peligrosa de instalaciones, equipos o procesos. Ejemplos: cables expuestos en el piso o pisos húmedos sin señalización.',
            icono: '⚠️'
          },
          {
            titulo: 'Medidas preventivas clave',
            contenido: 'Las principales medidas de prevención incluyen: <ul class="screen-list"><li>🖐️ <strong>Higiene de manos</strong> según los 5 momentos</li><li>🧤 <strong>Precauciones estándar</strong> en todo procedimiento</li><li>🦺 <strong>EPP adecuado</strong> según la tarea y el riesgo</li><li>💉 <strong>Manejo seguro</strong> de cortopunzantes</li><li>📢 <strong>Reporte</strong> inmediato de daños y condiciones inseguras</li><li>✅ <strong>Aplicación</strong> de los controles definidos</li></ul>',
            icono: '✅'
          }
        ],
        preguntas: [
          {
            id: 'p6_1',
            texto: '¿Qué tipo de peligro representa un pinchazo accidental con una aguja usada?',
            opciones: [
              'Peligro biológico',
              'Peligro locativo',
              'Peligro por ruido',
              'Peligro por iluminación'
            ],
            correcta: 0,
            retroalimentacion: 'Un pinchazo con aguja usada implica posible exposición a material biológico (sangre, fluidos), que es un peligro biológico.'
          },
          {
            id: 'p6_2',
            texto: '¿Qué debe hacer un trabajador al encontrar un cable deteriorado en el piso?',
            opciones: [
              'Seguir utilizándolo con cuidado',
              'Cubrirlo con cinta sin autorización',
              'Evitar su uso y reportarlo inmediatamente',
              'Ignorarlo si no está en su área directa'
            ],
            correcta: 2,
            retroalimentacion: 'Ante una condición insegura, debe evitarse la exposición y reportarse para que se gestione el control adecuado.'
          },
          {
            id: 'p6_3',
            texto: '¿Cuál de estas es una acción de prevención del riesgo biológico?',
            opciones: [
              'Reutilizar guantes entre pacientes',
              'Seguir las precauciones estándar y realizar higiene de manos',
              'Manipular cortopunzantes con una sola mano para ahorrar tiempo',
              'No usar EPP si el procedimiento es rápido'
            ],
            correcta: 1,
            retroalimentacion: 'Las precauciones estándar y la higiene de manos son las medidas más efectivas contra el riesgo biológico.'
          },
          {
            id: 'p6_4',
            texto: '¿Cuál es la diferencia entre un acto inseguro y una condición insegura?',
            opciones: [
              'No hay diferencia, son lo mismo',
              'El acto inseguro es una acción humana que aumenta el riesgo; la condición insegura es un estado peligroso del entorno',
              'El acto inseguro solo aplica a médicos; la condición insegura solo a auxiliares',
              'La condición insegura solo ocurre en urgencias'
            ],
            correcta: 1,
            retroalimentacion: 'Los actos inseguros son comportamientos; las condiciones inseguras son características del ambiente o los equipos.'
          }
        ]
      },
      // -------------------------------------------------------
      // MÓDULO 7
      // -------------------------------------------------------
      {
        id: 'mod_7',
        numero: 7,
        titulo: 'Aprende a reportar y actuar',
        descripcion: 'Conoce los procedimientos para reportar accidentes, incidentes y enfermedades laborales de forma oportuna.',
        icono: '📢',
        color: '#283593',
        pantallas: [
          {
            titulo: 'Accidente de trabajo',
            contenido: 'Un <strong>accidente de trabajo</strong> es todo suceso repentino que sobreviene por causa o con ocasión del trabajo, que produce en el trabajador una <strong>lesión orgánica, perturbación funcional o psiquiátrica, invalidez o muerte</strong>. También se considera accidente el ocurrido durante el desplazamiento directo al lugar de trabajo.',
            icono: '🚨'
          },
          {
            titulo: 'Incidente de trabajo',
            contenido: 'Un <strong>incidente de trabajo</strong> es un evento relacionado con el trabajo que tiene el potencial de ser un accidente, pero que <strong>no produce lesión</strong> en las personas. Los incidentes deben reportarse porque permiten identificar y corregir condiciones peligrosas antes de que ocurra un accidente.',
            icono: '⚠️'
          },
          {
            titulo: 'Enfermedad laboral',
            contenido: 'La <strong>enfermedad laboral</strong> es aquella contraída como resultado directo de la exposición a factores de riesgo inherentes a la actividad laboral o al medio de trabajo. El diagnóstico y determinación de la enfermedad laboral corresponde a la EPS o a la ARL.',
            icono: '🏥'
          },
          {
            titulo: 'Ruta de reporte ante un evento',
            contenido: 'Pasos a seguir ante un accidente o incidente: <ol class="screen-list"><li>🏥 <strong>Priorizar la atención</strong> del lesionado</li><li>📞 <strong>Informar de inmediato</strong> al jefe directo y al área de SST</li><li>📝 <strong>Registrar el evento</strong> con fecha, hora, lugar y circunstancias</li><li>📋 <strong>Gestionar el reporte</strong> a la ARL (FURAT en máximo 2 días hábiles)</li><li>🔍 <strong>Seguimiento</strong> a las acciones correctivas</li></ol>',
            icono: '📋'
          },
          {
            titulo: 'Exposición biológica',
            contenido: 'Ante una <strong>exposición accidental a material biológico</strong> (pinchazo, salpicadura): <ul class="screen-list"><li>Lava inmediatamente la zona con agua y jabón abundante</li><li>No restriegues ni exprimas la herida</li><li>Notifica de inmediato al jefe y acude a urgencias</li><li>Sigue el <strong>protocolo institucional de exposición biológica</strong> de tu sede</li><li>El reporte oportuno es fundamental para el seguimiento médico</li></ul>',
            icono: '🩺'
          }
        ],
        preguntas: [
          {
            id: 'p7_1',
            texto: '¿Qué debe hacer primero ante un pinchazo accidental con material biológico?',
            opciones: [
              'Esperar al día siguiente para reportarlo',
              'Lavar la zona, notificar al jefe y seguir el protocolo institucional',
              'No comunicarlo para no generar alarma',
              'Solo cambiar los guantes y continuar trabajando'
            ],
            correcta: 1,
            retroalimentacion: 'La exposición biológica requiere actuación inmediata: lavar, notificar y seguir el protocolo para garantizar el seguimiento médico.'
          },
          {
            id: 'p7_2',
            texto: '¿Debe reportarse un incidente aunque no haya producido ninguna lesión?',
            opciones: [
              'No, solo se reportan los accidentes con lesión',
              'Solo si hay incapacidad médica de por medio',
              'Sí, porque permite prevenir accidentes futuros',
              'Solo si lo solicita expresamente la ARL'
            ],
            correcta: 2,
            retroalimentacion: 'Los incidentes permiten identificar y corregir condiciones inseguras antes de que ocurra un accidente.'
          },
          {
            id: 'p7_3',
            texto: '¿Cuál es el plazo para reportar un accidente de trabajo a la ARL?',
            opciones: [
              'En los próximos 30 días',
              'No tiene plazo definido',
              'Dentro de los dos días hábiles siguientes',
              'Al finalizar el mes'
            ],
            correcta: 2,
            retroalimentacion: 'El FURAT (Formulario Único de Reporte de Accidente de Trabajo) debe diligenciarse en máximo 2 días hábiles.'
          },
          {
            id: 'p7_4',
            texto: '¿Qué es una enfermedad laboral?',
            opciones: [
              'Cualquier enfermedad que padezca un trabajador',
              'Una enfermedad contraída por exposición a factores de riesgo del trabajo',
              'Solo las enfermedades infectocontagiosas',
              'Las enfermedades que causan incapacidad permanente'
            ],
            correcta: 1,
            retroalimentacion: 'La enfermedad laboral es el resultado directo de la exposición a factores de riesgo del trabajo; su determinación la hace la EPS o la ARL.'
          }
        ]
      },
      // -------------------------------------------------------
      // MÓDULO 8
      // -------------------------------------------------------
      {
        id: 'mod_8',
        numero: 8,
        titulo: 'Preparados para actuar',
        descripcion: 'Conoce cómo responder ante una emergencia: evacuación, brigadistas y recursos disponibles.',
        icono: '🚒',
        color: '#BF360C',
        pantallas: [
          {
            titulo: '¿Qué es una emergencia?',
            contenido: 'Una <strong>emergencia</strong> es cualquier situación que amenaza la vida de las personas, la integridad de las instalaciones o la continuidad de la operación del hospital, y que exige una <strong>respuesta organizada, oportuna y coordinada</strong>. Puede ser: incendio, sismo, derrame de sustancias, amenaza de bomba, entre otras.',
            icono: '🆘'
          },
          {
            titulo: '¿Qué hacer ante una emergencia?',
            contenido: 'Los pasos básicos ante cualquier emergencia son: <ol class="screen-list"><li>🧘 <strong>Mantener la calma</strong> y no generar pánico</li><li>📢 <strong>Activar el aviso institucional</strong> de emergencia</li><li>👂 <strong>Seguir las instrucciones</strong> de los brigadistas y líderes de evacuación</li><li>🚫 <strong>Evitar exposición innecesaria</strong> al riesgo</li><li>🏃 <strong>Evacuar</strong> si se ordena, siguiendo las rutas señalizadas</li></ol>',
            icono: '🚨'
          },
          {
            titulo: 'Recursos disponibles',
            contenido: 'El hospital cuenta con recursos para atender emergencias: <ul class="screen-list"><li>🧯 <strong>Extintores:</strong> ubicados estratégicamente por piso y área</li><li>🩺 <strong>Botiquines de primeros auxilios</strong> en cada área</li><li>🛏️ <strong>Camillas de evacuación</strong> para traslado de pacientes</li><li>🔔 <strong>Sistema de alarmas</strong> contra incendio</li><li>💡 <strong>Iluminación de emergencia</strong> en rutas de evacuación</li></ul><p>Consulta la ubicación exacta de estos recursos en tu sede.</p>',
            icono: '🛠️'
          },
          {
            titulo: 'Brigadistas',
            contenido: 'Los <strong>brigadistas</strong> son trabajadores capacitados para atender emergencias. Sus funciones son: <ul class="screen-list"><li>Liderar la evacuación del personal y pacientes</li><li>Brindar primeros auxilios básicos</li><li>Operar extintores en caso de incendio</li><li>Coordinar con los servicios de emergencia externos</li></ul><p>Identifica a los brigadistas de tu sede: llevan chaleco o brazalete distintivo.</p>',
            icono: '🦺'
          },
          {
            titulo: 'Evacuación',
            contenido: 'Para una evacuación segura: <ul class="screen-list"><li>Conoce de antemano las <strong>rutas de evacuación</strong> de tu área</li><li>Identifica las <strong>salidas de emergencia</strong> más cercanas</li><li>Localiza el <strong>punto de encuentro</strong> establecido para tu sede</li><li>🚫 <strong>Nunca uses el ascensor</strong> durante una evacuación</li><li>Ayuda a quienes lo necesiten sin ponerte en riesgo</li><li>Espera instrucciones antes de reingresar al edificio</li></ul>',
            icono: '🏃'
          }
        ],
        preguntas: [
          {
            id: 'p8_1',
            texto: '¿Qué debe hacer ante una orden de evacuación?',
            opciones: [
              'Ignorarla si está terminando una tarea importante',
              'Seguir las rutas señalizadas e instrucciones de los brigadistas',
              'Buscar sus pertenencias antes de salir',
              'Usar el ascensor para evacuar más rápido'
            ],
            correcta: 1,
            retroalimentacion: 'Ante una evacuación se debe seguir el procedimiento establecido para la sede sin demora y por las rutas señalizadas.'
          },
          {
            id: 'p8_2',
            texto: '¿Dónde se debe identificar el punto de encuentro en caso de evacuación?',
            opciones: [
              'En el plano y la señalización de la sede',
              'En las redes sociales del hospital',
              'En cualquier lugar abierto disponible',
              'Solo la gerencia conoce esa información'
            ],
            correcta: 0,
            retroalimentacion: 'El punto de encuentro está indicado en los planos y la señalización visible de cada sede.'
          },
          {
            id: 'p8_3',
            texto: '¿Cuál es la función principal de los brigadistas?',
            opciones: [
              'Realizar exámenes médicos en emergencias',
              'Liderar evacuaciones, brindar primeros auxilios y operar extintores',
              'Administrar los medicamentos del servicio',
              'Reemplazar a los médicos en urgencias'
            ],
            correcta: 1,
            retroalimentacion: 'Los brigadistas lideran evacuaciones, brindan primeros auxilios y coordinan la respuesta ante emergencias.'
          },
          {
            id: 'p8_4',
            texto: '¿Cuál es el primer paso ante cualquier emergencia?',
            opciones: [
              'Grabar la situación con el celular',
              'Llamar a familiares para avisarles',
              'Mantener la calma y activar el aviso institucional',
              'Continuar trabajando para no abandonar al paciente'
            ],
            correcta: 2,
            retroalimentacion: 'Mantener la calma y activar el sistema de alerta institucional son los primeros pasos para una respuesta organizada.'
          }
        ]
      },
      // -------------------------------------------------------
      // MÓDULO 9
      // -------------------------------------------------------
      {
        id: 'mod_9',
        numero: 9,
        titulo: 'Cuidamos tu salud',
        descripcion: 'Comprende los programas de medicina preventiva y del trabajo, exámenes ocupacionales y seguimiento.',
        icono: '🩺',
        color: '#00796B',
        pantallas: [
          {
            titulo: 'Medicina preventiva y del trabajo',
            contenido: 'La <strong>medicina preventiva y del trabajo</strong> comprende todas las acciones de promoción, prevención y vigilancia de la salud directamente relacionadas con las condiciones laborales. Su objetivo es proteger la salud de los trabajadores, detectar tempranamente alteraciones y orientar las decisiones preventivas del SG-SST.',
            icono: '❤️'
          },
          {
            titulo: 'Evaluaciones médicas ocupacionales',
            contenido: 'Las evaluaciones ocupacionales son exámenes que se realizan según los riesgos de cada cargo. Los tipos incluyen: <ul class="screen-list"><li>🔑 <strong>Ingreso:</strong> al vincularse a la institución</li><li>📅 <strong>Periódicas:</strong> durante la permanencia, según periodicidad definida</li><li>🚪 <strong>Egreso:</strong> al terminar el vínculo laboral</li><li>🔄 <strong>Post-incapacidad:</strong> al reintegrarse tras una incapacidad prolongada</li></ul><p>La institución te informará oportunamente cuándo y cómo realizarlos.</p>',
            icono: '🩻'
          },
          {
            titulo: 'Recomendaciones y restricciones',
            contenido: 'El médico laboral puede emitir <strong>recomendaciones o restricciones</strong> según el estado de salud del trabajador. Estas medidas: <ul class="screen-list"><li>Buscan proteger tu salud y la de los pacientes</li><li>Deben implementarse de forma oportuna</li><li>Se manejan con <strong>estricta confidencialidad</strong> del diagnóstico clínico</li><li>Solo se comunica al jefe lo necesario para adaptar las tareas</li></ul>',
            icono: '📋'
          },
          {
            titulo: 'Seguimiento SST',
            contenido: 'El área de SST realiza el <strong>seguimiento</strong> a la implementación de recomendaciones médicas, controles preventivos y medidas de protección. Este acompañamiento busca: <ul class="screen-list"><li>Verificar que las medidas se implementen correctamente</li><li>Ajustar condiciones de trabajo cuando sea necesario</li><li>Realizar seguimiento a casos de reintegro laboral</li><li>Garantizar la efectividad de los controles</li></ul>',
            icono: '📊'
          },
          {
            titulo: 'Programas de promoción de la salud',
            contenido: 'El hospital promueve la salud de sus colaboradores mediante: <ul class="screen-list"><li>🧠 Programas de <strong>salud mental</strong> y manejo del estrés</li><li>💪 Prevención de riesgos <strong>biomecánicos</strong> y pausas activas</li><li>🦠 Vigilancia epidemiológica de riesgos prioritarios</li><li>🧘 Actividades de <strong>autocuidado</strong> y bienestar</li><li>📚 Capacitaciones en estilos de vida saludable</li></ul>',
            icono: '🌟'
          }
        ],
        preguntas: [
          {
            id: 'p9_1',
            texto: '¿Para qué sirven las evaluaciones médicas ocupacionales?',
            opciones: [
              'Para evaluar la salud del trabajador en relación con los riesgos laborales',
              'Para reemplazar la inducción al cargo',
              'Para difundir los diagnósticos del trabajador entre sus compañeros',
              'Para aplicar sanciones disciplinarias'
            ],
            correcta: 0,
            retroalimentacion: 'Las evaluaciones ocupacionales orientan las decisiones preventivas de salud del trabajador en relación con su cargo y riesgos.'
          },
          {
            id: 'p9_2',
            texto: '¿Qué debe hacerse con las recomendaciones médico-laborales?',
            opciones: [
              'Ignorarlas si no impiden trabajar con normalidad',
              'Publicar el diagnóstico en el tablero del servicio',
              'Implementarlas con confidencialidad y hacer seguimiento',
              'Divulgarlas a todos los compañeros del área'
            ],
            correcta: 2,
            retroalimentacion: 'Las recomendaciones deben implementarse protegiendo la confidencialidad del diagnóstico clínico del trabajador.'
          },
          {
            id: 'p9_3',
            texto: '¿Cuándo se realiza la evaluación médica de ingreso?',
            opciones: [
              'Después de 6 meses de trabajar en la institución',
              'Al vincularse a la institución, antes de iniciar labores',
              'Solo cuando el trabajador lo solicita',
              'Al finalizar el contrato'
            ],
            correcta: 1,
            retroalimentacion: 'La evaluación de ingreso se realiza al vincularse a la institución para establecer condiciones de salud de base.'
          },
          {
            id: 'p9_4',
            texto: '¿Cuál de los siguientes es un programa de promoción de salud para trabajadores?',
            opciones: [
              'Plan de evacuación de emergencias',
              'Programa de pausas activas y prevención biomecánica',
              'Protocolo de manejo de residuos',
              'Manual de funciones del cargo'
            ],
            correcta: 1,
            retroalimentacion: 'Los programas de pausas activas y prevención biomecánica son parte de la promoción de la salud para trabajadores del sector salud.'
          }
        ]
      },
      // -------------------------------------------------------
      // MÓDULO 10
      // -------------------------------------------------------
      {
        id: 'mod_10',
        numero: 10,
        titulo: 'Participa y construye prevención',
        descripcion: 'Conoce los canales de comunicación del SG-SST y cómo tu participación activa fortalece la seguridad.',
        icono: '🌱',
        color: '#1B5E20',
        pantallas: [
          {
            titulo: 'Canales SST',
            contenido: 'El SG-SST cuenta con <strong>canales oficiales</strong> para que todos puedan reportar: <ul class="screen-list"><li>📢 <strong>Reportes de incidentes y accidentes</strong>: a través del jefe inmediato y el área de SST</li><li>⚠️ <strong>Condiciones inseguras</strong>: usando los formatos y canales definidos por la institución</li><li>💡 <strong>Sugerencias de mejora</strong>: pueden presentarse directamente al COPASST</li><li>📋 Consulta los <strong>canales vigentes</strong> en los tableros informativos de tu sede</li></ul>',
            icono: '📡'
          },
          {
            titulo: 'Participación activa',
            contenido: 'Tu participación activa en el SG-SST es fundamental. Puedes contribuir mediante: <ul class="screen-list"><li>✅ <strong>Reportes oportunos</strong> de incidentes, accidentes y condiciones inseguras</li><li>📚 <strong>Asistencia</strong> a capacitaciones y actividades de SST</li><li>🔍 <strong>Participación</strong> en inspecciones de seguridad</li><li>💬 <strong>Propuestas de mejora</strong> para los procesos de tu área</li><li>🤝 Apoyo a los <strong>compañeros</strong> en prácticas seguras</li></ul>',
            icono: '🙋'
          },
          {
            titulo: 'Seguimiento a los reportes',
            contenido: 'El área de SST garantiza que todos los reportes reciban atención: <ul class="screen-list"><li>🔁 <strong>Recepción</strong> del reporte por parte de SST</li><li>🔍 <strong>Gestión</strong> e investigación cuando corresponde</li><li>📧 <strong>Respuesta</strong> al reportante sobre las acciones tomadas</li><li>🔒 <strong>Cierre</strong> del caso con evidencia de las medidas implementadas</li></ul><p>Tu reporte <strong>siempre es importante</strong> y contribuye a la mejora continua.</p>',
            icono: '🔄'
          },
          {
            titulo: 'Tu compromiso final',
            contenido: '<div style="text-align:center;padding:1rem 0"><p style="font-size:1.1em">Al completar esta inducción, te comprometes a:</p></div><ul class="screen-list"><li>✅ <strong>Aplicar</strong> los controles y medidas preventivas en tu trabajo diario</li><li>📢 <strong>Reportar</strong> oportunamente los riesgos, incidentes y condiciones inseguras</li><li>🤝 <strong>Participar</strong> activamente en las actividades del SG-SST</li><li>🌱 <strong>Contribuir</strong> a construir una cultura de prevención en el hospital</li><li>🏥 <strong>Proteger</strong> tu salud, la de tus compañeros y la de los pacientes</li></ul>',
            icono: '🏆'
          }
        ],
        preguntas: [
          {
            id: 'p10_1',
            texto: '¿Para qué sirve el canal SST del hospital?',
            opciones: [
              'Para comunicar riesgos y situaciones de prevención',
              'Para solicitar vacaciones o permisos',
              'Para consultar la nómina',
              'Para sustituir las llamadas de emergencia'
            ],
            correcta: 0,
            retroalimentacion: 'El canal SST permite gestionar información preventiva y reportar condiciones, incidentes o mejoras.'
          },
          {
            id: 'p10_2',
            texto: '¿Qué debe hacer ante un riesgo sin controlar que identifica en su área?',
            opciones: [
              'No decir nada para no complicar el trabajo',
              'Comunicarlo al responsable y seguir las medidas preventivas disponibles',
              'Esperar a que ocurra un accidente para tener pruebas',
              'Publicarlo en redes sociales sin haber reportado internamente'
            ],
            correcta: 1,
            retroalimentacion: 'La comunicación oportuna permite activar las acciones de control antes de que ocurra un daño.'
          },
          {
            id: 'p10_3',
            texto: '¿Cuál de las siguientes es una forma de participar activamente en el SG-SST?',
            opciones: [
              'Ignorar las capacitaciones si ya tiene experiencia',
              'Proponer mejoras de seguridad para los procesos de su área',
              'Reportar solo los accidentes graves',
              'Dejar que otros se encarguen de la seguridad'
            ],
            correcta: 1,
            retroalimentacion: 'Proponer mejoras de seguridad es una de las formas más valiosas de participación activa en el SG-SST.'
          },
          {
            id: 'p10_4',
            texto: 'Al finalizar esta inducción, el colaborador se compromete principalmente a:',
            opciones: [
              'Aprobar los módulos sin aplicar lo aprendido',
              'Aplicar controles, reportar riesgos y participar en el SG-SST',
              'Supervisar el trabajo de sus compañeros',
              'Rediseñar el sistema de gestión del hospital'
            ],
            correcta: 1,
            retroalimentacion: 'El compromiso real es aplicar lo aprendido: controles, reportes y participación activa en la prevención.'
          }
        ]
      }
    ];
    this.setModulos(modulos);
  }
};

// Exportar para uso global
window.DB = DB;
