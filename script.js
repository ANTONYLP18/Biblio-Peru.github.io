// Variables globales
let libroEditandoId = null;
let usuarioEditandoId = null;
let multaEditandoId = null;
let elementoAEliminar = null;
let tipoAEliminar = null;
let archivoActual = null;
let highlightedSuggestionIndex = -1;
let estadoFiltroMultas = 'todas';
let reporteActual = null;
let datosReporte = null;
let imagenPrevia = null;
let reservaEditandoId = null;

// Variables para notificaciones
let notificacionFiltroCategoria = 'todas';
let notificacionFiltroPrioridad = {
    alta: true,
    media: true,
    baja: true
};
let notificacionFiltroBusqueda = '';

// Base de datos usando IndexedDB
const DB_NAME = 'BibliotecaDB';
const DB_VERSION = 1;
let db;

// Abrir o crear la base de datos
const openDB = () => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        
        request.onerror = (event) => {
            console.error("Error al abrir la base de datos:", event.target.error);
            reject(event.target.error);
        };
        
        request.onsuccess = (event) => {
            db = event.target.result;
            resolve(db);
        };
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            
            // Crear almacenes (tablas)
            if (!db.objectStoreNames.contains('usuarios')) {
                const usuariosStore = db.createObjectStore('usuarios', { keyPath: 'id', autoIncrement: true });
                usuariosStore.createIndex('email', 'email', { unique: true });
                usuariosStore.createIndex('dni', 'dni', { unique: true });
            }
            
            if (!db.objectStoreNames.contains('autores')) {
                const autoresStore = db.createObjectStore('autores', { keyPath: 'id', autoIncrement: true });
                autoresStore.createIndex('nombre', 'nombre', { unique: false });
            }
            
            if (!db.objectStoreNames.contains('libros')) {
                const librosStore = db.createObjectStore('libros', { keyPath: 'id', autoIncrement: true });
                librosStore.createIndex('titulo', 'titulo', { unique: false });
                librosStore.createIndex('autor_id', 'autor_id', { unique: false });
            }
            
            if (!db.objectStoreNames.contains('prestamos')) {
                const prestamosStore = db.createObjectStore('prestamos', { keyPath: 'id', autoIncrement: true });
                prestamosStore.createIndex('libro_id', 'libro_id', { unique: false });
                prestamosStore.createIndex('usuario_id', 'usuario_id', { unique: false });
            }
            
            if (!db.objectStoreNames.contains('reservas')) {
                const reservasStore = db.createObjectStore('reservas', { keyPath: 'id', autoIncrement: true });
                reservasStore.createIndex('libro_id', 'libro_id', { unique: false });
                reservasStore.createIndex('usuario_id', 'usuario_id', { unique: false });
            }
            
            if (!db.objectStoreNames.contains('multas')) {
                const multasStore = db.createObjectStore('multas', { keyPath: 'id', autoIncrement: true });
                multasStore.createIndex('usuario_id', 'usuario_id', { unique: false });
                multasStore.createIndex('prestamo_id', 'prestamo_id', { unique: true });
            }
            
            if (!db.objectStoreNames.contains('notificaciones')) {
                const notificacionesStore = db.createObjectStore('notificaciones', { keyPath: 'id', autoIncrement: true });
                notificacionesStore.createIndex('fecha', 'fecha', { unique: false });
            }
            
            console.log("Base de datos creada con éxito");
        };
    });
};

// Operaciones CRUD para cada almacén
const addItem = (storeName, item) => {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.add(item);
        
        request.onsuccess = () => resolve(request.result);
        request.onerror = (event) => reject(event.target.error);
    });
};

const getItem = (storeName, id) => {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.get(id);
        
        request.onsuccess = () => resolve(request.result);
        request.onerror = (event) => reject(event.target.error);
    });
};

const getAllItems = (storeName) => {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.getAll();
        
        request.onsuccess = () => resolve(request.result);
        request.onerror = (event) => reject(event.target.error);
    });
};

const updateItem = (storeName, id, newData) => {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const getRequest = store.get(id);
        
        getRequest.onsuccess = () => {
            const data = getRequest.result;
            if (data) {
                const updatedData = { ...data, ...newData };
                const putRequest = store.put(updatedData);
                
                putRequest.onsuccess = () => resolve(updatedData);
                putRequest.onerror = (event) => reject(event.target.error);
            } else {
                reject(new Error('Registro no encontrado'));
            }
        };
        
        getRequest.onerror = (event) => reject(event.target.error);
    });
};

const deleteItem = (storeName, id) => {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.delete(id);
        
        request.onsuccess = () => resolve();
        request.onerror = (event) => reject(event.target.error);
    });
};

// Datos iniciales para la base de datos
const initDatabase = async () => {
    try {
        // Verificar si ya hay datos
        const usuarios = await getAllItems('usuarios');
        if (usuarios.length === 0) {
            // Agregar usuarios iniciales
            await addItem('usuarios', {
                nombre: 'Juan López',
                email: 'juan@biblioperu.com',
                password: '123456',
                rol: 'bibliotecario',
                telefono: '+51 987 654 321',
                direccion: 'Av. Libertad 123, Lima',
                dni: '70123456',
                expiracion: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString(),
                fechaRegistro: new Date().toISOString()
            });
            
            await addItem('usuarios', {
                nombre: 'Ana María Castillo Ríos',
                email: 'ana@ejemplo.com',
                password: '123456',
                rol: 'usuario',
                telefono: '+51 987 123 456',
                direccion: 'Calle Flores 456, Lima',
                dni: '71234567',
                expiracion: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString(),
                fechaRegistro: new Date().toISOString()
            });
            
            await addItem('usuarios', {
                nombre: 'Carlos Alberto Pérez Mendoza',
                email: 'carlos@ejemplo.com',
                password: '123456',
                rol: 'usuario',
                telefono: '+51 987 789 123',
                direccion: 'Jr. Lima 789, Arequipa',
                dni: '72345678',
                expiracion: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString(),
                fechaRegistro: new Date().toISOString()
            });
            
            // Agregar autores iniciales
            await addItem('autores', {
                nombre: 'Antoine de Saint-Exupéry',
                pais: 'Francia',
                biografia: 'Escritor y aviador francés, autor de El Principito.'
            });
            
            await addItem('autores', {
                nombre: 'Gabriel García Márquez',
                pais: 'Colombia',
                biografia: 'Escritor y periodista colombiano, premio Nobel de Literatura.'
            });
            
            await addItem('autores', {
                nombre: 'Mario Vargas Llosa',
                pais: 'Perú',
                biografia: 'Escritor peruano, premio Nobel de Literatura en 2010.'
            });
            
            // Agregar libros iniciales
            await addItem('libros', {
                titulo: 'El Principito',
                autor: 'Antoine de Saint-Exupéry',
                genero: 'Fábula',
                isbn: '978-0156012195',
                edicion: '1ra Edición',
                ejemplares: 5,
                disponibles: 4,
                descripcion: 'Un clásico de la literatura infantil y juvenil.',
                archivo: null
            });
            
            await addItem('libros', {
                titulo: 'Cien años de soledad',
                autor: 'Gabriel García Márquez',
                genero: 'Realismo mágico',
                isbn: '978-0307474728',
                edicion: 'Edición Especial',
                ejemplares: 3,
                disponibles: 2,
                descripcion: 'La obra maestra de Gabriel García Márquez.',
                archivo: null
            });
            
            await addItem('libros', {
                titulo: 'La ciudad y los perros',
                autor: 'Mario Vargas Llosa',
                genero: 'Novela',
                isbn: '978-8420471839',
                edicion: 'Edición Conmemorativa',
                ejemplares: 4,
                disponibles: 3,
                descripcion: 'Primera novela del escritor peruano Mario Vargas Llosa.',
                archivo: null
            });
            
            await addItem('libros', {
                titulo: 'Rayuela',
                autor: 'Julio Cortázar',
                genero: 'Novela experimental',
                isbn: '978-8432216460',
                edicion: 'Edición Aniversario',
                ejemplares: 2,
                disponibles: 2,
                descripcion: 'Obra maestra de la literatura latinoamericana.',
                archivo: null
            });
            
            // Agregar préstamos iniciales
            const hoy = new Date();
            const devolucion = new Date();
            devolucion.setDate(hoy.getDate() + 14);
            
            await addItem('prestamos', {
                libro_id: 2,
                usuario_id: 2,
                fecha_prestamo: hoy.toISOString(),
                fecha_devolucion: devolucion.toISOString(),
                estado: 'activo'
            });
            
            // Agregar multas iniciales
            const fechaPasada = new Date();
            fechaPasada.setDate(fechaPasada.getDate() - 10);
            
            await addItem('multas', {
                usuario_id: 2,
                prestamo_id: 1,
                monto: 4.50,
                motivo: "Retraso en entrega (2 días)",
                fecha: fechaPasada.toISOString(),
                estado: 'pendiente'
            });
            
            await addItem('multas', {
                usuario_id: 3,
                prestamo_id: null,
                monto: 15.00,
                motivo: "Daño a libro",
                fecha: new Date().toISOString(),
                estado: 'pendiente'
            });
            
            await addItem('multas', {
                usuario_id: 2,
                prestamo_id: null,
                monto: 8.00,
                motivo: "Multa por pérdida de material",
                fecha: new Date().toISOString(),
                estado: 'pagado'
            });
            
            // Agregar reservas iniciales
            await addItem('reservas', {
                libro_id: 2,
                usuario_id: 2,
                fecha_reserva: new Date().toISOString(),
                estado: 'pendiente'
            });
            
            await addItem('reservas', {
                libro_id: 3,
                usuario_id: 3,
                fecha_reserva: new Date().toISOString(),
                estado: 'pendiente'
            });
            
            // Agregar notificaciones iniciales
            await addItem('notificaciones', {
                titulo: 'Bienvenido a BiblioPerú',
                mensaje: 'Su cuenta ha sido creada exitosamente.',
                fecha: new Date().toISOString(),
                leida: false
            });
            
            console.log('Datos iniciales agregados');
        }
    } catch (error) {
        console.error('Error al inicializar base de datos:', error);
    }
};

// Funciones para la interfaz de usuario
const showPage = (pageId) => {
    document.getElementById('home-page').style.display = 'none';
    document.getElementById('login-page').style.display = 'none';
    document.getElementById('register-page').style.display = 'none';
    document.getElementById('dashboard-page').style.display = 'none';
    
    document.getElementById(pageId + '-page').style.display = 'block';
    
    if (pageId === 'dashboard') {
        cargarDashboard();
    }
};

const showTab = (tabId) => {
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    document.querySelectorAll('.sidebar-menu a').forEach(link => {
        link.classList.remove('active');
    });
    
    document.getElementById(tabId).classList.add('active');
    
    // Marcar como activo el enlace correspondiente
    document.querySelector(`.sidebar-menu a[onclick="showTab('${tabId}')"]`).classList.add('active');
    
    // Cargar datos específicos de la pestaña
    switch(tabId) {
        case 'tab-libros':
            cargarLibros();
            break;
        case 'tab-usuarios':
            cargarUsuarios();
            break;
        case 'tab-prestamos':
            cargarPrestamos();
            break;
        case 'tab-multas':
            cargarMultas();
            break;
        case 'tab-reservas':
            cargarReservas();
            break;
        case 'tab-notificaciones':
            cargarNotificaciones();
            break;
        case 'tab-mi-perfil':
            cargarPerfil();
            break;
        case 'tab-reportes':
            // No se necesita cargar datos específicos
            break;
        case 'tab-configuracion':
            // No se necesita cargar datos específicos
            break;
    }
};

const showModal = (modalId) => {
    document.getElementById(modalId).style.display = 'flex';
    
    // Cargar datos necesarios para el modal
    if (modalId === 'modal-libro') {
        document.getElementById('nombre-archivo').textContent = 'No se ha seleccionado ningún archivo';
        document.getElementById('libro-archivo').value = '';
    } else if (modalId === 'modal-prestamo') {
        // Configurar fechas por defecto
        const hoy = new Date();
        const devolucion = new Date();
        devolucion.setDate(hoy.getDate() + 14);
        
        document.getElementById('prestamo-fecha').valueAsDate = hoy;
        document.getElementById('prestamo-devolucion').valueAsDate = devolucion;
        
        // Limpiar campos de autocompletado
        document.getElementById('prestamo-libro-input').value = '';
        document.getElementById('prestamo-libro-id').value = '';
        document.getElementById('prestamo-usuario-input').value = '';
        document.getElementById('prestamo-usuario-id').value = '';
    } else if (modalId === 'modal-multa') {
        // Configurar fecha por defecto
        document.getElementById('multa-fecha').valueAsDate = new Date();
        document.getElementById('multa-monto').value = '';
        document.getElementById('multa-motivo').value = '';
        document.getElementById('multa-estado').value = 'pendiente';
        document.getElementById('multa-usuario-input').value = '';
        document.getElementById('multa-usuario-id').value = '';
        document.getElementById('modal-multa-title').textContent = 'Agregar Multa';
        multaEditandoId = null;
    } else if (modalId === 'modal-reserva') {
        // Configurar fecha por defecto
        document.getElementById('reserva-fecha').valueAsDate = new Date();
        document.getElementById('reserva-libro-input').value = '';
        document.getElementById('reserva-libro-id').value = '';
        document.getElementById('reserva-usuario-input').value = '';
        document.getElementById('reserva-usuario-id').value = '';
        reservaEditandoId = null;
    }
};

const cerrarModal = (modalId) => {
    document.getElementById(modalId).style.display = 'none';
    if (document.getElementById(modalId.replace('modal-', 'form-'))) {
        document.getElementById(modalId.replace('modal-', 'form-')).reset();
    }
    
    // Resetear variables de edición
    libroEditandoId = null;
    usuarioEditandoId = null;
    multaEditandoId = null;
    reservaEditandoId = null;
    archivoActual = null;
    
    // Restaurar título del modal
    if (modalId === 'modal-libro') {
        document.getElementById('modal-libro-title').textContent = 'Agregar Nuevo Libro';
    } else if (modalId === 'modal-usuario') {
        document.getElementById('modal-usuario-title').textContent = 'Agregar Nuevo Usuario';
    } else if (modalId === 'modal-reserva') {
        reservaEditandoId = null;
    }
    
    // Ocultar sugerencias
    document.querySelectorAll('.autocomplete-suggestions').forEach(el => {
        el.classList.remove('show');
    });
    highlightedSuggestionIndex = -1;
};

const cerrarSesion = () => {
    if (confirm("¿Estás seguro de cerrar sesión?")) {
        sessionStorage.removeItem('usuarioActual');
        showPage('home');
    }
};

// Función para verificar permisos
const tienePermisos = () => {
    const usuarioActual = JSON.parse(sessionStorage.getItem('usuarioActual'));
    return usuarioActual && (usuarioActual.rol === 'bibliotecario' || usuarioActual.rol === 'admin');
};

// Función para ajustar la interfaz según el rol
const ajustarInterfazPorRol = () => {
    const usuarioActual = JSON.parse(sessionStorage.getItem('usuarioActual'));
    const esAdmin = usuarioActual && (usuarioActual.rol === 'bibliotecario' || usuarioActual.rol === 'admin');
    
    // Mostrar/ocultar elementos según rol
    const elementosAdmin = document.querySelectorAll('.admin-only');
    elementosAdmin.forEach(el => {
        el.style.display = esAdmin ? 'block' : 'none';
    });
    
    // Actualizar el título del rol
    const roleTitle = document.getElementById('user-role');
    if (roleTitle) {
        if (usuarioActual) {
            roleTitle.textContent = 
                usuarioActual.rol === 'admin' ? 'Administrador' : 
                usuarioActual.rol === 'bibliotecario' ? 'Bibliotecario' : 
                'Usuario';
        }
    }
};

// Funciones para cargar datos en la interfaz
const cargarDashboard = async () => {
    try {
        const libros = await getAllItems('libros');
        const prestamos = await getAllItems('prestamos');
        const multas = await getAllItems('multas');
        const reservas = await getAllItems('reservas');
        const notificaciones = await getAllItems('notificaciones');
        
        // Estadísticas
        document.getElementById('total-libros').textContent = libros.reduce((sum, libro) => sum + libro.ejemplares, 0);
        document.getElementById('libros-disponibles').textContent = libros.reduce((sum, libro) => sum + libro.disponibles, 0);
        document.getElementById('prestamos-activos').textContent = prestamos.filter(p => p.estado === 'activo').length;
        document.getElementById('multas-pendientes').textContent = multas.filter(m => m.estado === 'pendiente').length;
        document.getElementById('reservas-pendientes').textContent = reservas.filter(r => r.estado === 'pendiente').length;
        document.getElementById('total-notificaciones').textContent = notificaciones.filter(n => !n.leida).length;
        
        // Actividad reciente
        const actividadContainer = document.getElementById('actividad-reciente');
        actividadContainer.innerHTML = '';
        
        // Últimos 5 préstamos
        const prestamosRecientes = prestamos
            .sort((a, b) => new Date(b.fecha_prestamo) - new Date(a.fecha_prestamo))
            .slice(0, 5);
        
        for (const prestamo of prestamosRecientes) {
            const libro = await getItem('libros', prestamo.libro_id);
            const usuario = await getItem('usuarios', prestamo.usuario_id);
            
            const fecha = new Date(prestamo.fecha_prestamo);
            const fechaFormateada = `${fecha.getDate()}/${fecha.getMonth() + 1}/${fecha.getFullYear()}`;
            
            const li = document.createElement('li');
            li.innerHTML = `Usuario '<strong>${usuario.nombre}</strong>' tomó prestado "${libro.titulo}"<span>${fechaFormateada}</span>`;
            actividadContainer.appendChild(li);
        }
        
        // Ajustar interfaz según rol
        ajustarInterfazPorRol();
    } catch (error) {
        console.error('Error al cargar dashboard:', error);
    }
};

const cargarLibros = async () => {
    try {
        const libros = await getAllItems('libros');
        const tabla = document.getElementById('tabla-libros').querySelector('tbody');
        tabla.innerHTML = '';
        
        const puedeEditar = tienePermisos();
        
        for (const libro of libros) {
            const tr = document.createElement('tr');
            
            let accionesHTML = '';
            if (puedeEditar) {
                accionesHTML = `
                    <div class="action-buttons">
                        <button class="btn btn-primary btn-sm" onclick="editarLibro(${libro.id})">Editar</button>
                        <button class="btn btn-danger btn-sm" onclick="eliminarLibro(${libro.id})">Eliminar</button>
                    </div>
                `;
            } else {
                accionesHTML = '<span class="restricted">Acción restringida</span>';
            }
            
            // Mostrar información del archivo
            let archivoHTML = 'No';
            if (libro.archivo) {
                const extension = libro.archivo.name.split('.').pop().toUpperCase();
                archivoHTML = `
                    <div>
                        <i class="fas fa-file file-icon"></i>
                        <span>${libro.archivo.name}</span>
                        <span class="file-type-badge">${extension}</span>
                    </div>
                `;
            }
            
            tr.innerHTML = `
                <td>${libro.titulo}</td>
                <td>${libro.autor}</td>
                <td>${libro.genero}</td>
                <td><span class="status-badge ${libro.disponibles > 0 ? 'badge-disponible' : 'badge-no-disponible'}">${libro.disponibles > 0 ? 'Sí' : 'No'}</span></td>
                <td>${archivoHTML}</td>
                <td>${accionesHTML}</td>
            `;
            tabla.appendChild(tr);
        }
    } catch (error) {
        console.error('Error al cargar libros:', error);
    }
};

const cargarUsuarios = async () => {
    try {
        const usuarios = await getAllItems('usuarios');
        const tabla = document.getElementById('tabla-usuarios').querySelector('tbody');
        tabla.innerHTML = '';
        
        const puedeEditar = tienePermisos();
        
        for (const usuario of usuarios) {
            // Separar nombre y apellido (asumiendo que el nombre completo está en usuario.nombre)
            const nombreCompleto = usuario.nombre.split(' ');
            const nombre = nombreCompleto[0] || '';
            const apellido = nombreCompleto.slice(1).join(' ') || '';
            
            let accionesHTML = '';
            if (puedeEditar) {
                accionesHTML = `
                    <div class="action-buttons">
                        <button class="btn btn-primary btn-sm" onclick="editarUsuario(${usuario.id})">Editar</button>
                        <button class="btn btn-danger btn-sm" onclick="eliminarUsuario(${usuario.id})">Eliminar</button>
                        <button class="btn btn-renew btn-sm" onclick="renovarUsuario(${usuario.id})">Renovar</button>
                    </div>
                `;
            } else {
                accionesHTML = '<span class="restricted">Acción restringida</span>';
            }
            
            // Estado de expiración
            let estadoHTML = '';
            if (usuario.expiracion) {
                const fechaExpiracion = new Date(usuario.expiracion);
                const hoy = new Date();
                
                if (fechaExpiracion < hoy) {
                    estadoHTML = '<span class="badge badge-danger">Expirado</span>';
                } else {
                    estadoHTML = `<span class="badge badge-success">Válido hasta ${fechaExpiracion.toLocaleDateString()}</span>`;
                }
            } else {
                estadoHTML = '<span class="badge badge-warning">Sin definir</span>';
            }
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${nombre}</td>
                <td>${apellido}</td>
                <td>${usuario.dni}</td>
                <td>${usuario.email}</td>
                <td>${usuario.telefono || ''}</td>
                <td>${estadoHTML}</td>
                <td>${accionesHTML}</td>
            `;
            tabla.appendChild(tr);
        }
    } catch (error) {
        console.error('Error al cargar usuarios:', error);
    }
};

// MEJORADO: Botones de acciones en préstamos reorganizados
const cargarPrestamos = async () => {
    try {
        const prestamos = await getAllItems('prestamos');
        const tabla = document.getElementById('tabla-prestamos').querySelector('tbody');
        tabla.innerHTML = '';
        
        const puedeEditar = tienePermisos();
        
        for (const prestamo of prestamos) {
            const libro = await getItem('libros', prestamo.libro_id);
            const usuario = await getItem('usuarios', prestamo.usuario_id);
            
            const fechaPrestamo = new Date(prestamo.fecha_prestamo);
            const fechaDevolucion = new Date(prestamo.fecha_devolucion);
            
            let accionesHTML = '';
            if (puedeEditar) {
                accionesHTML = `
                    <div class="loan-actions">
                        ${prestamo.estado === 'activo' ? `
                            <button class="btn btn-success btn-sm" onclick="registrarDevolucion(${prestamo.id})">Registrar Devolución</button>
                            <button class="btn btn-warning btn-sm" onclick="renovarPrestamo(${prestamo.id})">Renovar Préstamo</button>
                            <button class="btn btn-reminder btn-sm" onclick="enviarRecordatorio(${prestamo.id})">Enviar Recordatorio</button>
                        ` : ''}
                        <button class="btn btn-danger btn-sm" onclick="eliminarPrestamo(${prestamo.id})">Eliminar</button>
                    </div>
                `;
            } else {
                accionesHTML = '<span class="restricted">Acción restringida</span>';
            }
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${libro ? libro.titulo : 'Libro eliminado'}</td>
                <td>${libro ? libro.autor : 'Autor desconocido'}</td>
                <td>${usuario ? usuario.nombre : 'Usuario eliminado'}</td>
                <td>${fechaPrestamo.toLocaleDateString()}</td>
                <td>${fechaDevolucion.toLocaleDateString()}</td>
                <td><span class="status-badge ${prestamo.estado === 'activo' ? 'badge-pendiente' : 'badge-pagado'}">${prestamo.estado === 'activo' ? 'Activo' : 'Inactivo'}</span></td>
                <td>${accionesHTML}</td>
            `;
            tabla.appendChild(tr);
        }
    } catch (error) {
        console.error('Error al cargar préstamos:', error);
    }
};

const cargarMultas = async () => {
    try {
        const multas = await getAllItems('multas');
        const tabla = document.getElementById('tabla-multas').querySelector('tbody');
        tabla.innerHTML = '';
        
        // Calcular resumen de multas
        const pendientes = multas.filter(m => m.estado === 'pendiente').reduce((sum, m) => sum + m.monto, 0);
        const pagadas = multas.filter(m => m.estado === 'pagado').reduce((sum, m) => sum + m.monto, 0);
        const total = pendientes + pagadas;
        
        document.getElementById('multas-pendientes-summary').textContent = `S/. ${pendientes.toFixed(2)}`;
        document.getElementById('multas-pagadas-summary').textContent = `S/. ${pagadas.toFixed(2)}`;
        document.getElementById('multas-total-summary').textContent = `S/. ${total.toFixed(2)}`;
        
        const puedeEditar = tienePermisos();
        
        for (const multa of multas) {
            const usuario = await getItem('usuarios', multa.usuario_id);
            const prestamo = multa.prestamo_id ? await getItem('prestamos', multa.prestamo_id) : null;
            const libro = prestamo ? await getItem('libros', prestamo.libro_id) : null;
            
            const fecha = new Date(multa.fecha);
            const hoy = new Date();
            const diasPasados = Math.floor((hoy - fecha) / (1000 * 60 * 60 * 24));
            
            let filaClase = '';
            if (multa.estado === 'pendiente' && diasPasados > 30) {
                filaClase = 'multa-urgente';
            } else if (multa.estado === 'pendiente') {
                filaClase = 'multa-pendiente';
            } else if (multa.estado === 'pagado') {
                filaClase = 'multa-pagada';
            }
            
            // Aplicar filtro
            if (estadoFiltroMultas === 'pendiente' && multa.estado !== 'pendiente') continue;
            if (estadoFiltroMultas === 'pagado' && multa.estado !== 'pagado') continue;
            if (estadoFiltroMultas === 'urgente' && (multa.estado !== 'pendiente' || diasPasados <= 30)) continue;
            
            let accionesHTML = '';
            if (puedeEditar) {
                accionesHTML = `
                    <div class="action-buttons">
                        <button class="btn btn-success btn-sm" onclick="pagarMulta(${multa.id})" ${multa.estado === 'pagado' ? 'disabled' : ''}>Pagar</button>
                        <button class="btn btn-primary btn-sm" onclick="editarMulta(${multa.id})">Editar</button>
                        <button class="btn btn-danger btn-sm" onclick="eliminarMulta(${multa.id})">Eliminar</button>
                    </div>
                `;
            } else {
                accionesHTML = '<span class="restricted">Acción restringida</span>';
            }
            
            const tr = document.createElement('tr');
            tr.className = filaClase;
            tr.innerHTML = `
                <td>${usuario ? usuario.nombre : 'Usuario eliminado'}</td>
                <td class="monto-cell">S/. ${multa.monto.toFixed(2)}</td>
                <td>${multa.motivo}${libro ? ` (${libro.titulo})` : ''}</td>
                <td>${fecha.toLocaleDateString()}</td>
                <td><span class="status-badge ${multa.estado === 'pendiente' ? 'badge-pendiente' : 'badge-pagado'}">${multa.estado === 'pendiente' ? 'Pendiente' : 'Pagado'}</span></td>
                <td>${accionesHTML}</td>
            `;
            tabla.appendChild(tr);
        }
    } catch (error) {
        console.error('Error al cargar multas:', error);
    }
};

// IMPLEMENTADO: Reservas completamente funcionales
const cargarReservas = async () => {
    try {
        const reservas = await getAllItems('reservas');
        const tabla = document.getElementById('tabla-reservas').querySelector('tbody');
        tabla.innerHTML = '';
        
        const puedeEditar = tienePermisos();
        
        for (const reserva of reservas) {
            const libro = await getItem('libros', reserva.libro_id);
            const usuario = await getItem('usuarios', reserva.usuario_id);
            
            const fecha = new Date(reserva.fecha_reserva);
            
            let accionesHTML = '';
            if (puedeEditar) {
                accionesHTML = `
                    <div class="action-buttons">
                        <button class="btn btn-primary btn-sm" onclick="editarReserva(${reserva.id})">Editar</button>
                        <button class="btn btn-danger btn-sm" onclick="eliminarReserva(${reserva.id})">Eliminar</button>
                    </div>
                `;
            } else {
                accionesHTML = '<span class="restricted">Acción restringida</span>';
            }
            
            // Determinar si el libro está disponible
            const disponible = libro && libro.disponibles > 0;
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${libro ? libro.titulo : 'Libro eliminado'}</td>
                <td>${libro ? libro.autor : 'Autor desconocido'}</td>
                <td>${usuario ? usuario.nombre : 'Usuario eliminado'}</td>
                <td>${fecha.toLocaleDateString()}</td>
                <td><span class="status-badge ${reserva.estado === 'pendiente' ? disponible ? 'badge-disponible' : 'badge-no-disponible' : 'badge-pagado'}">
                    ${reserva.estado === 'pendiente' ? (disponible ? 'Disponible' : 'No disponible') : 'Completada'}
                </span></td>
                <td>${accionesHTML}</td>
            `;
            tabla.appendChild(tr);
        }
    } catch (error) {
        console.error('Error al cargar reservas:', error);
    }
};

// Función para cargar el perfil del usuario (MEJORADA)
const cargarPerfil = () => {
    const usuario = JSON.parse(sessionStorage.getItem('usuarioActual'));
    if (!usuario) return;
    
    // Formatear fecha de registro
    const fechaRegistro = new Date(usuario.fechaRegistro);
    const fechaFormateada = `${fechaRegistro.getDate()}/${fechaRegistro.getMonth() + 1}/${fechaRegistro.getFullYear()}`;
    
    // Mostrar datos del perfil
    document.getElementById('profile-info-name').textContent = usuario.nombre;
    document.getElementById('profile-info-email').textContent = usuario.email;
    document.getElementById('profile-info-phone').textContent = usuario.telefono || 'No especificado';
    document.getElementById('profile-info-address').textContent = usuario.direccion || 'No especificado';
    document.getElementById('profile-info-role').textContent = 
        usuario.rol === 'admin' ? 'Administrador' : 
        usuario.rol === 'bibliotecario' ? 'Bibliotecario' : 
        'Usuario';
    document.getElementById('profile-info-created').textContent = fechaFormateada;
    
    // Actualizar avatar en el perfil
    const avatarContainer = document.getElementById('profile-avatar-container');
    const avatarInitials = document.getElementById('profile-avatar-initials');
    
    if (usuario.avatar) {
        // Si hay avatar, mostrarlo como imagen
        avatarContainer.innerHTML = '';
        const img = document.createElement('img');
        img.src = usuario.avatar;
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.borderRadius = '50%';
        avatarContainer.appendChild(img);
        
        // Agregar botón de cambiar foto
        const changeBtn = document.createElement('div');
        changeBtn.className = 'change-avatar-btn';
        changeBtn.innerHTML = '<i class="fas fa-camera"></i> Cambiar foto';
        changeBtn.onclick = () => document.getElementById('profile-image').click();
        avatarContainer.appendChild(changeBtn);
    } else {
        // Si no, mostrar iniciales
        const iniciales = usuario.nombre.split(' ')
            .map(nombre => nombre[0])
            .join('')
            .substring(0, 2)
            .toUpperCase();
            
        avatarInitials.textContent = iniciales;
    }
};

// Función para abrir el modal de edición de perfil (MEJORADA)
function abrirModalEditarPerfil() {
    const usuario = JSON.parse(sessionStorage.getItem('usuarioActual'));
    if (!usuario) return;
    
    // Cargar datos del usuario en el formulario
    document.getElementById('edit-nombre').value = usuario.nombre;
    document.getElementById('edit-email').value = usuario.email;
    document.getElementById('edit-telefono').value = usuario.telefono || '';
    document.getElementById('edit-direccion').value = usuario.direccion || '';
    
    // Mostrar vista previa de la imagen actual si existe
    const preview = document.getElementById('profile-image-preview');
    preview.style.display = 'none';
    if (usuario.avatar) {
        preview.src = usuario.avatar;
        preview.style.display = 'block';
    }
    
    // Ocultar mensajes
    document.getElementById('success-message').style.display = 'none';
    document.getElementById('error-message').style.display = 'none';
    
    // Mostrar modal
    document.getElementById('modal-perfil').style.display = 'flex';
}

// Función para cerrar el modal de perfil (MEJORADA)
function cerrarModalPerfil() {
    document.getElementById('modal-perfil').style.display = 'none';
    resetearErrores();
}

// Función para resetear mensajes de error (MEJORADA)
function resetearErrores() {
    document.querySelectorAll('.error-message').forEach(el => {
        el.style.display = 'none';
    });
}

// Función para mostrar mensaje de error (MEJORADA)
function mostrarError(elementId, mensaje) {
    const errorElement = document.getElementById(elementId);
    errorElement.textContent = mensaje;
    errorElement.style.display = 'block';
}

// Función para validar el formulario (MEJORADA)
function validarFormularioPerfil() {
    let valido = true;
    resetearErrores();
    
    // Validar nombre
    const nombre = document.getElementById('edit-nombre').value.trim();
    if (nombre.length < 3) {
        mostrarError('nombre-error', 'El nombre debe tener al menos 3 caracteres');
        valido = false;
    }
    
    // Validar email
    const email = document.getElementById('edit-email').value.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        mostrarError('email-error', 'Ingresa un correo electrónico válido');
        valido = false;
    }
    
    // Validar teléfono si se ha ingresado
    const telefono = document.getElementById('edit-telefono').value.trim();
    if (telefono && !/^(\+?\d{1,3})?[\s\d]{7,15}$/.test(telefono)) {
        mostrarError('telefono-error', 'Formato de teléfono inválido');
        valido = false;
    }
    
    return valido;
}

// Función para actualizar la interfaz con los nuevos datos (MEJORADA)
function actualizarPerfilEnInterfaz() {
    const usuario = JSON.parse(sessionStorage.getItem('usuarioActual'));
    if (!usuario) return;
    
    // Actualizar vista de perfil
    document.getElementById('profile-info-name').textContent = usuario.nombre;
    document.getElementById('profile-info-email').textContent = usuario.email;
    document.getElementById('profile-info-phone').textContent = usuario.telefono || 'No especificado';
    document.getElementById('profile-info-address').textContent = usuario.direccion || 'No especificado';
    
    // Actualizar avatar
    const avatarContainer = document.getElementById('profile-avatar-container');
    const avatarInitials = document.getElementById('profile-avatar-initials');
    
    if (usuario.avatar) {
        // Si hay avatar, mostrarlo como imagen
        avatarContainer.innerHTML = '';
        const img = document.createElement('img');
        img.src = usuario.avatar;
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.borderRadius = '50%';
        avatarContainer.appendChild(img);
        
        // Agregar botón de cambiar foto
        const changeBtn = document.createElement('div');
        changeBtn.className = 'change-avatar-btn';
        changeBtn.innerHTML = '<i class="fas fa-camera"></i> Cambiar foto';
        changeBtn.onclick = () => document.getElementById('profile-image').click();
        avatarContainer.appendChild(changeBtn);
    } else {
        // Si no, mostrar iniciales
        const iniciales = usuario.nombre.split(' ')
            .map(nombre => nombre[0])
            .join('')
            .substring(0, 2)
            .toUpperCase();
            
        avatarInitials.textContent = iniciales;
    }
}

// Evento para la imagen de perfil (vista previa) (MEJORADA)
document.getElementById('profile-image').addEventListener('change', function(e) {
    const fileInput = e.target;
    const fileNameDisplay = document.getElementById('profile-image-name');
    const preview = document.getElementById('profile-image-preview');
    
    if (fileInput.files.length > 0) {
        const file = fileInput.files[0];
        fileNameDisplay.textContent = file.name;
        imagenPrevia = file;
        
        // Mostrar vista previa
        const reader = new FileReader();
        reader.onload = function(e) {
            preview.src = e.target.result;
            preview.style.display = 'block';
        };
        reader.readAsDataURL(file);
    } else {
        fileNameDisplay.textContent = 'No se ha seleccionado ninguna imagen';
        preview.style.display = 'none';
        imagenPrevia = null;
    }
});

// Evento para enviar el formulario de perfil (MEJORADA)
document.getElementById('form-editar-perfil').addEventListener('submit', function(e) {
    e.preventDefault();
    
    // Validar formulario
    if (!validarFormularioPerfil()) {
        document.getElementById('error-message').style.display = 'block';
        return;
    }
    
    const usuario = JSON.parse(sessionStorage.getItem('usuarioActual'));
    if (!usuario) return;
    
    // Obtener datos del formulario
    usuario.nombre = document.getElementById('edit-nombre').value;
    usuario.email = document.getElementById('edit-email').value;
    usuario.telefono = document.getElementById('edit-telefono').value;
    usuario.direccion = document.getElementById('edit-direccion').value;
    
    // Si se subió una nueva imagen
    if (imagenPrevia) {
        const reader = new FileReader();
        reader.onload = function(e) {
            usuario.avatar = e.target.result;
            guardarCambiosPerfil(usuario);
        };
        reader.readAsDataURL(imagenPrevia);
    } else {
        guardarCambiosPerfil(usuario);
    }
});

// Función para guardar los cambios del perfil (MEJORADA)
function guardarCambiosPerfil(usuario) {
    // Simular envío AJAX al servidor
    document.getElementById('error-message').style.display = 'none';
    
    // Mostrar mensaje de carga
    const submitBtn = document.querySelector('#form-editar-perfil button[type="submit"]');
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
    submitBtn.disabled = true;
    
    // Simular petición AJAX (en un caso real sería una llamada fetch o XMLHttpRequest)
    setTimeout(() => {
        // Actualizar sessionStorage
        sessionStorage.setItem('usuarioActual', JSON.stringify(usuario));
        
        // Actualizar la interfaz con los nuevos datos
        actualizarPerfilEnInterfaz();
        
        // Mostrar mensaje de éxito
        document.getElementById('success-message').style.display = 'block';
        
        // Restaurar botón
        submitBtn.innerHTML = '<i class="fas fa-save"></i> Guardar Cambios';
        submitBtn.disabled = false;
        
        // Cerrar automáticamente después de 2 segundos
        setTimeout(() => {
            cerrarModalPerfil();
        }, 2000);
    }, 1500);
}

// Funciones para manejar formularios
document.getElementById('login-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value.trim();
    
    try {
        const usuarios = await getAllItems('usuarios');
        const usuario = usuarios.find(u => 
            u.email.toLowerCase() === email.toLowerCase() && 
            u.password === password
        );
        
        if (usuario) {
            // Guardar usuario en sessionStorage
            sessionStorage.setItem('usuarioActual', JSON.stringify(usuario));
            
            // Actualizar información del usuario en el dashboard
            document.getElementById('user-name').textContent = usuario.nombre;
            document.getElementById('user-role').textContent = 
                usuario.rol === 'admin' ? 'Administrador' : 
                usuario.rol === 'bibliotecario' ? 'Bibliotecario' : 
                'Usuario';
            document.getElementById('user-avatar').textContent = usuario.nombre.split(' ').map(n => n[0]).join('');
            
            // Mostrar dashboard
            showPage('dashboard');
        } else {
            alert('Credenciales incorrectas. Intente nuevamente.');
        }
    } catch (error) {
        console.error('Error al iniciar sesión:', error);
        alert('Error al iniciar sesión. Por favor intente nuevamente.');
    }
});

document.getElementById('register-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    const nombre = document.getElementById('register-name').value;
    const apellido = document.getElementById('register-lastname').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const confirmPassword = document.getElementById('register-confirm').value;
    const telefono = document.getElementById('register-phone').value;
    const direccion = document.getElementById('register-address').value;
    
    // Validar contraseñas
    if (password !== confirmPassword) {
        alert('Las contraseñas no coinciden');
        return;
    }
    
    try {
        // Verificar si el email ya existe
        const usuarios = await getAllItems('usuarios');
        if (usuarios.some(u => u.email === email)) {
            alert('Este correo electrónico ya está registrado');
            return;
        }
        
        // Calcular fecha de expiración (un año a partir de hoy)
        const hoy = new Date();
        const expiracion = new Date();
        expiracion.setFullYear(hoy.getFullYear() + 1);
        
        // Crear nuevo usuario
        await addItem('usuarios', {
            nombre: `${nombre} ${apellido}`,
            email,
            password,
            telefono,
            direccion,
            dni: '00000000', // DNI por defecto, se puede cambiar después
            rol: 'usuario',
            expiracion: expiracion.toISOString(),
            fechaRegistro: new Date().toISOString()
        });
        
        alert('Usuario registrado exitosamente. Por favor inicie sesión.');
        showPage('login');
    } catch (error) {
        console.error('Error al registrar usuario:', error);
        alert('Error al registrar usuario. Por favor intente nuevamente.');
    }
});

// Manejar selección de archivo
document.getElementById('libro-archivo').addEventListener('change', function(e) {
    const fileInput = e.target;
    const fileNameDisplay = document.getElementById('nombre-archivo');
    
    if (fileInput.files.length > 0) {
        const file = fileInput.files[0];
        fileNameDisplay.textContent = file.name;
        archivoActual = file;
    } else {
        fileNameDisplay.textContent = 'No se ha seleccionado ningún archivo';
        archivoActual = null;
    }
});

document.getElementById('form-libro').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    // Verificar permisos
    if (!tienePermisos()) {
        alert('No tiene permiso para realizar esta acción');
        return;
    }
    
    const titulo = document.getElementById('libro-titulo').value;
    const autor = document.getElementById('libro-autor').value;
    const genero = document.getElementById('libro-genero').value;
    const isbn = document.getElementById('libro-isbn').value;
    const edicion = document.getElementById('libro-edicion').value;
    const ejemplares = parseInt(document.getElementById('libro-ejemplares').value);
    const descripcion = document.getElementById('libro-descripcion').value;
    const id = document.getElementById('libro-id').value;
    
    try {
        if (libroEditandoId) {
            // Actualizar libro existente
            const libro = {
                id: libroEditandoId,
                titulo,
                autor,
                genero,
                isbn,
                edicion,
                ejemplares,
                descripcion
            };
            
            // Agregar archivo si se ha subido
            if (archivoActual) {
                libro.archivo = archivoActual;
            }
            
            await updateItem('libros', libroEditandoId, libro);
            
            // Crear notificación
            await addItem('notificaciones', {
                titulo: 'Libro actualizado',
                mensaje: `Se ha actualizado el libro "${titulo}" en el catálogo.`,
                fecha: new Date().toISOString(),
                leida: false
            });
            
            alert('Libro actualizado exitosamente');
        } else {
            // Agregar nuevo libro
            await addItem('libros', {
                titulo,
                autor,
                genero,
                isbn,
                edicion,
                ejemplares,
                disponibles: ejemplares,
                descripcion,
                archivo: archivoActual
            });
            
            // Crear notificación
            await addItem('notificaciones', {
                titulo: 'Nuevo libro agregado',
                mensaje: `Se ha agregado el libro "${titulo}" al catálogo.`,
                fecha: new Date().toISOString(),
                leida: false
            });
            
            alert('Libro agregado exitosamente');
        }
        
        cerrarModal('modal-libro');
        cargarLibros();
        cargarDashboard();
    } catch (error) {
        console.error('Error al guardar libro:', error);
        alert('Error al guardar libro. Por favor intente nuevamente.');
    }
});

// Formulario para multas
document.getElementById('form-multa').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    if (!tienePermisos()) {
        alert('No tiene permiso para realizar esta acción');
        return;
    }
    
    const usuarioId = document.getElementById('multa-usuario-id').value;
    const monto = parseFloat(document.getElementById('multa-monto').value);
    const motivo = document.getElementById('multa-motivo').value;
    const fecha = document.getElementById('multa-fecha').value;
    const estado = document.getElementById('multa-estado').value;
    const id = document.getElementById('multa-id').value;
    
    try {
        if (multaEditandoId) {
            // Actualizar multa existente
            const multa = {
                id: multaEditandoId,
                usuario_id: parseInt(usuarioId),
                monto,
                motivo,
                fecha: new Date(fecha).toISOString(),
                estado
            };
            
            await updateItem('multas', multaEditandoId, multa);
            
            // Crear notificación
            const usuario = await getItem('usuarios', multa.usuario_id);
            await addItem('notificaciones', {
                titulo: 'Multa actualizada',
                mensaje: `Se ha actualizado la multa de ${usuario.nombre} por ${motivo}.`,
                fecha: new Date().toISOString(),
                leida: false
            });
            
            alert('Multa actualizada exitosamente');
        } else {
            // Agregar nueva multa
            await addItem('multas', {
                usuario_id: parseInt(usuarioId),
                prestamo_id: null,
                monto,
                motivo,
                fecha: new Date(fecha).toISOString(),
                estado
            });
            
            // Crear notificación
            const usuario = await getItem('usuarios', usuarioId);
            await addItem('notificaciones', {
                titulo: 'Nueva multa registrada',
                mensaje: `Se ha registrado una multa de S/. ${monto.toFixed(2)} para ${usuario.nombre}.`,
                fecha: new Date().toISOString(),
                leida: false
            });
            
            alert('Multa agregada exitosamente');
        }
        
        cerrarModal('modal-multa');
        cargarMultas();
        cargarDashboard();
    } catch (error) {
        console.error('Error al guardar multa:', error);
        alert('Error al guardar multa. Por favor intente nuevamente.');
    }
});

// Funciones para acciones específicas
const registrarDevolucion = async (prestamoId) => {
    // Verificar permisos
    if (!tienePermisos()) {
        alert('No tiene permiso para realizar esta acción');
        return;
    }
    
    if (!confirm("¿Desea registrar la devolución de este libro?")) {
        return;
    }
    
    try {
        const prestamo = await getItem('prestamos', prestamoId);
        const libro = await getItem('libros', prestamo.libro_id);
        
        // Actualizar préstamo
        prestamo.estado = 'completado';
        await updateItem('prestamos', prestamoId, prestamo);
        
        // Actualizar disponibilidad del libro
        libro.disponibles += 1;
        await updateItem('libros', libro.id, libro);
        
        // Verificar si hay multa (si la devolución fue tardía)
        const fechaDevolucion = new Date(prestamo.fecha_devolucion);
        const hoy = new Date();
        
        if (hoy > fechaDevolucion) {
            const diasAtraso = Math.ceil((hoy - fechaDevolucion) / (1000 * 60 * 60 * 24));
            const monto = diasAtraso * 2; // S/. 2 por día de atraso
            
            await addItem('multas', {
                usuario_id: prestamo.usuario_id,
                prestamo_id: prestamo.id,
                monto,
                motivo: `Retraso en entrega (${diasAtraso} días)`,
                fecha: hoy.toISOString(),
                estado: 'pendiente'
            });
            
            // Crear notificación de multa
            const usuario = await getItem('usuarios', prestamo.usuario_id);
            await addItem('notificaciones', {
                titulo: 'Multa generada',
                mensaje: `Se ha generado una multa de S/. ${monto} para ${usuario.nombre} por retraso en la entrega.`,
                fecha: hoy.toISOString(),
                leida: false
            });
        }
        
        alert('Devolución registrada exitosamente');
        cargarPrestamos();
        cargarDashboard();
        cargarMultas();
    } catch (error) {
        console.error('Error al devolver libro:', error);
        alert('Error al devolver libro. Por favor intente nuevamente.');
    }
};

const renovarPrestamo = async (prestamoId) => {
    // Verificar permisos
    if (!tienePermisos()) {
        alert('No tiene permiso para realizar esta acción');
        return;
    }
    
    if (!confirm("¿Desea renovar el préstamo extendiendo la fecha de devolución 7 días más?")) {
        return;
    }
    
    try {
        const prestamo = await getItem('prestamos', prestamoId);
        if (!prestamo || prestamo.estado !== 'activo') {
            alert('Préstamo no encontrado o no activo');
            return;
        }

        // Calcular nueva fecha de devolución (7 días después de la fecha original)
        const fechaDev = new Date(prestamo.fecha_devolucion);
        fechaDev.setDate(fechaDev.getDate() + 7);

        prestamo.fecha_devolucion = fechaDev.toISOString();
        await updateItem('prestamos', prestamoId, prestamo);

        // Crear notificación
        const libro = await getItem('libros', prestamo.libro_id);
        const usuario = await getItem('usuarios', prestamo.usuario_id);
        await addItem('notificaciones', {
            titulo: 'Préstamo renovado',
            mensaje: `Se ha renovado el préstamo de "${libro.titulo}" para ${usuario.nombre}. Nueva fecha: ${fechaDev.toLocaleDateString()}`,
            fecha: new Date().toISOString(),
            leida: false
        });

        alert('Préstamo renovado exitosamente. Nueva fecha de devolución: ' + fechaDev.toLocaleDateString());
        cargarPrestamos();
        cargarDashboard();
    } catch (error) {
        console.error('Error al renovar préstamo:', error);
        alert('Error al renovar préstamo. Por favor intente nuevamente.');
    }
};

const enviarRecordatorio = async (prestamoId) => {
    // Verificar permisos
    if (!tienePermisos()) {
        alert('No tiene permiso para realizar esta acción');
        return;
    }
    
    if (!confirm("¿Desea enviar un recordatorio al usuario sobre la devolución del libro?")) {
        return;
    }
    
    try {
        const prestamo = await getItem('prestamos', prestamoId);
        const usuario = await getItem('usuarios', prestamo.usuario_id);
        const libro = await getItem('libros', prestamo.libro_id);
        const fechaDev = new Date(prestamo.fecha_devolucion);
        
        // Crear notificación
        await addItem('notificaciones', {
            titulo: 'Recordatorio enviado',
            mensaje: `Se envió un recordatorio a ${usuario.nombre} sobre el préstamo del libro "${libro.titulo}" (Vence: ${fechaDev.toLocaleDateString()})`,
            fecha: new Date().toISOString(),
            leida: false
        });
        
        alert(`Se ha enviado un recordatorio a ${usuario.nombre} sobre la devolución de "${libro.titulo}"`);
        cargarNotificaciones();
    } catch (error) {
        console.error('Error al enviar recordatorio:', error);
        alert('Error al enviar recordatorio. Por favor intente nuevamente.');
    }
};

const pagarMulta = async (multaId) => {
    if (!tienePermisos()) {
        alert('No tiene permiso para realizar esta acción');
        return;
    }

    if (!confirm("¿Desea marcar esta multa como pagada?")) {
        return;
    }

    try {
        const multa = await getItem('multas', multaId);
        multa.estado = 'pagado';
        await updateItem('multas', multaId, multa);

        // Crear notificación
        const usuario = await getItem('usuarios', multa.usuario_id);
        await addItem('notificaciones', {
            titulo: 'Multa pagada',
            mensaje: `El usuario ${usuario.nombre} ha pagado una multa de S/. ${multa.monto.toFixed(2)}.`,
            fecha: new Date().toISOString(),
            leida: false
        });

        alert('Multa marcada como pagada');
        cargarMultas();
        cargarDashboard();
    } catch (error) {
        console.error('Error al pagar multa:', error);
        alert('Error al pagar multa. Por favor intente nuevamente.');
    }
};

// Funciones para editar elementos
const editarLibro = async (id) => {
    try {
        const libro = await getItem('libros', id);
        if (libro) {
            // Llenar el formulario con los datos del libro
            document.getElementById('libro-titulo').value = libro.titulo;
            document.getElementById('libro-autor').value = libro.autor;
            document.getElementById('libro-genero').value = libro.genero;
            document.getElementById('libro-isbn').value = libro.isbn || '';
            document.getElementById('libro-edicion').value = libro.edicion || '';
            document.getElementById('libro-ejemplares').value = libro.ejemplares;
            document.getElementById('libro-descripcion').value = libro.descripcion || '';
            document.getElementById('libro-id').value = libro.id;
            
            // Mostrar nombre del archivo si existe
            if (libro.archivo) {
                document.getElementById('nombre-archivo').textContent = libro.archivo.name;
            }
            
            // Actualizar título del modal
            document.getElementById('modal-libro-title').textContent = 'Editar Libro';
            
            // Mostrar modal
            libroEditandoId = id;
            showModal('modal-libro');
        }
    } catch (error) {
        console.error('Error al cargar libro para editar:', error);
        alert('Error al cargar libro para editar. Por favor intente nuevamente.');
    }
};

const editarUsuario = async (id) => {
    try {
        const usuario = await getItem('usuarios', id);
        if (usuario) {
            // Separar nombre y apellido
            const nombreCompleto = usuario.nombre.split(' ');
            const nombre = nombreCompleto[0] || '';
            const apellido = nombreCompleto.slice(1).join(' ') || '';
            
            // Llenar el formulario con los datos del usuario
            document.getElementById('usuario-nombre').value = nombre;
            document.getElementById('usuario-apellido').value = apellido;
            document.getElementById('usuario-dni').value = usuario.dni;
            document.getElementById('usuario-email').value = usuario.email;
            document.getElementById('usuario-telefono').value = usuario.telefono || '';
            document.getElementById('usuario-direccion').value = usuario.direccion || '';
            document.getElementById('usuario-rol').value = usuario.rol;
            document.getElementById('usuario-id').value = usuario.id;
            
            if (usuario.expiracion) {
                document.getElementById('usuario-expiracion').value = new Date(usuario.expiracion).toISOString().split('T')[0];
            }
            
            // Actualizar título del modal
            document.getElementById('modal-usuario-title').textContent = 'Editar Usuario';
            
            // Mostrar modal
            usuarioEditandoId = id;
            showModal('modal-usuario');
        }
    } catch (error) {
        console.error('Error al cargar usuario para editar:', error);
        alert('Error al cargar usuario para editar. Por favor intente nuevamente.');
    }
};

const editarMulta = async (id) => {
    try {
        const multa = await getItem('multas', id);
        if (multa) {
            const usuario = await getItem('usuarios', multa.usuario_id);
            
            // Llenar el formulario con los datos de la multa
            document.getElementById('multa-id').value = multa.id;
            document.getElementById('multa-monto').value = multa.monto;
            document.getElementById('multa-motivo').value = multa.motivo;
            document.getElementById('multa-fecha').value = new Date(multa.fecha).toISOString().split('T')[0];
            document.getElementById('multa-estado').value = multa.estado;
            document.getElementById('multa-usuario-input').value = usuario ? usuario.nombre : '';
            document.getElementById('multa-usuario-id').value = multa.usuario_id;
            
            // Actualizar título del modal
            document.getElementById('modal-multa-title').textContent = 'Editar Multa';
            
            // Mostrar modal
            multaEditandoId = id;
            showModal('modal-multa');
        }
    } catch (error) {
        console.error('Error al cargar multa para editar:', error);
        alert('Error al cargar multa para editar. Por favor intente nuevamente.');
    }
};

// Nueva función para editar reservas
const editarReserva = async (id) => {
    try {
        const reserva = await getItem('reservas', id);
        if (reserva) {
            const libro = await getItem('libros', reserva.libro_id);
            const usuario = await getItem('usuarios', reserva.usuario_id);
            
            // Llenar el formulario con los datos de la reserva
            document.getElementById('reserva-id').value = reserva.id;
            document.getElementById('reserva-fecha').value = reserva.fecha_reserva.split('T')[0];
            document.getElementById('reserva-estado').value = reserva.estado;
            
            // Autocompletar libro y usuario
            document.getElementById('reserva-libro-input').value = libro ? libro.titulo : '';
            document.getElementById('reserva-libro-id').value = reserva.libro_id;
            document.getElementById('reserva-usuario-input').value = usuario ? usuario.nombre : '';
            document.getElementById('reserva-usuario-id').value = reserva.usuario_id;
            
            // Mostrar modal
            reservaEditandoId = id;
            showModal('modal-reserva');
        }
    } catch (error) {
        console.error('Error al cargar reserva para editar:', error);
        alert('Error al cargar reserva para editar. Por favor intente nuevamente.');
    }
};

// Formulario para reservas
document.getElementById('form-reserva').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    if (!tienePermisos()) {
        alert('No tiene permiso para realizar esta acción');
        return;
    }
    
    const id = document.getElementById('reserva-id').value;
    const libroId = document.getElementById('reserva-libro-id').value;
    const usuarioId = document.getElementById('reserva-usuario-id').value;
    const fecha = document.getElementById('reserva-fecha').value;
    const estado = document.getElementById('reserva-estado').value;
    
    try {
        if (reservaEditandoId) {
            // Actualizar reserva existente
            const reserva = {
                id: reservaEditandoId,
                libro_id: parseInt(libroId),
                usuario_id: parseInt(usuarioId),
                fecha_reserva: new Date(fecha).toISOString(),
                estado
            };
            
            await updateItem('reservas', reservaEditandoId, reserva);
            
            // Crear notificación
            const libro = await getItem('libros', libroId);
            const usuario = await getItem('usuarios', usuarioId);
            await addItem('notificaciones', {
                titulo: 'Reserva actualizada',
                mensaje: `Se ha actualizado la reserva del libro "${libro.titulo}" para ${usuario.nombre}`,
                fecha: new Date().toISOString(),
                leida: false
            });
            
            alert('Reserva actualizada exitosamente');
            cerrarModal('modal-reserva');
            cargarReservas();
            cargarDashboard();
        }
    } catch (error) {
        console.error('Error al actualizar reserva:', error);
        alert('Error al actualizar reserva. Por favor intente nuevamente.');
    }
});

// Funciones para eliminar elementos (con confirmación)
const eliminarLibro = (id) => {
    elementoAEliminar = id;
    tipoAEliminar = 'libros';
    document.getElementById('confirmacion-mensaje').textContent = '¿Estás seguro de que deseas eliminar este libro? Esta acción no se puede deshacer.';
    showModal('modal-confirmacion');
};

const eliminarUsuario = (id) => {
    elementoAEliminar = id;
    tipoAEliminar = 'usuarios';
    document.getElementById('confirmacion-mensaje').textContent = '¿Estás seguro de que deseas eliminar este usuario? Esta acción no se puede deshacer.';
    showModal('modal-confirmacion');
};

const eliminarPrestamo = (id) => {
    elementoAEliminar = id;
    tipoAEliminar = 'prestamos';
    document.getElementById('confirmacion-mensaje').textContent = '¿Estás seguro de que deseas eliminar este préstamo? Esta acción no se puede deshacer.';
    showModal('modal-confirmacion');
};

const eliminarMulta = (id) => {
    elementoAEliminar = id;
    tipoAEliminar = 'multas';
    document.getElementById('confirmacion-mensaje').textContent = '¿Estás seguro de que deseas eliminar esta multa? Esta acción no se puede deshacer.';
    showModal('modal-confirmacion');
};

const eliminarReserva = (id) => {
    elementoAEliminar = id;
    tipoAEliminar = 'reservas';
    document.getElementById('confirmacion-mensaje').textContent = '¿Estás seguro de que deseas eliminar esta reserva? Esta acción no se puede deshacer.';
    showModal('modal-confirmacion');
};

const confirmarEliminacion = async () => {
    if (!elementoAEliminar || !tipoAEliminar) return;
    
    try {
        await deleteItem(tipoAEliminar, elementoAEliminar);
        
        // Crear notificación
        await addItem('notificaciones', {
            titulo: `Eliminación de ${tipoAEliminar}`,
            mensaje: `Se ha eliminado un elemento del tipo ${tipoAEliminar}.`,
            fecha: new Date().toISOString(),
            leida: false
        });
        
        alert('Elemento eliminado exitosamente');
        
        // Recargar la sección correspondiente
        switch(tipoAEliminar) {
            case 'libros':
                cargarLibros();
                break;
            case 'usuarios':
                cargarUsuarios();
                break;
            case 'prestamos':
                cargarPrestamos();
                break;
            case 'multas':
                cargarMultas();
                break;
            case 'reservas':
                cargarReservas();
                break;
        }
        
        cerrarModal('modal-confirmacion');
        elementoAEliminar = null;
        tipoAEliminar = null;
        cargarDashboard();
    } catch (error) {
        console.error('Error al eliminar elemento:', error);
        alert('Error al eliminar elemento. Por favor intente nuevamente.');
    }
};

// Funciones de búsqueda
const buscarLibros = async (termino) => {
    try {
        const libros = await getAllItems('libros');
        const tabla = document.getElementById('tabla-libros').querySelector('tbody');
        tabla.innerHTML = '';
        
        const terminoLower = termino.toLowerCase();
        const puedeEditar = tienePermisos();
        
        for (const libro of libros) {
            if (!termino || 
                libro.titulo.toLowerCase().includes(terminoLower) || 
                libro.autor.toLowerCase().includes(terminoLower) || 
                libro.genero.toLowerCase().includes(terminoLower)) {
                
                let accionesHTML = '';
                if (puedeEditar) {
                accionesHTML = `
                        <div class="action-buttons">
                            <button class="btn btn-primary btn-sm" onclick="editarLibro(${libro.id})">Editar</button>
                            <button class="btn btn-danger btn-sm" onclick="eliminarLibro(${libro.id})">Eliminar</button>
                        </div>
                    `;
                } else {
                    accionesHTML = '<span class="restricted">Acción restringida</span>';
                }
                
                // Mostrar información del archivo
                let archivoHTML = 'No';
                if (libro.archivo) {
                    const extension = libro.archivo.name.split('.').pop().toUpperCase();
                    archivoHTML = `
                        <div>
                            <i class="fas fa-file file-icon"></i>
                            <span>${libro.archivo.name}</span>
                            <span class="file-type-badge">${extension}</span>
                        </div>
                    `;
                }
                
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${libro.titulo}</td>
                    <td>${libro.autor}</td>
                    <td>${libro.genero}</td>
                    <td><span class="status-badge ${libro.disponibles > 0 ? 'badge-disponible' : 'badge-no-disponible'}">${libro.disponibles > 0 ? 'Sí' : 'No'}</span></td>
                    <td>${archivoHTML}</td>
                    <td>${accionesHTML}</td>
                `;
                tabla.appendChild(tr);
            }
        }
    } catch (error) {
        console.error('Error al buscar libros:', error);
    }
};

const buscarUsuarios = async (termino) => {
    try {
        const usuarios = await getAllItems('usuarios');
        const tabla = document.getElementById('tabla-usuarios').querySelector('tbody');
        tabla.innerHTML = '';
        
        const terminoLower = termino.toLowerCase();
        const puedeEditar = tienePermisos();
        
        for (const usuario of usuarios) {
            const nombreCompleto = usuario.nombre.split(' ');
            const nombre = nombreCompleto[0] || '';
            const apellido = nombreCompleto.slice(1).join(' ') || '';
            
            if (!termino || 
                usuario.nombre.toLowerCase().includes(terminoLower) || 
                usuario.email.toLowerCase().includes(terminoLower) || 
                usuario.dni.toLowerCase().includes(terminoLower)) {
                
                let accionesHTML = '';
                if (puedeEditar) {
                    accionesHTML = `
                        <div class="action-buttons">
                            <button class="btn btn-primary btn-sm" onclick="editarUsuario(${usuario.id})">Editar</button>
                            <button class="btn btn-danger btn-sm" onclick="eliminarUsuario(${usuario.id})">Eliminar</button>
                            <button class="btn btn-renew btn-sm" onclick="renovarUsuario(${usuario.id})">Renovar</button>
                        </div>
                    `;
                } else {
                    accionesHTML = '<span class="restricted">Acción restringida</span>';
                }
                
                // Estado de expiración
                let estadoHTML = '';
                if (usuario.expiracion) {
                    const fechaExpiracion = new Date(usuario.expiracion);
                    const hoy = new Date();
                    
                    if (fechaExpiracion < hoy) {
                        estadoHTML = '<span class="badge badge-danger">Expirado</span>';
                    } else {
                        estadoHTML = `<span class="badge badge-success">Válido hasta ${fechaExpiracion.toLocaleDateString()}</span>`;
                    }
                } else {
                    estadoHTML = '<span class="badge badge-warning">Sin definir</span>';
                }
                
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${nombre}</td>
                    <td>${apellido}</td>
                    <td>${usuario.dni}</td>
                    <td>${usuario.email}</td>
                    <td>${usuario.telefono || ''}</td>
                    <td>${estadoHTML}</td>
                    <td>${accionesHTML}</td>
                `;
                tabla.appendChild(tr);
            }
        }
    } catch (error) {
        console.error('Error al buscar usuarios:', error);
    }
};

const buscarPrestamos = async (termino) => {
    try {
        const prestamos = await getAllItems('prestamos');
        const tabla = document.getElementById('tabla-prestamos').querySelector('tbody');
        tabla.innerHTML = '';
        
        const terminoLower = termino.toLowerCase();
        const puedeEditar = tienePermisos();
        
        for (const prestamo of prestamos) {
            const libro = await getItem('libros', prestamo.libro_id);
            const usuario = await getItem('usuarios', prestamo.usuario_id);
            
            if (!termino || 
                (libro && libro.titulo.toLowerCase().includes(terminoLower)) || 
                (libro && libro.autor.toLowerCase().includes(terminoLower)) ||
                (usuario && usuario.nombre.toLowerCase().includes(terminoLower))) {
                
                const fechaPrestamo = new Date(prestamo.fecha_prestamo);
                const fechaDevolucion = new Date(prestamo.fecha_devolucion);
                
                let accionesHTML = '';
                if (puedeEditar) {
                    accionesHTML = `
                        <div class="loan-actions">
                            ${prestamo.estado === 'activo' ? `
                                <button class="btn btn-success btn-sm" onclick="registrarDevolucion(${prestamo.id})">Registrar Devolución</button>
                                <button class="btn btn-warning btn-sm" onclick="renovarPrestamo(${prestamo.id})">Renovar Préstamo</button>
                                <button class="btn btn-reminder btn-sm" onclick="enviarRecordatorio(${prestamo.id})">Enviar Recordatorio</button>
                            ` : ''}
                            <button class="btn btn-danger btn-sm" onclick="eliminarPrestamo(${prestamo.id})">Eliminar</button>
                        </div>
                    `;
                } else {
                    accionesHTML = '<span class="restricted">Acción restringida</span>';
                }
                
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${libro ? libro.titulo : 'Libro eliminado'}</td>
                    <td>${libro ? libro.autor : 'Autor desconocido'}</td>
                    <td>${usuario ? usuario.nombre : 'Usuario eliminado'}</td>
                    <td>${fechaPrestamo.toLocaleDateString()}</td>
                    <td>${fechaDevolucion.toLocaleDateString()}</td>
                    <td><span class="status-badge ${prestamo.estado === 'activo' ? 'badge-pendiente' : 'badge-pagado'}">${prestamo.estado === 'activo' ? 'Activo' : 'Inactivo'}</span></td>
                    <td>${accionesHTML}</td>
                `;
                tabla.appendChild(tr);
            }
        }
    } catch (error) {
        console.error('Error al buscar préstamos:', error);
    }
};

const buscarMultas = async (termino) => {
    try {
        const multas = await getAllItems('multas');
        const tabla = document.getElementById('tabla-multas').querySelector('tbody');
        tabla.innerHTML = '';
        
        const terminoLower = termino.toLowerCase();
        const puedeEditar = tienePermisos();
        
        for (const multa of multas) {
            const usuario = await getItem('usuarios', multa.usuario_id);
            const prestamo = multa.prestamo_id ? await getItem('prestamos', multa.prestamo_id) : null;
            const libro = prestamo ? await getItem('libros', prestamo.libro_id) : null;
            
            const fecha = new Date(multa.fecha);
            const hoy = new Date();
            const diasPasados = Math.floor((hoy - fecha) / (1000 * 60 * 60 * 24));
            
            let filaClase = '';
            if (multa.estado === 'pendiente' && diasPasados > 30) {
                filaClase = 'multa-urgente';
            } else if (multa.estado === 'pendiente') {
                filaClase = 'multa-pendiente';
            } else if (multa.estado === 'pagado') {
                filaClase = 'multa-pagada';
            }
            
            // Aplicar filtro
            if (estadoFiltroMultas === 'pendiente' && multa.estado !== 'pendiente') continue;
            if (estadoFiltroMultas === 'pagado' && multa.estado !== 'pagado') continue;
            if (estadoFiltroMultas === 'urgente' && (multa.estado !== 'pendiente' || diasPasados <= 30)) continue;
            
            // Verificar si coincide con el término de búsqueda
            if (termino && 
                !(usuario && usuario.nombre.toLowerCase().includes(terminoLower)) && 
                !(libro && libro.titulo.toLowerCase().includes(terminoLower)) &&
                !multa.motivo.toLowerCase().includes(terminoLower) &&
                !multa.monto.toString().includes(termino)) {
                continue;
            }
            
            let accionesHTML = '';
            if (puedeEditar) {
                accionesHTML = `
                    <div class="action-buttons">
                        <button class="btn btn-success btn-sm" onclick="pagarMulta(${multa.id})" ${multa.estado === 'pagado' ? 'disabled' : ''}>Pagar</button>
                        <button class="btn btn-primary btn-sm" onclick="editarMulta(${multa.id})">Editar</button>
                        <button class="btn btn-danger btn-sm" onclick="eliminarMulta(${multa.id})">Eliminar</button>
                    </div>
                `;
            } else {
                accionesHTML = '<span class="restricted">Acción restringida</span>';
            }
            
            const tr = document.createElement('tr');
            tr.className = filaClase;
            tr.innerHTML = `
                <td>${usuario ? usuario.nombre : 'Usuario eliminado'}</td>
                <td class="monto-cell">S/. ${multa.monto.toFixed(2)}</td>
                <td>${multa.motivo}${libro ? ` (${libro.titulo})` : ''}</td>
                <td>${fecha.toLocaleDateString()}</td>
                <td><span class="status-badge ${multa.estado === 'pendiente' ? 'badge-pendiente' : 'badge-pagado'}">${multa.estado === 'pendiente' ? 'Pendiente' : 'Pagado'}</span></td>
                <td>${accionesHTML}</td>
            `;
            tabla.appendChild(tr);
        }
    } catch (error) {
        console.error('Error al buscar multas:', error);
    }
};

const buscarReservas = async (termino) => {
    try {
        const reservas = await getAllItems('reservas');
        const tabla = document.getElementById('tabla-reservas').querySelector('tbody');
        tabla.innerHTML = '';
        
        const terminoLower = termino.toLowerCase();
        const puedeEditar = tienePermisos();
        
        for (const reserva of reservas) {
            const libro = await getItem('libros', reserva.libro_id);
            const usuario = await getItem('usuarios', reserva.usuario_id);
            
            if (!termino || 
                (libro && libro.titulo.toLowerCase().includes(terminoLower)) || 
                (libro && libro.autor.toLowerCase().includes(terminoLower)) ||
                (usuario && usuario.nombre.toLowerCase().includes(terminoLower))) {
                
                const fecha = new Date(reserva.fecha_reserva);
                
                let accionesHTML = '';
                if (puedeEditar) {
                    accionesHTML = `
                        <div class="action-buttons">
                            <button class="btn btn-primary btn-sm" onclick="editarReserva(${reserva.id})">Editar</button>
                            <button class="btn btn-danger btn-sm" onclick="eliminarReserva(${reserva.id})">Eliminar</button>
                        </div>
                    `;
                } else {
                    accionesHTML = '<span class="restricted">Acción restringida</span>';
                }
                
                // Determinar si el libro está disponible
                const disponible = libro && libro.disponibles > 0;
                
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${libro ? libro.titulo : 'Libro eliminado'}</td>
                    <td>${libro ? libro.autor : 'Autor desconocido'}</td>
                    <td>${usuario ? usuario.nombre : 'Usuario eliminado'}</td>
                    <td>${fecha.toLocaleDateString()}</td>
                    <td><span class="status-badge ${reserva.estado === 'pendiente' ? disponible ? 'badge-disponible' : 'badge-no-disponible' : 'badge-pagado'}">
                        ${reserva.estado === 'pendiente' ? (disponible ? 'Disponible' : 'No disponible') : 'Completada'}
                    </span></td>
                    <td>${accionesHTML}</td>
                `;
                tabla.appendChild(tr);
            }
        }
    } catch (error) {
        console.error('Error al buscar reservas:', error);
    }
};

// Nueva función para renovar usuario
const renovarUsuario = async (id) => {
    // Verificar permisos
    if (!tienePermisos()) {
        alert('No tiene permiso para realizar esta acción');
        return;
    }
    
    if (!confirm("¿Desea renovar la suscripción de este usuario por un año adicional?")) {
        return;
    }
    
    try {
        const usuario = await getItem('usuarios', id);
        if (!usuario) {
            alert('Usuario no encontrado');
            return;
        }

        // Calcular nueva fecha de expiración: un año a partir de hoy
        const hoy = new Date();
        const nuevaExpiracion = new Date();
        nuevaExpiracion.setFullYear(hoy.getFullYear() + 1);

        // Actualizar el usuario
        usuario.expiracion = nuevaExpiracion.toISOString();
        await updateItem('usuarios', id, usuario);

        // Crear notificación
        await addItem('notificaciones', {
            titulo: 'Usuario renovado',
            mensaje: `Se ha renovado la suscripción del usuario ${usuario.nombre} hasta ${nuevaExpiracion.toLocaleDateString()}.`,
            fecha: new Date().toISOString(),
            leida: false
        });

        alert('Usuario renovado exitosamente hasta ' + nuevaExpiracion.toLocaleDateString());
        cargarUsuarios();
        cargarDashboard();
    } catch (error) {
        console.error('Error al renovar usuario:', error);
        alert('Error al renovar usuario. Por favor intente nuevamente.');
    }
};

// Función para filtrar multas por estado
const filtrarMultas = (filtro) => {
    estadoFiltroMultas = filtro;
    
    // Actualizar botones de filtro
    document.querySelectorAll('.status-filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Recargar multas
    buscarMultas(document.getElementById('search-multas').value);
};

// Funciones para el autocompletado
const buscarUsuariosAutocompletado = async (termino) => {
    try {
        const usuarios = await getAllItems('usuarios');
        const terminoLower = termino.toLowerCase();
        
        // Filtrar usuarios que coincidan con el término de búsqueda
        return usuarios.filter(usuario => {
            const partesNombre = usuario.nombre.toLowerCase().split(' ');
            return partesNombre.some(parte => parte.includes(terminoLower));
        });
    } catch (error) {
        console.error('Error al buscar usuarios para autocompletado:', error);
        return [];
    }
};

// Eventos para el autocompletado de usuarios en multas
document.getElementById('multa-usuario-input').addEventListener('input', async function(e) {
    const termino = e.target.value.trim();
    const sugerenciasContainer = document.getElementById('multa-usuario-suggestions');
    
    if (termino.length < 2) {
        sugerenciasContainer.innerHTML = '';
        sugerenciasContainer.classList.remove('show');
        return;
    }
    
    const usuarios = await buscarUsuariosAutocompletado(termino);
    mostrarSugerenciasUsuarios(usuarios, sugerenciasContainer, e.target);
});

function mostrarSugerenciasUsuarios(usuarios, container, inputElement) {
    container.innerHTML = '';
    
    if (usuarios.length === 0) {
        const item = document.createElement('div');
        item.className = 'suggestion-item';
        item.textContent = 'No se encontraron usuarios';
        container.appendChild(item);
    } else {
        usuarios.forEach((usuario, index) => {
            const item = document.createElement('div');
            item.className = 'suggestion-item';
            item.innerHTML = `
                <div class="user-name">${usuario.nombre}</div>
                <div class="user-fullname">${usuario.email}</div>
            `;
            
            item.addEventListener('click', () => {
                inputElement.value = usuario.nombre;
                document.getElementById('multa-usuario-id').value = usuario.id;
                container.classList.remove('show');
            });
            
            container.appendChild(item);
        });
    }
    
    container.classList.add('show');
    highlightedSuggestionIndex = -1;
}

// Eventos para el autocompletado en el modal de reservas
document.getElementById('reserva-libro-input').addEventListener('input', async function(e) {
    const termino = e.target.value.trim();
    const sugerenciasContainer = document.getElementById('reserva-libro-suggestions');
    
    if (termino.length < 2) {
        sugerenciasContainer.innerHTML = '';
        sugerenciasContainer.classList.remove('show');
        return;
    }
    
    const libros = await buscarLibrosAutocompletado(termino);
    mostrarSugerenciasLibros(libros, sugerenciasContainer, e.target);
});

document.getElementById('reserva-usuario-input').addEventListener('input', async function(e) {
    const termino = e.target.value.trim();
    const sugerenciasContainer = document.getElementById('reserva-usuario-suggestions');
    
    if (termino.length < 2) {
        sugerenciasContainer.innerHTML = '';
        sugerenciasContainer.classList.remove('show');
        return;
    }
    
    const usuarios = await buscarUsuariosAutocompletado(termino);
    mostrarSugerenciasUsuarios(usuarios, sugerenciasContainer, e.target);
});

// Función para mostrar sugerencias de libros
function mostrarSugerenciasLibros(libros, container, inputElement) {
    container.innerHTML = '';
    
    if (libros.length === 0) {
        const item = document.createElement('div');
        item.className = 'suggestion-item';
        item.textContent = 'No se encontraron libros';
        container.appendChild(item);
    } else {
        libros.forEach((libro, index) => {
            const item = document.createElement('div');
            item.className = 'suggestion-item';
            item.innerHTML = `
                <div class="title">${libro.titulo}</div>
                <div class="author">${libro.autor}</div>
            `;
            
            item.addEventListener('click', () => {
                inputElement.value = libro.titulo;
                document.getElementById('reserva-libro-id').value = libro.id;
                container.classList.remove('show');
            });
            
            container.appendChild(item);
        });
    }
    
    container.classList.add('show');
    highlightedSuggestionIndex = -1;
}

// Función para buscar libros (para autocompletado)
const buscarLibrosAutocompletado = async (termino) => {
    try {
        const libros = await getAllItems('libros');
        const terminoLower = termino.toLowerCase();
        
        // Filtrar libros que coincidan con el término de búsqueda
        return libros.filter(libro => {
            return libro.titulo.toLowerCase().includes(terminoLower) || 
                   libro.autor.toLowerCase().includes(terminoLower);
        });
    } catch (error) {
        console.error('Error al buscar libros para autocompletado:', error);
        return [];
    }
};

// Funciones para la sección de configuración
function resetFineSettings() {
    if (confirm("¿Restablecer valores predeterminados de multas?")) {
        document.getElementById('fine-per-day').value = "2.0";
        document.getElementById('max-fine').value = "50";
        document.getElementById('grace-period').value = "3";
        document.getElementById('exempt-admin').checked = true;
        document.getElementById('exempt-librarian').checked = true;
        alert("Configuración de multas restablecida");
    }
}

function createBackup() {
    alert("Creando backup del sistema...");
    // Simulación de proceso de backup
    setTimeout(() => {
        // Agregar nuevo elemento al historial
        const backupHistory = document.querySelector('.backup-history tbody');
        const now = new Date();
        const dateStr = `${now.getDate()}/${now.getMonth()+1}/${now.getFullYear()} ${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`;
        
        const newRow = document.createElement('tr');
        newRow.innerHTML = `
            <td>${dateStr}</td>
            <td>2.5 MB</td>
            <td><span class="badge badge-success">Completado</span></td>
            <td><button class="btn btn-sm btn-success" onclick="restoreBackup(${backupHistory.children.length + 1})">Restaurar</button></td>
        `;
        
        backupHistory.prepend(newRow);
        alert("Backup creado exitosamente");
    }, 1500);
}

function restoreBackup(id) {
    if (confirm(`¿Restaurar sistema desde el backup #${id}? Esta acción sobrescribirá los datos actuales.`)) {
        alert("Restaurando sistema desde backup...");
        // Simulación de proceso de restauración
        setTimeout(() => {
            alert("Sistema restaurado exitosamente");
        }, 2000);
    }
}

function saveConfiguration() {
    alert("Configuración guardada exitosamente");
}

// Eventos para la configuración
document.getElementById('library-logo').addEventListener('change', function(e) {
    const fileName = e.target.files.length > 0 ? e.target.files[0].name : 'biblioperu-logo.png';
    document.getElementById('logo-name').textContent = fileName;
});

document.getElementById('custom-logo').addEventListener('change', function(e) {
    const fileName = e.target.files.length > 0 ? e.target.files[0].name : 'No se ha seleccionado ningún archivo';
    document.getElementById('custom-logo-name').textContent = fileName;
});

// Funciones específicas para reportes
document.getElementById('reporte-periodo').addEventListener('change', function() {
    const personalizado = document.getElementById('filtro-personalizado');
    personalizado.style.display = this.value === 'personalizado' ? 'block' : 'none';
});

const aplicarFiltroPersonalizado = () => {
    const fechaInicio = document.getElementById('fecha-inicio').value;
    const fechaFin = document.getElementById('fecha-fin').value;
    
    if (!fechaInicio || !fechaFin) {
        alert('Por favor seleccione ambas fechas');
        return;
    }
    
    if (new Date(fechaFin) < new Date(fechaInicio)) {
        alert('La fecha de fin debe ser posterior a la fecha de inicio');
        return;
    }
    
    generarReporte();
};

const generarReporte = async () => {
    const tipo = document.getElementById('reporte-tipo').value;
    const periodo = document.getElementById('reporte-periodo').value;
    const formato = document.getElementById('reporte-formato').value;
    
    reporteActual = { tipo, periodo, formato };
    
    const contenedor = document.getElementById('contenedor-reportes-generados');
    contenedor.innerHTML = '<div class="no-data"><i class="fas fa-spinner fa-spin"></i><p>Generando reporte...</p></div>';
    
    try {
        // Simular tiempo de generación
        setTimeout(async () => {
            datosReporte = await obtenerDatosReporte(tipo, periodo);
            
            if (formato === 'pdf') {
                // En un entorno real, aquí se generaría el PDF para descargar
                alert('Reporte generado en PDF. Descargando...');
                // Para este ejemplo, mostramos una vista previa
                contenedor.innerHTML = generarVistaPreviaPDF(datosReporte);
            } else if (formato === 'excel') {
                alert('Reporte generado en Excel. Descargando...');
                // Mostrar datos en tabla para simular Excel
                contenedor.innerHTML = generarVistaTabla(datosReporte);
            } else {
                // Vista previa HTML
                contenedor.innerHTML = generarVistaHTML(datosReporte);
            }
        }, 1500);
    } catch (error) {
        console.error('Error al generar reporte:', error);
        contenedor.innerHTML = `<div class="alert alert-danger">Error al generar el reporte: ${error.message}</div>`;
    }
};

const obtenerDatosReporte = async (tipo, periodo) => {
    // Obtener datos de la base de datos según el tipo de reporte
    let datos = {};
    
    switch(tipo) {
        case 'libros-prestados':
            const prestamos = await getAllItems('prestamos');
            const libros = await getAllItems('libros');
            
            // Contar préstamos por libro
            const conteoLibros = {};
            for (const prestamo of prestamos) {
                const libroId = prestamo.libro_id;
                conteoLibros[libroId] = (conteoLibros[libroId] || 0) + 1;
            }
            
            // Crear lista de libros con conteo
            datos.libros = libros.map(libro => {
                return {
                    titulo: libro.titulo,
                    autor: libro.autor,
                    prestamos: conteoLibros[libro.id] || 0
                };
            }).sort((a, b) => b.prestamos - a.prestamos).slice(0, 10);
            
            datos.titulo = 'Libros más prestados';
            datos.subtitulo = 'Top 10 de libros con más préstamos';
            datos.periodo = periodo;
            break;
            
        case 'usuarios-activos':
            const usuarios = await getAllItems('usuarios');
            
            // Contar préstamos por usuario
            const conteoUsuarios = {};
            for (const prestamo of prestamos) {
                const usuarioId = prestamo.usuario_id;
                conteoUsuarios[usuarioId] = (conteoUsuarios[usuarioId] || 0) + 1;
            }
            
            // Crear lista de usuarios con conteo
            datos.usuarios = usuarios.map(usuario => {
                return {
                    nombre: usuario.nombre,
                    prestamos: conteoUsuarios[usuario.id] || 0
                };
            }).sort((a, b) => b.prestamos - a.prestamos).slice(0, 10);
            
            datos.titulo = 'Usuarios más activos';
            datos.subtitulo = 'Top 10 de usuarios con más préstamos';
            datos.periodo = periodo;
            break;
            
        case 'historial-multas':
            const multas = await getAllItems('multas');
            
            // Calcular resumen de multas
            datos.multas = multas;
            datos.totalPendiente = multas.filter(m => m.estado === 'pendiente').reduce((sum, m) => sum + m.monto, 0);
            datos.totalPagado = multas.filter(m => m.estado === 'pagado').reduce((sum, m) => sum + m.monto, 0);
            
            datos.titulo = 'Historial de multas';
            datos.subtitulo = 'Resumen de multas generadas';
            datos.periodo = periodo;
            break;
            
        case 'prestamos-periodo':
            // Filtrar préstamos por período seleccionado
            let fechaInicio, fechaFin;
            const hoy = new Date();
            
            switch(periodo) {
                case 'mensual':
                    fechaInicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
                    fechaFin = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
                    break;
                case 'trimestral':
                    const trimestre = Math.floor(hoy.getMonth() / 3);
                    fechaInicio = new Date(hoy.getFullYear(), trimestre * 3, 1);
                    fechaFin = new Date(hoy.getFullYear(), (trimestre * 3) + 3, 0);
                    break;
                case 'semestral':
                    const semestre = Math.floor(hoy.getMonth() / 6);
                    fechaInicio = new Date(hoy.getFullYear(), semestre * 6, 1);
                    fechaFin = new Date(hoy.getFullYear(), (semestre * 6) + 6, 0);
                    break;
                case 'anual':
                    fechaInicio = new Date(hoy.getFullYear(), 0, 1);
                    fechaFin = new Date(hoy.getFullYear(), 11, 31);
                    break;
                case 'personalizado':
                    fechaInicio = new Date(document.getElementById('fecha-inicio').value);
                    fechaFin = new Date(document.getElementById('fecha-fin').value);
                    break;
            }
            
            // Obtener préstamos en el rango de fechas
            datos.prestamos = prestamos.filter(p => {
                const fechaPrestamo = new Date(p.fecha_prestamo);
                return fechaPrestamo >= fechaInicio && fechaPrestamo <= fechaFin;
            });
            
            datos.titulo = 'Préstamos por período';
            datos.subtitulo = `Préstamos realizados entre ${fechaInicio.toLocaleDateString()} y ${fechaFin.toLocaleDateString()}`;
            datos.periodo = periodo;
            break;
            
        case 'inventario':
            datos.libros = await getAllItems('libros');
            datos.titulo = 'Inventario completo';
            datos.subtitulo = 'Catálogo completo de libros';
            datos.periodo = periodo;
            break;
            
        default:
            throw new Error('Tipo de reporte no válido');
    }
    
    datos.fechaGeneracion = new Date().toLocaleString();
    return datos;
};

const generarVistaHTML = (datos) => {
    let html = `
        <div class="reporte-container">
            <h3 class="reporte-titulo">${datos.titulo}</h3>
            <p class="reporte-subtitulo">${datos.subtitulo}</p>
            <p class="reporte-info">Generado el: ${datos.fechaGeneracion}</p>
    `;
    
    switch(reporteActual.tipo) {
        case 'libros-prestados':
            html += `
                <div class="grafico-container">
                    <canvas id="grafico-barras"></canvas>
                </div>
                <table class="reporte-table">
                    <thead>
                        <tr>
                            <th>Título</th>
                            <th>Autor</th>
                            <th>Préstamos</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${datos.libros.map(libro => `
                            <tr>
                                <td>${libro.titulo}</td>
                                <td>${libro.autor}</td>
                                <td>${libro.prestamos}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
            break;
            
        case 'usuarios-activos':
            html += `
                <div class="grafico-container">
                    <canvas id="grafico-usuarios"></canvas>
                </div>
                <table class="reporte-table">
                    <thead>
                        <tr>
                            <th>Usuario</th>
                            <th>Préstamos</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${datos.usuarios.map(usuario => `
                            <tr>
                                <td>${usuario.nombre}</td>
                                <td>${usuario.prestamos}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
            break;
            
        case 'historial-multas':
            html += `
                <div class="reporte-grid">
                    <div class="reporte-item">
                        <h4>Resumen de Multas</h4>
                        <ul class="reporte-lista">
                            <li><span>Total Pendiente:</span> <strong>S/. ${datos.totalPendiente.toFixed(2)}</strong></li>
                            <li><span>Total Pagado:</span> <strong>S/. ${datos.totalPagado.toFixed(2)}</strong></li>
                            <li><span>Total General:</span> <strong>S/. ${(datos.totalPendiente + datos.totalPagado).toFixed(2)}</strong></li>
                        </ul>
                    </div>
                    <div class="reporte-item">
                        <h4>Distribución</h4>
                        <div class="grafico-container">
                            <canvas id="grafico-multas"></canvas>
                        </div>
                    </div>
                </div>
                <h4 class="reporte-subtitulo">Detalle de Multas</h4>
                <table class="reporte-table">
                    <thead>
                        <tr>
                            <th>Usuario</th>
                            <th>Monto</th>
                            <th>Motivo</th>
                            <th>Fecha</th>
                            <th>Estado</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${datos.multas.map(multa => `
                            <tr>
                                <td>${multa.usuario_id}</td>
                                <td>S/. ${multa.monto.toFixed(2)}</td>
                                <td>${multa.motivo}</td>
                                <td>${new Date(multa.fecha).toLocaleDateString()}</td>
                                <td>${multa.estado === 'pendiente' ? 'Pendiente' : 'Pagado'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
            break;
            
        case 'prestamos-periodo':
            html += `
                <div class="reporte-item">
                    <h4>Total de Préstamos: ${datos.prestamos.length}</h4>
                </div>
                <table class="reporte-table">
                    <thead>
                        <tr>
                            <th>Libro</th>
                            <th>Usuario</th>
                            <th>Fecha Préstamo</th>
                            <th>Fecha Devolución</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${datos.prestamos.map(prestamo => `
                            <tr>
                                <td>${prestamo.libro_id}</td>
                                <td>${prestamo.usuario_id}</td>
                                <td>${new Date(prestamo.fecha_prestamo).toLocaleDateString()}</td>
                                <td>${new Date(prestamo.fecha_devolucion).toLocaleDateString()}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
            break;
            
        case 'inventario':
            html += `
                <div class="reporte-item">
                    <h4>Total de Libros: ${datos.libros.length}</h4>
                </div>
                <table class="reporte-table">
                    <thead>
                        <tr>
                            <th>Título</th>
                            <th>Autor</th>
                            <th>Género</th>
                            <th>Disponibles</th>
                            <th>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${datos.libros.map(libro => `
                            <tr>
                                <td>${libro.titulo}</td>
                                <td>${libro.autor}</td>
                                <td>${libro.genero}</td>
                                <td>${libro.disponibles}</td>
                                <td>${libro.ejemplares}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
            break;
    }
    
    html += `
        <div style="margin-top: 20px; text-align: center;">
            <button class="btn btn-descargar" onclick="descargarReporteHTML()">
                <i class="fas fa-download"></i> Descargar Reporte
            </button>
        </div>
    </div>
    `;
    
    // Renderizar gráficos después de que el HTML se haya insertado
    setTimeout(() => {
        renderizarGraficos(datos);
    }, 100);
    
    return html;
};

const generarVistaTabla = (datos) => {
    // Esta función simularía la vista de Excel mostrando una tabla
    return generarVistaHTML(datos);
};

const generarVistaPreviaPDF = (datos) => {
    // En un entorno real, esto generaría un PDF real
    // Aquí mostramos una vista previa simulada
    return `
        <div class="pdf-preview">
            <div class="pdf-preview-header">
                <h3 class="pdf-preview-title">${datos.titulo}</h3>
                <p class="pdf-preview-subtitle">${datos.subtitulo}</p>
                <p>Generado el: ${datos.fechaGeneracion}</p>
            </div>
            
            <div class="pdf-preview-content">
                <p>Este es un ejemplo de cómo se vería el reporte en formato PDF. En una implementación real, se generaría un archivo PDF descargable.</p>
                
                ${datos.libros ? `
                    <h4>Libros más prestados</h4>
                    <table style="width:100%; border-collapse: collapse; margin-bottom: 20px;">
                        <thead>
                            <tr style="background-color: #f2f2f2;">
                                <th style="border: 1px solid #ddd; padding: 8px;">Título</th>
                                <th style="border: 1px solid #ddd; padding: 8px;">Autor</th>
                                <th style="border: 1px solid #ddd; padding: 8px;">Préstamos</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${datos.libros.slice(0, 5).map(libro => `
                                <tr>
                                    <td style="border: 1px solid #ddd; padding: 8px;">${libro.titulo}</td>
                                    <td style="border: 1px solid #ddd; padding: 8px;">${libro.autor}</td>
                                    <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${libro.prestamos}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                ` : ''}
                
                <p style="page-break-before: always;">Continuación del reporte...</p>
            </div>
            
            <div class="pdf-preview-footer">
                Página 1 de 1 | BiblioPerú - Sistema de Gestión de Bibliotecas
            </div>
        </div>
        
        <div style="margin-top: 20px; text-align: center;">
            <button class="btn btn-descargar" onclick="descargarReportePDF()">
                <i class="fas fa-download"></i> Descargar PDF
            </button>
            <button class="btn btn-primary" onclick="generarReporte()" style="margin-left: 10px;">
                <i class="fas fa-sync"></i> Regenerar
            </button>
        </div>
    `;
};

const renderizarGraficos = (datos) => {
    switch(reporteActual.tipo) {
        case 'libros-prestados':
            const ctxBarras = document.getElementById('grafico-barras').getContext('2d');
            new Chart(ctxBarras, {
                type: 'bar',
                data: {
                    labels: datos.libros.map(l => l.titulo.substring(0, 20) + (l.titulo.length > 20 ? '...' : '')),
                    datasets: [{
                        label: 'Número de préstamos',
                        data: datos.libros.map(l => l.prestamos),
                        backgroundColor: 'rgba(54, 162, 235, 0.6)',
                        borderColor: 'rgba(54, 162, 235, 1)',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            });
            break;
            
        case 'usuarios-activos':
            const ctxUsuarios = document.getElementById('grafico-usuarios').getContext('2d');
            new Chart(ctxUsuarios, {
                type: 'bar',
                data: {
                    labels: datos.usuarios.map(u => u.nombre.substring(0, 15) + (u.nombre.length > 15 ? '...' : '')),
                    datasets: [{
                        label: 'Préstamos por usuario',
                        data: datos.usuarios.map(u => u.prestamos),
                        backgroundColor: 'rgba(75, 192, 192, 0.6)',
                        borderColor: 'rgba(75, 192, 192, 1)',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            });
            break;
            
        case 'historial-multas':
            const ctxMultas = document.getElementById('grafico-multas').getContext('2d');
            new Chart(ctxMultas, {
                type: 'doughnut',
                data: {
                    labels: ['Pendiente', 'Pagado'],
                    datasets: [{
                        data: [datos.totalPendiente, datos.totalPagado],
                        backgroundColor: [
                            'rgba(255, 99, 132, 0.6)',
                            'rgba(75, 192, 192, 0.6)'
                        ],
                        borderColor: [
                            'rgba(255, 99, 132, 1)',
                            'rgba(75, 192, 192, 1)'
                        ],
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false
                }
            });
            break;
    }
};

const descargarReporteHTML = () => {
    alert('En un entorno real, esto generaría un archivo HTML descargable con el reporte actual');
};

const descargarReportePDF = () => {
    alert('En un entorno real, esto generaría un archivo PDF descargable con el reporte actual');
};

const descargarReporte = (tipo) => {
    // Para los reportes predefinidos
    alert(`Descargando reporte: ${tipo}`);
    // En una implementación real, aquí se generaría el reporte solicitado
};

// ================= FUNCIONES PARA NOTIFICACIONES MEJORADAS =================
const cargarNotificaciones = async () => {
    try {
        const notificaciones = await getAllItems('notificaciones');
        const lista = document.getElementById('lista-notificaciones');
        lista.innerHTML = '';
        
        // Ordenar por fecha (más recientes primero)
        notificaciones.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
        
        let hayNotificaciones = false;
        
        for (const notificacion of notificaciones) {
            // Aplicar filtros
            if (!aplicaFiltros(notificacion)) continue;
            
            const fecha = new Date(notificacion.fecha);
            const fechaFormateada = `${fecha.getDate()}/${fecha.getMonth() + 1}/${fecha.getFullYear()} ${fecha.getHours()}:${fecha.getMinutes().toString().padStart(2, '0')}`;
            
            const li = document.createElement('li');
            li.className = `notification-item ${notificacion.leida ? '' : 'unread'} 
                           ${notificacion.archivada ? 'archived' : ''} 
                           ${notificacion.destacada ? 'starred' : ''}
                           notification-fade-in`;
            li.tabIndex = 0; // Hacer enfocable para accesibilidad
            li.setAttribute('role', 'article');
            li.setAttribute('aria-labelledby', `notification-title-${notificacion.id}`);
            
            let prioridadHTML = '';
            if (notificacion.prioridad) {
                prioridadHTML = `<span class="priority-indicator priority-${notificacion.prioridad}"></span>`;
            }
            
            let accionesHTML = '';
            if (notificacion.acciones && notificacion.acciones.length > 0) {
                accionesHTML = `<div class="notification-actions-bar">
                    ${notificacion.acciones.map(accion => `
                        <button class="btn btn-primary btn-sm" onclick="ejecutarAccionNotificacion(${notificacion.id}, '${accion.url}')">
                            ${accion.texto}
                        </button>
                    `).join('')}
                </div>`;
            }
            
            let accionesBarHTML = `
                <div class="notification-actions-bar">
                    <button class="notification-action-btn read" 
                        onclick="marcarComoLeida(${notificacion.id}, ${!notificacion.leida})"
                        aria-label="${notificacion.leida ? 'Marcar como no leída' : 'Marcar como leída'}">
                        <i class="fas fa-${notificacion.leida ? 'envelope-open' : 'envelope'}"></i>
                        ${notificacion.leida ? 'No leída' : 'Leída'}
                    </button>
                    <button class="notification-action-btn archive" 
                        onclick="archivarNotificacion(${notificacion.id}, ${!notificacion.archivada})"
                        aria-label="${notificacion.archivada ? 'Desarchivar' : 'Archivar'}">
                        <i class="fas fa-${notificacion.archivada ? 'inbox' : 'archive'}"></i>
                        ${notificacion.archivada ? 'Desarchivar' : 'Archivar'}
                    </button>
                    <button class="notification-action-btn star" 
                        onclick="destacarNotificacion(${notificacion.id}, ${!notificacion.destacada})"
                        aria-label="${notificacion.destacada ? 'Quitar destacado' : 'Destacar'}">
                        <i class="fas fa-${notificacion.destacada ? 'star' : 'star'}"></i>
                        ${notificacion.destacada ? 'Destacada' : 'Destacar'}
                    </button>
                    <button class="notification-action-btn delete" 
                        onclick="eliminarNotificacion(${notificacion.id})"
                        aria-label="Eliminar notificación">
                        <i class="fas fa-trash"></i> Eliminar
                    </button>
                </div>
            `;
            
            li.innerHTML = `
                <div class="notification-preview">
                    <div class="notification-details">
                        <div class="notification-header">
                            <strong id="notification-title-${notificacion.id}">${notificacion.titulo}</strong>
                            ${prioridadHTML}
                            ${notificacion.tipo ? `<span class="notification-badge">${notificacion.tipo}</span>` : ''}
                        </div>
                        <div class="notification-content">${notificacion.mensaje}</div>
                        ${accionesHTML}
                        ${accionesBarHTML}
                    </div>
                    <div class="notification-timestamp">${fechaFormateada}</div>
                </div>
            `;
            
            // Marcar como leída al hacer clic
            li.addEventListener('click', async (e) => {
                // Solo marcar como leída si se hace clic en la notificación, no en los botones
                if (e.target.tagName !== 'BUTTON') {
                    if (!notificacion.leida) {
                        notificacion.leida = true;
                        await updateItem('notificaciones', notificacion.id, notificacion);
                        li.classList.remove('unread');
                        
                        // Actualizar el botón
                        const btn = li.querySelector('.notification-action-btn.read');
                        if (btn) {
                            btn.innerHTML = `<i class="fas fa-envelope-open"></i> No leída`;
                            btn.setAttribute('aria-label', 'Marcar como no leída');
                        }
                    }
                }
            });
            
            lista.appendChild(li);
            hayNotificaciones = true;
        }
        
        // Mostrar mensaje si no hay notificaciones
        document.getElementById('no-notifications').style.display = hayNotificaciones ? 'none' : 'block';
    } catch (error) {
        console.error('Error al cargar notificaciones:', error);
    }
};

const aplicaFiltros = (notificacion) => {
    // Filtro de categoría
    if (notificacionFiltroCategoria !== 'todas') {
        if (notificacionFiltroCategoria === 'no_leidas' && notificacion.leida) return false;
        if (notificacionFiltroCategoria === 'archivadas' && !notificacion.archivada) return false;
        if (notificacionFiltroCategoria === 'destacadas' && !notificacion.destacada) return false;
        if (notificacionFiltroCategoria !== 'no_leidas' && 
            notificacionFiltroCategoria !== 'archivadas' && 
            notificacionFiltroCategoria !== 'destacadas' && 
            notificacion.tipo !== notificacionFiltroCategoria) {
            return false;
        }
    }
    
    // Filtro de prioridad
    if (notificacion.prioridad) {
        if (!notificacionFiltroPrioridad[notificacion.prioridad]) return false;
    }
    
    // Filtro de búsqueda
    if (notificacionFiltroBusqueda) {
        const busqueda = notificacionFiltroBusqueda.toLowerCase();
        if (!notificacion.titulo.toLowerCase().includes(busqueda) && 
            !notificacion.mensaje.toLowerCase().includes(busqueda) && 
            (!notificacion.tipo || !notificacion.tipo.toLowerCase().includes(busqueda))) {
            return false;
        }
    }
    
    return true;
};

const filtrarNotificaciones = (categoria) => {
    notificacionFiltroCategoria = categoria;
    
    // Actualizar botones de categoría
    document.querySelectorAll('.notification-categories .category-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    cargarNotificaciones();
};

const togglePriorityFilter = (prioridad) => {
    notificacionFiltroPrioridad[prioridad] = !notificacionFiltroPrioridad[prioridad];
    event.target.classList.toggle('active');
    event.target.setAttribute('aria-pressed', notificacionFiltroPrioridad[prioridad]);
    cargarNotificaciones();
};

const buscarNotificaciones = (termino) => {
    notificacionFiltroBusqueda = termino;
    cargarNotificaciones();
};

const marcarComoLeida = async (id, estado) => {
    try {
        const notificacion = await getItem('notificaciones', id);
        notificacion.leida = estado;
        await updateItem('notificaciones', id, notificacion);
        cargarNotificaciones();
    } catch (error) {
        console.error('Error al actualizar notificación:', error);
    }
};

const archivarNotificacion = async (id, estado) => {
    try {
        const notificacion = await getItem('notificaciones', id);
        notificacion.archivada = estado;
        await updateItem('notificaciones', id, notificacion);
        cargarNotificaciones();
    } catch (error) {
        console.error('Error al archivar notificación:', error);
    }
};

const destacarNotificacion = async (id, estado) => {
    try {
        const notificacion = await getItem('notificaciones', id);
        notificacion.destacada = estado;
        await updateItem('notificaciones', id, notificacion);
        cargarNotificaciones();
    } catch (error) {
        console.error('Error al destacar notificación:', error);
    }
};

const eliminarNotificacion = async (id) => {
    if (confirm("¿Estás seguro de eliminar esta notificación?")) {
        try {
            await deleteItem('notificaciones', id);
            cargarNotificaciones();
        } catch (error) {
            console.error('Error al eliminar notificación:', error);
        }
    }
};

const ejecutarAccionNotificacion = (id, url) => {
    // Marcar como leída al ejecutar acción
    marcarComoLeida(id, true);
    
    // Navegar a la URL especificada
    if (url) {
        // En un sistema real, esto podría usar un enrutador
        if (url.startsWith('#')) {
            showTab(url.substring(1));
        } else {
            // Redirección simulada
            alert(`Redirigiendo a: ${url}`);
        }
    }
};

// Simular notificaciones en tiempo real
const simularNotificacionesTiempoReal = () => {
    setInterval(async () => {
        // Solo si estamos en la pestaña de notificaciones
        if (document.getElementById('tab-notificaciones').classList.contains('active')) {
            // 20% de probabilidad de generar una notificación
            if (Math.random() < 0.2) {
                const tipos = ['informativo', 'advertencia', 'sistema', 'usuario'];
                const prioridades = ['baja', 'media', 'alta'];
                const acciones = [
                    [],
                    [{ texto: 'Ver detalles', url: '#tab-prestamos' }],
                    [{ texto: 'Resolver', url: '#tab-multas' }]
                ];
                
                const nuevaNotificacion = {
                    titulo: 'Notificación en tiempo real',
                    mensaje: 'Este es un evento simulado que ocurrió justo ahora',
                    tipo: tipos[Math.floor(Math.random() * tipos.length)],
                    prioridad: prioridades[Math.floor(Math.random() * prioridades.length)],
                    fecha: new Date().toISOString(),
                    leida: false,
                    archivada: false,
                    destacada: false,
                    acciones: acciones[Math.floor(Math.random() * acciones.length)]
                };
                
                await addItem('notificaciones', nuevaNotificacion);
                cargarNotificaciones();
                
                // Mostrar notificación flotante si corresponde
                mostrarNotificacionFlotante(nuevaNotificacion);
            }
        }
    }, 30000); // Cada 30 segundos
};

const mostrarNotificacionFlotante = (notificacion) => {
    // Solo mostrar si está habilitado en configuración
    if (!document.getElementById('toggle-modal').checked) return;
    
    // Verificar prioridad mínima configurada
    const minPriority = document.getElementById('min-priority').value;
    const priorityOrder = { baja: 0, media: 1, alta: 2 };
    if (priorityOrder[notificacion.prioridad] < priorityOrder[minPriority]) return;
    
    // Crear elemento de notificación flotante
    const notificationEl = document.createElement('div');
    notificationEl.className = 'notification-floating fade-in';
    notificationEl.style.position = 'fixed';
    notificationEl.style.bottom = '20px';
    notificationEl.style.right = '20px';
    notificationEl.style.backgroundColor = 'white';
    notificationEl.style.padding = '15px';
    notificationEl.style.borderRadius = '8px';
    notificationEl.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
    notificationEl.style.zIndex = '1000';
    notificationEl.style.maxWidth = '350px';
    notificationEl.style.borderLeft = `4px solid ${
        notificacion.prioridad === 'alta' ? 'var(--accent)' : 
        notificacion.prioridad === 'media' ? 'var(--warning)' : 'var(--success)'
    }`;
    
    notificationEl.innerHTML = `
        <div class="notification-header">
            <strong>${notificacion.titulo}</strong>
            <button class="btn btn-sm" onclick="this.parentElement.parentElement.remove()" 
                style="position: absolute; top: 5px; right: 5px;" aria-label="Cerrar notificación">
                <i class="fas fa-times"></i>
            </button>
        </div>
        <div class="notification-content">${notificacion.mensaje}</div>
        <div class="notification-actions" style="margin-top: 10px;">
            ${notificacion.acciones && notificacion.acciones.length > 0 ? 
              notificacion.acciones.map(accion => `
                <button class="btn btn-primary btn-sm" onclick="ejecutarAccionNotificacion(null, '${accion.url}'); this.parentElement.parentElement.remove()">
                    ${accion.texto}
                </button>
              `).join('') : 
              `<button class="btn btn-primary btn-sm" onclick="this.parentElement.parentElement.remove()">Aceptar</button>`
            }
            <button class="btn btn-secondary btn-sm" onclick="this.parentElement.parentElement.remove()">Descartar</button>
        </div>
    `;
    
    document.body.appendChild(notificationEl);
    
    // Auto-ocultar después de 10 segundos
    setTimeout(() => {
        if (notificationEl.parentNode) {
            notificationEl.style.opacity = '0';
            setTimeout(() => notificationEl.remove(), 300);
        }
    }, 10000);
};

// ================= FUNCIONES PARA SUGERENCIAS EN BUSCADORES =================
function mostrarNotificacionConfig(texto) {
    const notice = document.getElementById('config-change-notice');
    document.getElementById('config-notice-text').textContent = texto;
    notice.classList.add('show');
    
    setTimeout(() => {
        notice.classList.remove('show');
    }, 3000);
}

// Función para resaltar coincidencias en el texto
function resaltarCoincidencia(texto, busqueda) {
    if (!busqueda) return texto;
    
    const regex = new RegExp(`(${busqueda})`, 'gi');
    return texto.replace(regex, '<span class="suggestion-highlight">$1</span>');
}

// Función para crear el contenedor de sugerencias
function crearContenedorSugerencias(inputId) {
    const searchContainer = document.getElementById(inputId).parentElement;
    
    // Crear contenedor de sugerencias si no existe
    if (!document.getElementById(`${inputId}-suggestions`)) {
        const suggestionsDiv = document.createElement('div');
        suggestionsDiv.id = `${inputId}-suggestions`;
        suggestionsDiv.className = 'search-suggestions';
        searchContainer.appendChild(suggestionsDiv);
    }
    
    return document.getElementById(`${inputId}-suggestions`);
}

// Función para mostrar sugerencias
function mostrarSugerencias(suggestions, inputId, callbackSeleccion) {
    const suggestionsContainer = crearContenedorSugerencias(inputId);
    const busqueda = document.getElementById(inputId).value.trim();
    suggestionsContainer.innerHTML = '';
    
    if (suggestions.length === 0) {
        const item = document.createElement('div');
        item.className = 'suggestion-item';
        item.textContent = 'No se encontraron resultados';
        suggestionsContainer.appendChild(item);
    } else {
        suggestions.forEach((item, index) => {
            const div = document.createElement('div');
            div.className = 'suggestion-item';
            div.innerHTML = `
                <div>${resaltarCoincidencia(item.texto, busqueda)}</div>
                ${item.badge ? `<span class="suggestion-badge">${item.badge}</span>` : ''}
            `;
            
            div.addEventListener('click', () => {
                callbackSeleccion(item);
                suggestionsContainer.classList.remove('show');
            });
            
            suggestionsContainer.appendChild(div);
        });
    }
    
    suggestionsContainer.classList.add('show');
}

// Ocultar sugerencias al hacer clic fuera
document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-bar')) {
        document.querySelectorAll('.search-suggestions').forEach(el => {
            el.classList.remove('show');
        });
    }
});

// Implementar para cada buscador
async function buscarSugerenciasLibros(termino) {
    const libros = await getAllItems('libros');
    return libros
        .filter(libro => libro.titulo.toLowerCase().includes(termino.toLowerCase()))
        .map(libro => ({
            id: libro.id,
            texto: libro.titulo,
            badge: libro.disponibles > 0 ? 'Disponible' : 'No disponible'
        }));
}

async function buscarSugerenciasUsuarios(termino) {
    const usuarios = await getAllItems('usuarios');
    return usuarios
        .filter(usuario => usuario.nombre.toLowerCase().includes(termino.toLowerCase()))
        .map(usuario => ({
            id: usuario.id,
            texto: usuario.nombre,
            badge: usuario.rol
        }));
}

async function buscarSugerenciasPrestamos(termino) {
    const prestamos = await getAllItems('prestamos');
    const libros = await getAllItems('libros');
    const usuarios = await getAllItems('usuarios');
    
    return prestamos
        .map(prestamo => {
            const libro = libros.find(l => l.id === prestamo.libro_id);
            const usuario = usuarios.find(u => u.id === prestamo.usuario_id);
            return {
                id: prestamo.id,
                texto: `${libro?.titulo || 'Libro eliminado'} - ${usuario?.nombre || 'Usuario eliminado'}`,
                badge: prestamo.estado === 'activo' ? 'Activo' : 'Finalizado'
            };
        })
        .filter(item => item.texto.toLowerCase().includes(termino.toLowerCase()));
}

// Conectar a los buscadores
document.querySelectorAll('.search-bar input').forEach(input => {
    input.addEventListener('input', async function() {
        const termino = this.value.trim();
        const inputId = this.id;
        
        if (termino.length < 2) {
            const suggestionsContainer = crearContenedorSugerencias(inputId);
            suggestionsContainer.classList.remove('show');
            return;
        }
        
        let sugerencias = [];
        
        switch(inputId) {
            case 'search-libros':
                sugerencias = await buscarSugerenciasLibros(termino);
                break;
            case 'search-usuarios':
                sugerencias = await buscarSugerenciasUsuarios(termino);
                break;
            case 'search-prestamos':
                sugerencias = await buscarSugerenciasPrestamos(termino);
                break;
            case 'search-multas':
                // Implementar según necesidad
                break;
            case 'search-reservas':
                // Implementar según necesidad
                break;
            case 'search-notifications':
                // Implementar según necesidad
                break;
        }
        
        mostrarSugerencias(sugerencias, inputId, item => {
            this.value = item.texto;
            // Aquí podrías cargar directamente el elemento seleccionado
        });
    });
});

// ================= FUNCIONES PARA CONFIGURACIÓN EN TIEMPO REAL =================
// Guardar configuración en localStorage
function guardarConfiguracion() {
    const config = {
        general: {
            nombreBiblioteca: document.getElementById('library-name').value,
            logo: document.getElementById('logo-name').textContent,
            formatoFecha: document.getElementById('date-format').value,
            idioma: document.getElementById('language').value,
            limitePrestamos: document.getElementById('loan-limit').value,
            tiempoSesion: document.getElementById('session-timeout').value
        },
        apariencia: {
            tema: document.getElementById('theme').value,
            fuente: document.getElementById('font').value,
            mostrarMultas: document.getElementById('show-fines').checked,
            mostrarReportes: document.getElementById('show-reports').checked,
            mostrarActividad: document.getElementById('show-activity').checked
        },
        seguridad: {
            minPassword: document.getElementById('min-password').value,
            requireUppercase: document.getElementById('require-uppercase').checked,
            requireNumbers: document.getElementById('require-numbers').checked,
            requireSymbols: document.getElementById('require-symbols').checked,
            passwordChange: document.getElementById('password-change').value,
            loginAttempts: document.getElementById('login-attempts').value,
            lockTime: document.getElementById('lock-time').value,
            inactivityTimeout: document.getElementById('inactivity-timeout').value
        },
        backups: {
            autoBackup: document.getElementById('auto-backup').value,
            backupFrequency: document.getElementById('backup-frequency').value,
            backupTime: document.getElementById('backup-time').value,
            backupLocation: document.getElementById('backup-location').value
        },
        plazos: {
            defaultLoanDays: document.getElementById('default-loan-days').value,
            lowDemandDays: document.getElementById('low-demand-days').value,
            highDemandDays: document.getElementById('high-demand-days').value,
            maxRenewals: document.getElementById('max-renewals').value
        }
    };
    
    localStorage.setItem('biblioperu_config', JSON.stringify(config));
    mostrarNotificacionConfig('Configuración guardada exitosamente');
    
    // Aplicar cambios en tiempo real
    aplicarConfiguracion(config);
}

// Cargar configuración desde localStorage
function cargarConfiguracion() {
    const configGuardada = localStorage.getItem('biblioperu_config');
    if (configGuardada) {
        const config = JSON.parse(configGuardada);
        
        // Aplicar valores a los formularios
        // General
        document.getElementById('library-name').value = config.general.nombreBiblioteca || 'BiblioPerú';
        document.getElementById('logo-name').textContent = config.general.logo || 'biblioperu-logo.png';
        document.getElementById('date-format').value = config.general.formatoFecha || 'dd/mm/yyyy';
        document.getElementById('language').value = config.general.idioma || 'es';
        document.getElementById('loan-limit').value = config.general.limitePrestamos || 5;
        document.getElementById('session-timeout').value = config.general.tiempoSesion || 30;
        
        // Apariencia
        document.getElementById('theme').value = config.apariencia.tema || 'claro';
        document.getElementById('font').value = config.apariencia.fuente || 'sans-serif';
        document.getElementById('show-fines').checked = config.apariencia.mostrarMultas !== false;
        document.getElementById('show-reports').checked = config.apariencia.mostrarReportes !== false;
        document.getElementById('show-activity').checked = config.apariencia.mostrarActividad !== false;
        
        // Seguridad
        document.getElementById('min-password').value = config.seguridad.minPassword || 8;
        document.getElementById('require-uppercase').checked = config.seguridad.requireUppercase !== false;
        document.getElementById('require-numbers').checked = config.seguridad.requireNumbers !== false;
        document.getElementById('require-symbols').checked = config.seguridad.requireSymbols !== false;
        document.getElementById('password-change').value = config.seguridad.passwordChange || 90;
        document.getElementById('login-attempts').value = config.seguridad.loginAttempts || 5;
        document.getElementById('lock-time').value = config.seguridad.lockTime || 15;
        document.getElementById('inactivity-timeout').value = config.seguridad.inactivityTimeout || 30;
        
        // Backups
        document.getElementById('auto-backup').value = config.backups.autoBackup || 'si';
        document.getElementById('backup-frequency').value = config.backups.backupFrequency || 'diario';
        document.getElementById('backup-time').value = config.backups.backupTime || '02:00';
        document.getElementById('backup-location').value = config.backups.backupLocation || 'local';
        
        // Plazos
        document.getElementById('default-loan-days').value = config.plazos.defaultLoanDays || 14;
        document.getElementById('low-demand-days').value = config.plazos.lowDemandDays || 7;
        document.getElementById('high-demand-days').value = config.plazos.highDemandDays || 3;
        document.getElementById('max-renewals').value = config.plazos.maxRenewals || 2;
        
        // Aplicar cambios visuales
        aplicarConfiguracion(config);
    }
}

// Aplicar configuración en tiempo real
function aplicarConfiguracion(config) {
    // Aplicar tema
    document.body.className = `tema-${config.apariencia.tema} fuente-${config.apariencia.fuente}`;
    
    // Aplicar nombre de biblioteca
    const nombreBiblioteca = config.general.nombreBiblioteca || 'BiblioPerú';
    document.querySelectorAll('.navbar-brand h1').forEach(el => {
        el.textContent = nombreBiblioteca;
    });
    
    // Aplicar cambios en el dashboard
    document.getElementById('show-fines-section').style.display = 
        config.apariencia.mostrarMultas ? 'block' : 'none';
    
    document.getElementById('show-reports-section').style.display = 
        config.apariencia.mostrarReportes ? 'block' : 'none';
    
    document.getElementById('show-activity-section').style.display = 
        config.apariencia.mostrarActividad ? 'block' : 'none';
    
    // Actualizar vista previa de configuración
    actualizarVistaPreviaConfig(config);
}

// Actualizar vista previa de configuración
function actualizarVistaPreviaConfig(config) {
    const preview = `
        <div class="config-preview-box">
            <h4>Vista Previa de Configuración</h4>
            <p><strong>Nombre Biblioteca:</strong> ${config.general.nombreBiblioteca}</p>
            <p><strong>Tema:</strong> ${config.apariencia.tema}</p>
            <p><strong>Fuente:</strong> ${config.apariencia.fuente}</p>
            <p><strong>Límite de préstamos:</strong> ${config.general.limitePrestamos} libros por usuario</p>
            <p><strong>Duración préstamo:</strong> ${config.plazos.defaultLoanDays} días</p>
        </div>
    `;
    
    document.getElementById('config-preview-container').innerHTML = preview;
}

// Eventos para cambios en tiempo real
document.getElementById('theme').addEventListener('change', function() {
    const config = JSON.parse(localStorage.getItem('biblioperu_config') || '{}');
    config.apariencia = config.apariencia || {};
    config.apariencia.tema = this.value;
    localStorage.setItem('biblioperu_config', JSON.stringify(config));
    aplicarConfiguracion(config);
    mostrarNotificacionConfig('Tema cambiado a ' + this.value);
});

document.getElementById('font').addEventListener('change', function() {
    const config = JSON.parse(localStorage.getItem('biblioperu_config') || '{}');
    config.apariencia = config.apariencia || {};
    config.apariencia.fuente = this.value;
    localStorage.setItem('biblioperu_config', JSON.stringify(config));
    aplicarConfiguracion(config);
    mostrarNotificacionConfig('Fuente cambiada a ' + this.value);
});

document.getElementById('library-name').addEventListener('change', function() {
    const config = JSON.parse(localStorage.getItem('biblioperu_config') || '{}');
    config.general = config.general || {};
    config.general.nombreBiblioteca = this.value;
    localStorage.setItem('biblioperu_config', JSON.stringify(config));
    aplicarConfiguracion(config);
    mostrarNotificacionConfig('Nombre de biblioteca actualizado');
});

// Configurar botón Guardar
document.querySelector('.save-config-btn button').addEventListener('click', guardarConfiguracion);

// ================= INICIALIZACIÓN =================
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Abrir base de datos
        await openDB();
        await initDatabase();
        
        // Verificar si hay un usuario logueado
        const usuarioActual = JSON.parse(sessionStorage.getItem('usuarioActual'));
        if (usuarioActual) {
            // Actualizar información del usuario en el dashboard
            document.getElementById('user-name').textContent = usuarioActual.nombre;
            document.getElementById('user-role').textContent = 
                usuarioActual.rol === 'admin' ? 'Administrador' : 
                usuarioActual.rol === 'bibliotecario' ? 'Bibliotecario' : 
                'Usuario';
            document.getElementById('user-avatar').textContent = usuarioActual.nombre.split(' ').map(n => n[0]).join('');
            
            // Mostrar dashboard
            showPage('dashboard');
        } else {
            // Mostrar página principal
            showPage('home');
        }
        
        // Cargar configuración
        cargarConfiguracion();
        
        // Crear contenedor para vista previa de configuración
        const previewContainer = document.createElement('div');
        previewContainer.id = 'config-preview-container';
        previewContainer.style.marginTop = '20px';
        document.querySelector('.config-section:last-child').appendChild(previewContainer);
        
        // Inicializar vista previa
        const configInicial = JSON.parse(localStorage.getItem('biblioperu_config') || '{}');
        actualizarVistaPreviaConfig(configInicial);
        
        // Iniciar simulación de notificaciones en tiempo real
        simularNotificacionesTiempoReal();
    } catch (error) {
        console.error('Error al inicializar:', error);
        showPage('home');
    }
});