// Sistema de Administración de Turnos Hospitalarios
// Colas: Prioritaria y General (FIFO dentro de cada una)
// Prioridad: siempre atender prioritaria primero

class SistemaTurnos {
    constructor() {
        this.turnoActual = 1;
        this.colaPrioritaria = [];
        this.colaGeneral = [];
        this.historial = [];
        this.cargarDatos();
    }

    // Determina el tipo de atención según urgencia
    determinarTipo(urgencia) {
        if (urgencia === 'grave' || urgencia === 'critica') {
            return 'prioritaria';
        }
        return 'general';
    }

    registrarPaciente(nombre, edad, motivo, urgencia, tiempoEstimado) {
        const tipo = this.determinarTipo(urgencia);
        const paciente = {
            turno: this.turnoActual++,
            nombre,
            edad: parseInt(edad),
            motivo,
            urgencia,
            tipoAtencion: tipo,
            tiempoEstimado: parseInt(tiempoEstimado),
            horaRegistro: new Date().toLocaleString('es-MX'),
            horaAtencion: null
        };

        if (tipo === 'prioritaria') {
            this.colaPrioritaria.push(paciente); // FIFO: push al final
        } else {
            this.colaGeneral.push(paciente);
        }

        this.guardarDatos();
        return paciente;
    }

    // Atiende el siguiente paciente según reglas
    atenderSiguiente() {
        let paciente = null;

        if (this.colaPrioritaria.length > 0) {
            paciente = this.colaPrioritaria.shift(); // FIFO: saca el primero
        } else if (this.colaGeneral.length > 0) {
            paciente = this.colaGeneral.shift();
        }

        if (paciente) {
            paciente.horaAtencion = new Date().toLocaleString('es-MX');
            this.historial.unshift(paciente); // más reciente primero
            this.guardarDatos();
            return paciente;
        }
        return null;
    }

    obtenerEstadisticas() {
        const totalRegistrados = this.turnoActual - 1;
        const atendidos = this.historial.length;
        const enEspera = this.colaPrioritaria.length + this.colaGeneral.length;

        const porUrgencia = {
            leve: 0, moderada: 0, grave: 0, critica: 0
        };
        const porTipo = { prioritaria: 0, general: 0 };

        [...this.colaPrioritaria, ...this.colaGeneral, ...this.historial].forEach(p => {
            porUrgencia[p.urgencia]++;
            porTipo[p.tipoAtencion]++;
        });

        const tiemposAtendidos = this.historial.map(p => p.tiempoEstimado);
        const promedioTiempo = tiemposAtendidos.length
            ? (tiemposAtendidos.reduce((a, b) => a + b, 0) / tiemposAtendidos.length).toFixed(1)
            : 0;

        return {
            totalRegistrados,
            atendidos,
            enEspera,
            prioritariaEspera: this.colaPrioritaria.length,
            generalEspera: this.colaGeneral.length,
            porUrgencia,
            porTipo,
            promedioTiempo
        };
    }

    guardarDatos() {
        const data = {
            turnoActual: this.turnoActual,
            colaPrioritaria: this.colaPrioritaria,
            colaGeneral: this.colaGeneral,
            historial: this.historial
        };
        localStorage.setItem('sistemaTurnosHospital', JSON.stringify(data));
    }

    cargarDatos() {
        const data = localStorage.getItem('sistemaTurnosHospital');
        if (data) {
            const parsed = JSON.parse(data);
            this.turnoActual = parsed.turnoActual || 1;
            this.colaPrioritaria = parsed.colaPrioritaria || [];
            this.colaGeneral = parsed.colaGeneral || [];
            this.historial = parsed.historial || [];
        }
    }

    limpiarDatos() {
        localStorage.removeItem('sistemaTurnosHospital');
        this.turnoActual = 1;
        this.colaPrioritaria = [];
        this.colaGeneral = [];
        this.historial = [];
    }
}

// ---------- UI ----------
const sistema = new SistemaTurnos();

const form = document.getElementById('formRegistro');
const listaPrioritaria = document.getElementById('listaPrioritaria');
const listaGeneral = document.getElementById('listaGeneral');
const listaHistorial = document.getElementById('listaHistorial');
const countPrioritaria = document.getElementById('countPrioritaria');
const countGeneral = document.getElementById('countGeneral');
const statsGrid = document.getElementById('statsGrid');
const btnAtender = document.getElementById('btnAtender');
const mensajeRegistro = document.getElementById('mensajeRegistro');
const mensajeAtencion = document.getElementById('mensajeAtencion');

function mostrarMensaje(elemento, texto, tipo = 'exito') {
    elemento.textContent = texto;
    elemento.className = `mensaje ${tipo}`;
    setTimeout(() => {
        elemento.textContent = '';
        elemento.className = 'mensaje';
    }, 4000);
}

function renderizarPaciente(p) {
    const urgenciaTexto = {
        leve: 'Leve',
        moderada: 'Moderada',
        grave: 'Grave',
        critica: 'Crítica'
    }[p.urgencia] || p.urgencia;

    return `
        <strong>Turno ${p.turno}</strong> - ${p.nombre} (${p.edad} años)<br>
        Motivo: ${p.motivo}<br>
        Urgencia: <span style="color:${p.tipoAtencion === 'prioritaria' ? '#e74c3c' : '#3498db'}">${urgenciaTexto}</span>
        | Tiempo est.: ${p.tiempoEstimado} min<br>
        <small>Registro: ${p.horaRegistro}</small>
        ${p.horaAtencion ? `<br><small>Atendido: ${p.horaAtencion}</small>` : ''}
    `;
}

function actualizarUI() {
    // Colas
    listaPrioritaria.innerHTML = sistema.colaPrioritaria
        .map(p => `<li>${renderizarPaciente(p)}</li>`)
        .join('') || '<li style="text-align:center;color:#888;">Sin pacientes</li>';

    listaGeneral.innerHTML = sistema.colaGeneral
        .map(p => `<li>${renderizarPaciente(p)}</li>`)
        .join('') || '<li style="text-align:center;color:#888;">Sin pacientes</li>';

    countPrioritaria.textContent = sistema.colaPrioritaria.length;
    countGeneral.textContent = sistema.colaGeneral.length;

    // Historial
    listaHistorial.innerHTML = sistema.historial
        .map(p => `<li>${renderizarPaciente(p)}</li>`)
        .join('') || '<li style="text-align:center;color:#888;">Aún no hay pacientes atendidos</li>';

    // Estadísticas
    const stats = sistema.obtenerEstadisticas();
    statsGrid.innerHTML = `
        <div class="stat-card"><div class="valor">${stats.totalRegistrados}</div><div class="etiqueta">Total registrados</div></div>
        <div class="stat-card"><div class="valor">${stats.atendidos}</div><div class="etiqueta">Atendidos</div></div>
        <div class="stat-card"><div class="valor">${stats.enEspera}</div><div class="etiqueta">En espera</div></div>
        <div class="stat-card"><div class="valor">${stats.prioritariaEspera}</div><div class="etiqueta">Prioritarios en espera</div></div>
        <div class="stat-card"><div class="valor">${stats.generalEspera}</div><div class="etiqueta">Generales en espera</div></div>
        <div class="stat-card"><div class="valor">${stats.promedioTiempo}</div><div class="etiqueta">Promedio tiempo est. (min)</div></div>
        <div class="stat-card"><div class="valor">${stats.porUrgencia.grave + stats.porUrgencia.critica}</div><div class="etiqueta">Urgencias altas</div></div>
        <div class="stat-card"><div class="valor">${stats.porTipo.prioritaria}</div><div class="etiqueta">Total prioritarios</div></div>
    `;
}

form.addEventListener('submit', (e) => {
    e.preventDefault();

    const nombre = document.getElementById('nombre').value.trim();
    const edad = document.getElementById('edad').value;
    const motivo = document.getElementById('motivo').value.trim();
    const urgencia = document.getElementById('urgencia').value;
    const tiempo = document.getElementById('tiempo').value;

    if (!nombre || !edad || !motivo || !urgencia) {
        mostrarMensaje(mensajeRegistro, 'Por favor completa todos los campos.', 'error');
        return;
    }

    const paciente = sistema.registrarPaciente(nombre, edad, motivo, urgencia, tiempo);
    const tipoTexto = paciente.tipoAtencion === 'prioritaria' ? 'PRIORITARIA' : 'GENERAL';

    mostrarMensaje(
        mensajeRegistro,
        `✅ Paciente registrado. Turno ${paciente.turno} → Fila ${tipoTexto}`,
        'exito'
    );

    form.reset();
    document.getElementById('tiempo').value = 15;
    actualizarUI();
});

btnAtender.addEventListener('click', () => {
    const paciente = sistema.atenderSiguiente();
    if (paciente) {
        mostrarMensaje(
            mensajeAtencion,
            `👨‍⚕️ Atendiendo: Turno ${paciente.turno} - ${paciente.nombre} (${paciente.tipoAtencion.toUpperCase()})`,
            'exito'
        );
    } else {
        mostrarMensaje(mensajeAtencion, 'No hay pacientes en espera.', 'error');
    }
    actualizarUI();
});

// Inicializar UI
actualizarUI();

// Opcional: limpiar datos (puedes descomentar o agregar botón si lo necesitas)
// sistema.limpiarDatos(); actualizarUI();
