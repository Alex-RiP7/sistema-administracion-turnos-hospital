/**
 * Centro Médico San Rafael - Sistema de Administración de Turnos Hospitalarios
 * Cumple con principios FIFO estricto por fila y precedencia de atención prioritaria.
 */

// ========================================================
// SERVICIO DE AUDIO (TIMBRE HOSPITALARIO CON WEB AUDIO API)
// ========================================================
class AudioService {
    constructor() {
        this.enabled = true;
        this.ctx = null;
    }

    init() {
        if (!this.ctx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) {
                this.ctx = new AudioContext();
            }
        }
    }

    tocarCampanaLlamado() {
        if (!this.enabled) return;
        try {
            this.init();
            if (!this.ctx) return;
            if (this.ctx.state === 'suspended') {
                this.ctx.resume();
            }

            // Tono 1 (Ding)
            const osc1 = this.ctx.createOscillator();
            const gain1 = this.ctx.createGain();
            osc1.type = 'sine';
            osc1.frequency.setValueAtTime(587.33, this.ctx.currentTime); // D5
            gain1.gain.setValueAtTime(0.2, this.ctx.currentTime);
            gain1.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.6);
            osc1.connect(gain1);
            gain1.connect(this.ctx.destination);
            osc1.start();
            osc1.stop(this.ctx.currentTime + 0.6);

            // Tono 2 (Dong)
            const osc2 = this.ctx.createOscillator();
            const gain2 = this.ctx.createGain();
            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(440, this.ctx.currentTime + 0.35); // A4
            gain2.gain.setValueAtTime(0.25, this.ctx.currentTime + 0.35);
            gain2.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 1.2);
            osc2.connect(gain2);
            gain2.connect(this.ctx.destination);
            osc2.start(this.ctx.currentTime + 0.35);
            osc2.stop(this.ctx.currentTime + 1.2);
        } catch (e) {
            console.warn('Audio API no soportado o bloqueado por el navegador', e);
        }
    }

    toggle() {
        this.enabled = !this.enabled;
        return this.enabled;
    }
}

// ========================================================
// MODELO DEL SISTEMA DE TURNOS HOSPITALARIOS
// ========================================================
class SistemaTurnosHospital {
    constructor() {
        this.contadorPrioritaria = 1;
        this.contadorGeneral = 1;
        this.totalRegistrosContador = 0;
        this.colaPrioritaria = []; // FIFO
        this.colaGeneral = [];     // FIFO
        this.pacienteEnConsulta = null;
        this.historial = [];
        this.inicioConsultaTimestamp = null;
        this.STORAGE_KEY = 'cmsr_sistema_turnos_v2';
        this.cargarDatos();
    }

    /**
     * Registra un nuevo paciente en la fila correspondiente
     */
    registrarPaciente({ nombre, edad, motivo, urgencia, tipoAtencion, tiempoEstimado }) {
        this.totalRegistrosContador++;
        
        let codigoTurno = '';
        if (tipoAtencion === 'prioritaria') {
            const num = String(this.contadorPrioritaria++).padStart(3, '0');
            codigoTurno = `P-${num}`;
        } else {
            const num = String(this.contadorGeneral++).padStart(3, '0');
            codigoTurno = `G-${num}`;
        }

        const ahora = new Date();
        const paciente = {
            id: 'pac_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
            turno: codigoTurno,
            numeroSecuencial: this.totalRegistrosContador,
            nombre: nombre.trim(),
            edad: parseInt(edad, 10),
            motivo: motivo.trim(),
            urgencia: urgencia, // 'critica' | 'grave' | 'moderada' | 'leve'
            tipoAtencion: tipoAtencion, // 'prioritaria' | 'general'
            tiempoEstimado: parseInt(tiempoEstimado, 10) || 15,
            horaRegistro: ahora.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            fechaRegistro: ahora.toLocaleDateString('es-MX'),
            horaAtencion: null,
            horaFin: null,
            duracionRealMinutos: null
        };

        // Asignación estricta a la cola correspondiente (FIFO: entra al final)
        if (tipoAtencion === 'prioritaria') {
            this.colaPrioritaria.push(paciente);
        } else {
            this.colaGeneral.push(paciente);
        }

        this.guardarDatos();
        return paciente;
    }

    /**
     * Determina el siguiente paciente a atender según la regla médica:
     * 1. Fila prioritaria primero (FIFO).
     * 2. Si la fila prioritaria está vacía, atiende a la fila general (FIFO).
     */
    obtenerSiguienteCandidato() {
        if (this.colaPrioritaria.length > 0) {
            return {
                paciente: this.colaPrioritaria[0],
                origen: 'prioritaria',
                motivoRegla: 'Fila Prioritaria (Precedencia obligatoria)'
            };
        } else if (this.colaGeneral.length > 0) {
            return {
                paciente: this.colaGeneral[0],
                origen: 'general',
                motivoRegla: 'Fila General (Fila prioritaria despejada)'
            };
        }
        return null;
    }

    /**
     * Llama al siguiente paciente para ser atendido por el médico disponible
     */
    llamarSiguiente() {
        if (this.pacienteEnConsulta) {
            return { error: 'Ya existe una consulta en curso en este consultorio.' };
        }

        let pacienteSeleccionado = null;
        let filaOrigen = '';

        // REGLA FUNDAMENTAL: Prioritaria primero; si está vacía, General.
        if (this.colaPrioritaria.length > 0) {
            pacienteSeleccionado = this.colaPrioritaria.shift(); // FIFO: saca el primero
            filaOrigen = 'prioritaria';
        } else if (this.colaGeneral.length > 0) {
            pacienteSeleccionado = this.colaGeneral.shift(); // FIFO: saca el primero
            filaOrigen = 'general';
        } else {
            return { error: 'No hay pacientes en sala de espera.' };
        }

        pacienteSeleccionado.horaAtencion = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        this.pacienteEnConsulta = pacienteSeleccionado;
        this.inicioConsultaTimestamp = Date.now();
        this.guardarDatos();

        return { exito: true, paciente: pacienteSeleccionado, filaOrigen };
    }

    /**
     * Concluye la consulta activa y da de alta al paciente en el historial
     */
    finalizarConsultaActual() {
        if (!this.pacienteEnConsulta) return null;

        const paciente = this.pacienteEnConsulta;
        const ahora = new Date();
        paciente.horaFin = ahora.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        const duracionMinutos = this.inicioConsultaTimestamp
            ? Math.max(1, Math.round((Date.now() - this.inicioConsultaTimestamp) / 60000))
            : paciente.tiempoEstimado;

        paciente.duracionRealMinutos = duracionMinutos;

        // Agregar al inicio del historial de pacientes atendidos
        this.historial.unshift(paciente);

        this.pacienteEnConsulta = null;
        this.inicioConsultaTimestamp = null;
        this.guardarDatos();

        return paciente;
    }

    /**
     * Cancela la consulta actual (ej. paciente ausente)
     */
    cancelarConsultaActual() {
        if (!this.pacienteEnConsulta) return null;
        const paciente = this.pacienteEnConsulta;
        this.pacienteEnConsulta = null;
        this.inicioConsultaTimestamp = null;
        this.guardarDatos();
        return paciente;
    }

    /**
     * Calcula métricas y estadísticas clínicas de atención
     */
    obtenerEstadisticas() {
        const totalRegistrados = this.totalRegistrosContador;
        const totalAtendidos = this.historial.length;
        const enEsperaPrio = this.colaPrioritaria.length;
        const enEsperaGen = this.colaGeneral.length;
        const totalEnEspera = enEsperaPrio + enEsperaGen;

        const urgencias = {
            critica: 0,
            grave: 0,
            moderada: 0,
            leve: 0
        };

        const tipos = {
            prioritaria: 0,
            general: 0
        };

        // Analizar todos los pacientes registrados (en cola, en consulta y atendidos)
        const todosLosPacientes = [
            ...this.colaPrioritaria,
            ...this.colaGeneral,
            ...(this.pacienteEnConsulta ? [this.pacienteEnConsulta] : []),
            ...this.historial
        ];

        let sumaTiempos = 0;
        let conteoConTiempo = 0;

        todosLosPacientes.forEach(p => {
            if (urgencias[p.urgencia] !== undefined) {
                urgencias[p.urgencia]++;
            }
            if (tipos[p.tipoAtencion] !== undefined) {
                tipos[p.tipoAtencion]++;
            }
            if (p.tiempoEstimado) {
                sumaTiempos += p.tiempoEstimado;
                conteoConTiempo++;
            }
        });

        // Tiempos reales atendidos
        let sumaDuracionReal = 0;
        this.historial.forEach(h => {
            if (h.duracionRealMinutos) sumaDuracionReal += h.duracionRealMinutos;
        });

        const promedioEstimado = conteoConTiempo > 0
            ? Math.round((sumaTiempos / conteoConTiempo) * 10) / 10
            : 15;

        const tasaAtencion = totalRegistrados > 0
            ? Math.round((totalAtendidos / totalRegistrados) * 100)
            : 0;

        // Tiempo total de espera estimado en sala
        const tiempoEsperaAcumulado = [...this.colaPrioritaria, ...this.colaGeneral]
            .reduce((acc, p) => acc + (p.tiempoEstimado || 15), 0);

        return {
            totalRegistrados,
            totalAtendidos,
            totalEnEspera,
            enEsperaPrio,
            enEsperaGen,
            urgencias,
            tipos,
            promedioEstimado,
            tasaAtencion,
            tiempoEsperaAcumulado,
            sumaDuracionReal
        };
    }

    /**
     * Calcula la posición y tiempo de espera estimado para un nuevo turno
     */
    calcularEsperaParaTurno(tipoAtencion) {
        if (tipoAtencion === 'prioritaria') {
            const pacientesAntes = this.colaPrioritaria.length;
            const minutos = this.colaPrioritaria.reduce((acc, p) => acc + (p.tiempoEstimado || 15), 0);
            return { posicion: pacientesAntes, minutos: Math.max(5, minutos) };
        } else {
            // Un paciente general debe esperar a todos los prioritarios + los generales antes de él
            const pacientesAntes = this.colaPrioritaria.length + this.colaGeneral.length;
            const minutos = [...this.colaPrioritaria, ...this.colaGeneral]
                .reduce((acc, p) => acc + (p.tiempoEstimado || 15), 0);
            return { posicion: pacientesAntes, minutos: Math.max(10, minutos) };
        }
    }

    /**
     * Carga 5 casos de prueba clínicos con distintas condiciones y urgencias
     */
    cargarCasosDemostracion() {
        const casos = [
            {
                nombre: 'Elena Morales Rosas',
                edad: 73,
                motivo: 'Dolor torácico opresivo y sensación de asfixia',
                urgencia: 'critica',
                tipoAtencion: 'prioritaria',
                tiempoEstimado: 25
            },
            {
                nombre: 'Mateo García Ramos',
                edad: 4,
                motivo: 'Fiebre persistente de 39.4°C y llanto agudo',
                urgencia: 'grave',
                tipoAtencion: 'prioritaria',
                tiempoEstimado: 20
            },
            {
                nombre: 'Roberto Campos Vela',
                edad: 46,
                motivo: 'Control trimestral de hipertensión y renovación de receta',
                urgencia: 'leve',
                tipoAtencion: 'general',
                tiempoEstimado: 15
            },
            {
                nombre: 'Claudia Navarrete Peña',
                edad: 31,
                motivo: 'Cefalea tensional moderada de 48 hrs y fatiga',
                urgencia: 'moderada',
                tipoAtencion: 'general',
                tiempoEstimado: 15
            },
            {
                nombre: 'Aurelio Vargas Soto',
                edad: 68,
                motivo: 'Traumatismo en rodilla derecha por caída al caminar',
                urgencia: 'grave',
                tipoAtencion: 'prioritaria',
                tiempoEstimado: 20
            },
            {
                nombre: 'Sofía Mendoza Luna',
                edad: 22,
                motivo: 'Certificado de salud laboral y revisión física básica',
                urgencia: 'leve',
                tipoAtencion: 'general',
                tiempoEstimado: 10
            }
        ];

        casos.forEach(caso => this.registrarPaciente(caso));
    }

    guardarDatos() {
        const data = {
            contadorPrioritaria: this.contadorPrioritaria,
            contadorGeneral: this.contadorGeneral,
            totalRegistrosContador: this.totalRegistrosContador,
            colaPrioritaria: this.colaPrioritaria,
            colaGeneral: this.colaGeneral,
            pacienteEnConsulta: this.pacienteEnConsulta,
            historial: this.historial,
            inicioConsultaTimestamp: this.inicioConsultaTimestamp
        };
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
        } catch (e) {
            console.error('Error al guardar datos en localStorage', e);
        }
    }

    cargarDatos() {
        try {
            const raw = localStorage.getItem(this.STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                this.contadorPrioritaria = parsed.contadorPrioritaria || 1;
                this.contadorGeneral = parsed.contadorGeneral || 1;
                this.totalRegistrosContador = parsed.totalRegistrosContador || 0;
                this.colaPrioritaria = parsed.colaPrioritaria || [];
                this.colaGeneral = parsed.colaGeneral || [];
                this.pacienteEnConsulta = parsed.pacienteEnConsulta || null;
                this.historial = parsed.historial || [];
                this.inicioConsultaTimestamp = parsed.inicioConsultaTimestamp || null;
            }
        } catch (e) {
            console.warn('Error al leer datos previos de localStorage. Reiniciando.', e);
        }
    }

    reiniciarTodo() {
        localStorage.removeItem(this.STORAGE_KEY);
        this.contadorPrioritaria = 1;
        this.contadorGeneral = 1;
        this.totalRegistrosContador = 0;
        this.colaPrioritaria = [];
        this.colaGeneral = [];
        this.pacienteEnConsulta = null;
        this.historial = [];
        this.inicioConsultaTimestamp = null;
    }
}

// ========================================================
// CONTROLADOR DE INTERFAZ DE USUARIO (UI CONTROLLER)
// ========================================================
document.addEventListener('DOMContentLoaded', () => {
    const audio = new AudioService();
    const sistema = new SistemaTurnosHospital();

    // Referencias del DOM
    const liveClock = document.getElementById('liveClock');
    const liveDate = document.getElementById('liveDate');
    const tvClock = document.getElementById('tvClock');
    const navTabs = document.querySelectorAll('.nav-tab');
    const tabViews = document.querySelectorAll('.tab-view');

    // Botones Header
    const btnSoundToggle = document.getElementById('btnSoundToggle');
    const iconSoundOn = document.getElementById('iconSoundOn');
    const iconSoundOff = document.getElementById('iconSoundOff');
    const labelSound = document.getElementById('labelSound');
    const btnCargarDemo = document.getElementById('btnCargarDemo');
    const btnLimpiarDatos = document.getElementById('btnLimpiarDatos');

    // Formulario Registro
    const formRegistro = document.getElementById('formRegistro');
    const inputNombre = document.getElementById('nombre');
    const inputEdad = document.getElementById('edad');
    const edadBadge = document.getElementById('edadBadge');
    const inputMotivo = document.getElementById('motivo');
    const selectUrgencia = document.getElementById('urgencia');
    const radioPrioritaria = document.getElementById('tipoPrioritaria');
    const radioGeneral = document.getElementById('tipoGeneral');
    const inputTiempoEstimado = document.getElementById('tiempoEstimado');
    const quickChips = document.querySelectorAll('.chip-btn');

    // Panel Médico
    const doctorStatusPill = document.getElementById('doctorStatusPill');
    const doctorStatusText = document.getElementById('doctorStatusText');
    const panelMedicoLibre = document.getElementById('panelMedicoLibre');
    const panelEnConsulta = document.getElementById('panelEnConsulta');
    const candidateQueueType = document.getElementById('candidateQueueType');
    const candidateBody = document.getElementById('candidateBody');
    const btnAtenderSiguiente = document.getElementById('btnAtenderSiguiente');

    // Elementos Consulta Activa
    const activeTurnoCode = document.getElementById('activeTurnoCode');
    const activeNombre = document.getElementById('activeNombre');
    const activeDetails = document.getElementById('activeDetails');
    const consultTimer = document.getElementById('consultTimer');
    const consultEstimado = document.getElementById('consultEstimado');
    const activeTipoBadge = document.getElementById('activeTipoBadge');
    const btnFinalizarConsulta = document.getElementById('btnFinalizarConsulta');
    const btnCancelarConsulta = document.getElementById('btnCancelarConsulta');

    // Bandeja y Listas de Colas
    const trayEnEspera = document.getElementById('trayEnEspera');
    const trayAtendidos = document.getElementById('trayAtendidos');
    const trayTiempoEspera = document.getElementById('trayTiempoEspera');
    const countPrioritaria = document.getElementById('countPrioritaria');
    const countGeneral = document.getElementById('countGeneral');
    const listaPrioritaria = document.getElementById('listaPrioritaria');
    const listaGeneral = document.getElementById('listaGeneral');

    // TV Sala de Espera
    const tvTurnoCode = document.getElementById('tvTurnoCode');
    const tvPatientName = document.getElementById('tvPatientName');
    const tvConsultDetails = document.getElementById('tvConsultDetails');
    const tvListaPrioritaria = document.getElementById('tvListaPrioritaria');
    const tvListaGeneral = document.getElementById('tvListaGeneral');

    // Estadísticas
    const statTotalRegistrados = document.getElementById('statTotalRegistrados');
    const statTotalAtendidos = document.getElementById('statTotalAtendidos');
    const statTasaAtencion = document.getElementById('statTasaAtencion');
    const statEnEspera = document.getElementById('statEnEspera');
    const statDesgloseEspera = document.getElementById('statDesgloseEspera');
    const statPromedioTiempo = document.getElementById('statPromedioTiempo');
    const statTiempoAcumulado = document.getElementById('statTiempoAcumulado');
    const triageBarsList = document.getElementById('triageBarsList');
    const ratioBarPrioritaria = document.getElementById('ratioBarPrioritaria');
    const ratioBarGeneral = document.getElementById('ratioBarGeneral');
    const statPrioCount = document.getElementById('statPrioCount');
    const statPrioPct = document.getElementById('statPrioPct');
    const statGenCount = document.getElementById('statGenCount');
    const statGenPct = document.getElementById('statGenPct');
    const btnExportStats = document.getElementById('btnExportStats');

    // Historial
    const tablaHistorialBody = document.getElementById('tablaHistorialBody');
    const filtroHistorial = document.getElementById('filtroHistorial');
    const tabCountHistorial = document.getElementById('tabCountHistorial');

    // Modal Ticket
    const modalTicket = document.getElementById('modalTicket');
    const ticketNumero = document.getElementById('ticketNumero');
    const ticketTipoBadge = document.getElementById('ticketTipoBadge');
    const ticketNombre = document.getElementById('ticketNombre');
    const ticketEdad = document.getElementById('ticketEdad');
    const ticketMotivo = document.getElementById('ticketMotivo');
    const ticketUrgencia = document.getElementById('ticketUrgencia');
    const ticketPosicion = document.getElementById('ticketPosicion');
    const ticketEspera = document.getElementById('ticketEspera');
    const ticketFechaHora = document.getElementById('ticketFechaHora');
    const btnPrintTicket = document.getElementById('btnPrintTicket');
    const btnCloseTicket = document.getElementById('btnCloseTicket');

    // Contenedor Toasts
    const toastContainer = document.getElementById('toastContainer');

    // Timer de Consulta en Curso
    let cronometroInterval = null;

    // ========================================================
    // RELOJ DEL SISTEMA EN VIVO
    // ========================================================
    function actualizarReloj() {
        const ahora = new Date();
        const horaStr = ahora.toLocaleTimeString('es-MX', { hour12: false });
        const fechaStr = ahora.toLocaleDateString('es-MX', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });

        if (liveClock) liveClock.textContent = horaStr;
        if (liveDate) liveDate.textContent = fechaStr;
        if (tvClock) tvClock.textContent = horaStr;
    }
    setInterval(actualizarReloj, 1000);
    actualizarReloj();

    // ========================================================
    // TOASTS DE NOTIFICACIÓN
    // ========================================================
    function mostrarToast(mensaje, tipo = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${tipo}`;
        toast.innerHTML = `
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" style="flex-shrink:0;">
                ${tipo === 'success' ? '<path d="M20 6L9 17l-5-5"/>' : 
                  tipo === 'error' ? '<circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>' :
                  '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>'}
            </svg>
            <span>${mensaje}</span>
        `;
        toastContainer.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(10px)';
            toast.style.transition = 'all 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    }

    // ========================================================
    // NAVEGACIÓN POR PESTAÑAS
    // ========================================================
    navTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetId = tab.getAttribute('data-tab');
            navTabs.forEach(t => t.classList.remove('active'));
            tabViews.forEach(v => v.classList.remove('active'));

            tab.classList.add('active');
            const targetView = document.getElementById(targetId);
            if (targetView) targetView.classList.add('active');

            if (targetId === 'tab-estadisticas') {
                renderizarEstadisticas();
            } else if (targetId === 'tab-historial') {
                renderizarHistorial();
            }
        });
    });

    // ========================================================
    // ASISTENCIA INTELIGENTE EN EL TRIAJE (REGLAS CLÍNICAS)
    // ========================================================
    // Detección de Edad (Adulto Mayor o Pediátrico -> Sugerir Prioritaria)
    inputEdad.addEventListener('input', () => {
        const edad = parseInt(inputEdad.value, 10);
        if (isNaN(edad)) {
            edadBadge.style.display = 'none';
            return;
        }

        if (edad >= 65) {
            edadBadge.textContent = 'Adulto Mayor (Preferente)';
            edadBadge.className = 'age-badge senior';
            edadBadge.style.display = 'inline-block';
            radioPrioritaria.checked = true;
        } else if (edad <= 5) {
            edadBadge.textContent = 'Pediátrico (Preferente)';
            edadBadge.className = 'age-badge pediatric';
            edadBadge.style.display = 'inline-block';
            radioPrioritaria.checked = true;
        } else {
            edadBadge.style.display = 'none';
        }
    });

    // Clasificación de Urgencia (Manchester Triage -> Fila correspondiente)
    selectUrgencia.addEventListener('change', () => {
        const selected = selectUrgencia.options[selectUrgencia.selectedIndex];
        const tipoRecomendado = selected.getAttribute('data-tipo');

        if (tipoRecomendado === 'prioritaria') {
            radioPrioritaria.checked = true;
        } else if (tipoRecomendado === 'general') {
            const edad = parseInt(inputEdad.value, 10);
            // Si no es adulto mayor ni niño pequeño, asigna general
            if (isNaN(edad) || (edad > 5 && edad < 65)) {
                radioGeneral.checked = true;
            }
        }
    });

    // Chips rápidos para motivos de consulta
    quickChips.forEach(chip => {
        chip.addEventListener('click', () => {
            inputMotivo.value = chip.getAttribute('data-motivo');
            const urgenciaSugerida = chip.getAttribute('data-urgencia');
            if (urgenciaSugerida) {
                selectUrgencia.value = urgenciaSugerida;
                selectUrgencia.dispatchEvent(new Event('change'));
            }
            inputMotivo.focus();
        });
    });

    // ========================================================
    // ENVÍO DEL FORMULARIO DE REGISTRO
    // ========================================================
    formRegistro.addEventListener('submit', (e) => {
        e.preventDefault();

        const nombre = inputNombre.value.trim();
        const edad = inputEdad.value;
        const motivo = inputMotivo.value.trim();
        const urgencia = selectUrgencia.value;
        const tipoAtencion = radioPrioritaria.checked ? 'prioritaria' : 'general';
        const tiempoEstimado = inputTiempoEstimado.value;

        if (!nombre || !edad || !motivo || !urgencia) {
            mostrarToast('Complete todos los campos requeridos del paciente.', 'error');
            return;
        }

        const paciente = sistema.registrarPaciente({
            nombre,
            edad,
            motivo,
            urgencia,
            tipoAtencion,
            tiempoEstimado
        });

        // Feedback sonoro opcional de confirmación ligera
        mostrarToast(`Paciente ingresado con éxito: Turno ${paciente.turno}`, 'success');

        // Mostrar Comprobante de Turno (Ticket)
        mostrarComprobanteTicket(paciente);

        // Limpiar formulario preservando valores por defecto seguros
        formRegistro.reset();
        inputTiempoEstimado.value = 15;
        edadBadge.style.display = 'none';
        radioGeneral.checked = true;

        actualizarDashboard();
    });

    // ========================================================
    // COMPROBANTE DE TURNO (MODAL TICKET)
    // ========================================================
    function mostrarComprobanteTicket(paciente) {
        const calculo = sistema.calcularEsperaParaTurno(paciente.tipoAtencion);

        ticketNumero.textContent = paciente.turno;
        ticketNombre.textContent = paciente.nombre;
        ticketEdad.textContent = `${paciente.edad} años`;
        ticketMotivo.textContent = paciente.motivo;
        
        const textoUrgencia = {
            critica: 'Nivel I (Crítica / Emergencia)',
            grave: 'Nivel II (Grave / Muy Urgente)',
            moderada: 'Nivel III (Moderada)',
            leve: 'Nivel IV / V (Leve / Estándar)'
        }[paciente.urgencia] || paciente.urgencia;

        ticketUrgencia.textContent = textoUrgencia;

        if (paciente.tipoAtencion === 'prioritaria') {
            ticketTipoBadge.textContent = 'Fila Prioritaria';
            ticketTipoBadge.className = 'ticket-queue-badge priority';
        } else {
            ticketTipoBadge.textContent = 'Fila General';
            ticketTipoBadge.className = 'ticket-queue-badge';
        }

        ticketPosicion.textContent = calculo.posicion === 0 
            ? '¡Es el siguiente en su fila!' 
            : `${calculo.posicion} paciente(s)`;
        ticketEspera.textContent = `~${calculo.minutos} minutos`;
        ticketFechaHora.textContent = `${paciente.fechaRegistro} ${paciente.horaRegistro}`;

        modalTicket.style.display = 'flex';
    }

    btnCloseTicket.addEventListener('click', () => {
        modalTicket.style.display = 'none';
    });

    btnPrintTicket.addEventListener('click', () => {
        window.print();
    });

    modalTicket.addEventListener('click', (e) => {
        if (e.target === modalTicket) {
            modalTicket.style.display = 'none';
        }
    });

    // ========================================================
    // GESTIÓN DE ATENCIÓN MÉDICA (LLAMADO Y CONSULTAS)
    // ========================================================
    btnAtenderSiguiente.addEventListener('click', () => {
        const resultado = sistema.llamarSiguiente();

        if (resultado.error) {
            mostrarToast(resultado.error, 'warning');
            return;
        }

        const p = resultado.paciente;
        audio.tocarCampanaLlamado();

        const filaTexto = resultado.filaOrigen === 'prioritaria' ? 'Fila Prioritaria' : 'Fila General';
        mostrarToast(`🔔 Turno llamado: ${p.turno} - ${p.nombre} (${filaTexto})`, 'success');

        actualizarDashboard();
    });

    btnFinalizarConsulta.addEventListener('click', () => {
        const p = sistema.finalizarConsultaActual();
        if (p) {
            detenerCronometro();
            mostrarToast(`Consulta finalizada: ${p.turno} - ${p.nombre}. Dado de alta.`, 'success');
            actualizarDashboard();
        }
    });

    btnCancelarConsulta.addEventListener('click', () => {
        if (confirm('¿Desea cancelar la consulta actual? El paciente se registrará como no presentado.')) {
            const p = sistema.cancelarConsultaActual();
            detenerCronometro();
            mostrarToast(`Consulta del turno ${p.turno} cancelada.`, 'warning');
            actualizarDashboard();
        }
    });

    // ========================================================
    // CRONÓMETRO DE CONSULTA EN CURSO
    // ========================================================
    function iniciarCronometro() {
        detenerCronometro();
        if (!sistema.inicioConsultaTimestamp) return;

        function tick() {
            const transcurridoSegundos = Math.floor((Date.now() - sistema.inicioConsultaTimestamp) / 1000);
            const mins = Math.floor(transcurridoSegundos / 60);
            const segs = transcurridoSegundos % 60;
            if (consultTimer) {
                consultTimer.textContent = `${String(mins).padStart(2, '0')}:${String(segs).padStart(2, '0')}`;
            }
        }
        tick();
        cronometroInterval = setInterval(tick, 1000);
    }

    function detenerCronometro() {
        if (cronometroInterval) {
            clearInterval(cronometroInterval);
            cronometroInterval = null;
        }
        if (consultTimer) consultTimer.textContent = '00:00';
    }

    // ========================================================
    // RENDERIZADO DEL DASHBOARD Y COLAS FIFO
    // ========================================================
    function renderizarPacienteItem(p, index, tipoFila) {
        const esPrimero = index === 0;
        const textoUrgencia = {
            critica: 'Crítica',
            grave: 'Grave',
            moderada: 'Moderada',
            leve: 'Leve'
        }[p.urgencia] || p.urgencia;

        return `
            <li class="patient-queue-item ${esPrimero ? 'first-in-line' : ''}">
                <div class="item-top-row">
                    <span class="item-turn-code">${p.turno}</span>
                    <span class="item-fifo-rank">${index + 1}° en orden FIFO</span>
                </div>
                <div class="item-patient-name">${p.nombre} <span class="item-patient-age">(${p.edad} años)</span></div>
                <div class="item-reason">${p.motivo}</div>
                <div class="item-bottom-row">
                    <span class="triage-pill ${p.urgencia}">${textoUrgencia}</span>
                    <span class="item-eta">⏱ ~${p.tiempoEstimado} min</span>
                </div>
            </li>
        `;
    }

    function actualizarDashboard() {
        const stats = sistema.obtenerEstadisticas();

        // 1. Contadores y Bandeja
        trayEnEspera.textContent = stats.totalEnEspera;
        trayAtendidos.textContent = stats.totalAtendidos;
        trayTiempoEspera.textContent = `${stats.tiempoEsperaAcumulado} min`;

        countPrioritaria.textContent = sistema.colaPrioritaria.length;
        countGeneral.textContent = sistema.colaGeneral.length;
        tabCountHistorial.textContent = sistema.historial.length;

        // 2. Fila Prioritaria (FIFO)
        if (sistema.colaPrioritaria.length === 0) {
            listaPrioritaria.innerHTML = `
                <div class="empty-queue-placeholder">
                    <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="1.5">
                        <circle cx="12" cy="12" r="10"/>
                        <path d="M8 12h8"/>
                    </svg>
                    <p>Fila prioritaria vacía.<br>El médico atenderá a la fila general.</p>
                </div>
            `;
        } else {
            listaPrioritaria.innerHTML = sistema.colaPrioritaria
                .map((p, idx) => renderizarPacienteItem(p, idx, 'prioritaria'))
                .join('');
        }

        // 3. Fila General (FIFO)
        if (sistema.colaGeneral.length === 0) {
            listaGeneral.innerHTML = `
                <div class="empty-queue-placeholder">
                    <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="1.5">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                        <circle cx="9" cy="7" r="4"/>
                    </svg>
                    <p>No hay pacientes en fila general.</p>
                </div>
            `;
        } else {
            listaGeneral.innerHTML = sistema.colaGeneral
                .map((p, idx) => renderizarPacienteItem(p, idx, 'general'))
                .join('');
        }

        // 4. Estación Médica y Consulta Activa
        const pacienteActivo = sistema.pacienteEnConsulta;
        if (pacienteActivo) {
            panelMedicoLibre.style.display = 'none';
            panelEnConsulta.style.display = 'flex';

            doctorStatusPill.className = 'status-pill status-busy';
            doctorStatusText.textContent = 'En Consulta Médica';

            activeTurnoCode.textContent = pacienteActivo.turno;
            activeNombre.textContent = pacienteActivo.nombre;
            activeDetails.textContent = `Edad: ${pacienteActivo.edad} años • Motivo: ${pacienteActivo.motivo}`;
            consultEstimado.textContent = `${pacienteActivo.tiempoEstimado} min`;
            activeTipoBadge.textContent = pacienteActivo.tipoAtencion === 'prioritaria' ? 'Prioritaria' : 'General';
            activeTipoBadge.className = `queue-tag ${pacienteActivo.tipoAtencion === 'prioritaria' ? 'prio' : 'gene'}`;

            iniciarCronometro();

            // TV Screen
            tvTurnoCode.textContent = pacienteActivo.turno;
            tvPatientName.textContent = pacienteActivo.nombre;
            tvConsultDetails.textContent = `Pase a Consultorio 1 • ${pacienteActivo.motivo}`;
        } else {
            panelEnConsulta.style.display = 'none';
            panelMedicoLibre.style.display = 'flex';

            doctorStatusPill.className = 'status-pill status-available';
            doctorStatusText.textContent = 'Médico Disponible';

            detenerCronometro();

            // Previsualización predictiva del siguiente candidato
            const candidato = sistema.obtenerSiguienteCandidato();
            if (candidato) {
                const c = candidato.paciente;
                if (candidato.origen === 'prioritaria') {
                    candidateQueueType.textContent = 'Fila Prioritaria';
                    candidateQueueType.className = 'candidate-queue prio';
                    candidateBody.innerHTML = `<strong>${c.turno}</strong> - ${c.nombre} <small>(${c.motivo})</small>`;
                } else {
                    candidateQueueType.textContent = 'Fila General';
                    candidateQueueType.className = 'candidate-queue gene';
                    candidateBody.innerHTML = `<strong>${c.turno}</strong> - ${c.nombre} <small>(${c.motivo})</small>`;
                }
            } else {
                candidateQueueType.textContent = 'Sin pendientes';
                candidateQueueType.className = 'candidate-queue empty';
                candidateBody.innerHTML = `<span style="color:#64748b; font-weight:normal;">No hay pacientes en espera. Las dos filas están libres.</span>`;
            }

            // TV Screen si no hay nadie adentro
            tvTurnoCode.textContent = '--';
            tvPatientName.textContent = 'Ningún paciente en consulta activa';
            tvConsultDetails.textContent = 'Favor de esperar su turno en la sala de atención';
        }

        // 5. Próximos turnos en TV de Sala
        tvListaPrioritaria.innerHTML = sistema.colaPrioritaria.slice(0, 4).map(p => `
            <li class="tv-upcoming-item">
                <span class="tv-item-code">${p.turno}</span>
                <span>${p.nombre}</span>
                <span class="tv-item-wait">~${p.tiempoEstimado}m</span>
            </li>
        `).join('') || '<li style="color:#64748b; font-size:0.8rem; padding:0.4rem;">Sin pacientes prioritarios</li>';

        tvListaGeneral.innerHTML = sistema.colaGeneral.slice(0, 4).map(p => `
            <li class="tv-upcoming-item">
                <span class="tv-item-code">${p.turno}</span>
                <span>${p.nombre}</span>
                <span class="tv-item-wait">~${p.tiempoEstimado}m</span>
            </li>
        `).join('') || '<li style="color:#64748b; font-size:0.8rem; padding:0.4rem;">Sin pacientes generales</li>';
    }

    // ========================================================
    // RENDERIZADO DE ESTADÍSTICAS
    // ========================================================
    function renderizarEstadisticas() {
        const stats = sistema.obtenerEstadisticas();

        statTotalRegistrados.textContent = stats.totalRegistrados;
        statTotalAtendidos.textContent = stats.totalAtendidos;
        statTasaAtencion.textContent = `${stats.tasaAtencion}% de demanda atendida`;

        statEnEspera.textContent = stats.totalEnEspera;
        statDesgloseEspera.textContent = `${stats.enEsperaPrio} Prioritarios • ${stats.enEsperaGen} Generales`;

        statPromedioTiempo.innerHTML = `${stats.promedioEstimado} <small style="font-size:1rem;">min</small>`;
        statTiempoAcumulado.textContent = `Acumulado en consultas: ${stats.sumaDuracionReal} min`;

        // Proporción de Filas
        const totalTipos = stats.tipos.prioritaria + stats.tipos.general;
        const pctPrio = totalTipos > 0 ? Math.round((stats.tipos.prioritaria / totalTipos) * 100) : 0;
        const pctGen = totalTipos > 0 ? (100 - pctPrio) : 0;

        ratioBarPrioritaria.style.width = `${pctPrio}%`;
        ratioBarGeneral.style.width = `${pctGen}%`;
        statPrioCount.textContent = stats.tipos.prioritaria;
        statPrioPct.textContent = `${pctPrio}%`;
        statGenCount.textContent = stats.tipos.general;
        statGenPct.textContent = `${pctGen}%`;

        // Barras de Urgencia (Manchester)
        const totalUrgencias = stats.urgencias.critica + stats.urgencias.grave + stats.urgencias.moderada + stats.urgencias.leve;
        const labelsUrg = [
            { id: 'critica', label: 'Nivel I: Crítica / Emergencia', class: 'fill-critica', count: stats.urgencias.critica },
            { id: 'grave', label: 'Nivel II: Grave / Muy Urgente', class: 'fill-grave', count: stats.urgencias.grave },
            { id: 'moderada', label: 'Nivel III: Moderada', class: 'fill-moderada', count: stats.urgencias.moderada },
            { id: 'leve', label: 'Nivel IV/V: Leve / Estándar', class: 'fill-leve', count: stats.urgencias.leve }
        ];

        triageBarsList.innerHTML = labelsUrg.map(u => {
            const pct = totalUrgencias > 0 ? Math.round((u.count / totalUrgencias) * 100) : 0;
            return `
                <div class="triage-bar-item">
                    <div class="triage-bar-meta">
                        <span>${u.label}</span>
                        <strong>${u.count} (${pct}%)</strong>
                    </div>
                    <div class="triage-track">
                        <div class="triage-fill ${u.class}" style="width: ${pct}%;"></div>
                    </div>
                </div>
            `;
        }).join('');
    }

    // Exportar Estadísticas a JSON
    btnExportStats.addEventListener('click', () => {
        const datos = {
            fechaReporte: new Date().toISOString(),
            estadisticas: sistema.obtenerEstadisticas(),
            historial: sistema.historial
        };
        const blob = new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `reporte_turnos_hospital_${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        mostrarToast('Reporte exportado exitosamente.', 'success');
    });

    // ========================================================
    // RENDERIZADO DEL HISTORIAL DE PACIENTES
    // ========================================================
    function renderizarHistorial() {
        const query = (filtroHistorial.value || '').toLowerCase().trim();
        const filtrados = sistema.historial.filter(p => {
            if (!query) return true;
            return (
                p.nombre.toLowerCase().includes(query) ||
                p.turno.toLowerCase().includes(query) ||
                p.motivo.toLowerCase().includes(query) ||
                p.urgencia.toLowerCase().includes(query)
            );
        });

        if (filtrados.length === 0) {
            tablaHistorialBody.innerHTML = `
                <tr>
                    <td colspan="9" style="text-align:center; padding: 2.5rem; color: #64748b;">
                        ${sistema.historial.length === 0 
                            ? 'Aún no se han completado consultas médicas el día de hoy.' 
                            : 'No se encontraron pacientes que coincidan con la búsqueda.'}
                    </td>
                </tr>
            `;
            return;
        }

        const textoUrg = {
            critica: 'Nivel I (Crítica)',
            grave: 'Nivel II (Grave)',
            moderada: 'Nivel III (Moderada)',
            leve: 'Nivel IV/V (Leve)'
        };

        tablaHistorialBody.innerHTML = filtrados.map(p => `
            <tr>
                <td>
                    <span class="table-turn-pill ${p.tipoAtencion === 'prioritaria' ? 'prio' : 'gene'}">
                        ${p.turno}
                    </span>
                </td>
                <td><strong>${p.nombre}</strong></td>
                <td>${p.edad} años</td>
                <td>
                    <span class="triage-pill ${p.urgencia}">${textoUrg[p.urgencia] || p.urgencia}</span>
                </td>
                <td>${p.tipoAtencion === 'prioritaria' ? 'Prioritaria' : 'General'}</td>
                <td>${p.motivo}</td>
                <td><small>${p.horaRegistro}</small></td>
                <td><small>${p.horaAtencion || '--'}</small></td>
                <td><strong>${p.duracionRealMinutos || p.tiempoEstimado} min</strong></td>
            </tr>
        `).join('');
    }

    filtroHistorial.addEventListener('input', renderizarHistorial);

    // ========================================================
    // ACCIONES GENERALES (DEMO, REINICIO, AUDIO)
    // ========================================================
    btnCargarDemo.addEventListener('click', () => {
        sistema.cargarCasosDemostracion();
        mostrarToast('Se cargaron 6 pacientes de prueba con prioridades y urgencias.', 'success');
        actualizarDashboard();
    });

    btnLimpiarDatos.addEventListener('click', () => {
        if (confirm('¿Está seguro de reiniciar todo el sistema de turnos? Se borrarán colas, historial y estadísticas.')) {
            sistema.reiniciarTodo();
            detenerCronometro();
            mostrarToast('Sistema reiniciado correctamente.', 'info');
            actualizarDashboard();
            renderizarEstadisticas();
            renderizarHistorial();
        }
    });

    btnSoundToggle.addEventListener('click', () => {
        const activo = audio.toggle();
        if (activo) {
            iconSoundOn.style.display = 'block';
            iconSoundOff.style.display = 'none';
            labelSound.textContent = 'Sonido Activo';
            audio.tocarCampanaLlamado();
            mostrarToast('Sonido activado', 'info');
        } else {
            iconSoundOn.style.display = 'none';
            iconSoundOff.style.display = 'block';
            labelSound.textContent = 'Silenciado';
            mostrarToast('Sonido silenciado', 'info');
        }
    });

    // Inicializar UI al cargar
    actualizarDashboard();
});
