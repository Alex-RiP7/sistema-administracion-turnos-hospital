// ========================================================
// SISTEMA DE ADMINISTRACIÓN DE TURNOS EN HOSPITAL
// Proyecto Escolar: Manejo de Colas FIFO con Prioridad
// ========================================================

// Variables principales del sistema
let contadorTurnos = 1;
let filaPrioritaria = []; // Cola FIFO para atención prioritaria
let filaGeneral = [];     // Cola FIFO para atención general
let historial = [];       // Lista de pacientes ya atendidos
let pacienteActual = null; // Paciente que está siendo atendido

// Cargar datos guardados si existen en el navegador
cargarDatos();

// Referencias a los elementos del documento HTML
const formulario = document.getElementById('formularioRegistro');
const inputNombre = document.getElementById('nombre');
const inputEdad = document.getElementById('edad');
const inputMotivo = document.getElementById('motivo');
const selectUrgencia = document.getElementById('urgencia');
const selectTipoAtencion = document.getElementById('tipoAtencion');
const inputTiempo = document.getElementById('tiempo');

const btnAtender = document.getElementById('btnAtender');
const pacienteActualDiv = document.getElementById('pacienteActual');

const listaPrioritaria = document.getElementById('listaPrioritaria');
const listaGeneral = document.getElementById('listaGeneral');
const totalPrioritarios = document.getElementById('totalPrioritarios');
const totalGenerales = document.getElementById('totalGenerales');

const statRegistrados = document.getElementById('statRegistrados');
const statAtendidos = document.getElementById('statAtendidos');
const statEnEspera = document.getElementById('statEnEspera');
const statPromedioTiempo = document.getElementById('statPromedioTiempo');
const statUrgenciasTexto = document.getElementById('statUrgenciasTexto');

const listaHistorial = document.getElementById('listaHistorial');
const mensajeRegistro = document.getElementById('mensajeRegistro');
const mensajeAtencion = document.getElementById('mensajeAtencion');


// ========================================================
// 1. REGISTRAR UN NUEVO PACIENTE
// ========================================================
formulario.addEventListener('submit', function (evento) {
    evento.preventDefault();

    const nombre = inputNombre.value.trim();
    const edad = inputEdad.value;
    const motivo = inputMotivo.value.trim();
    const urgencia = selectUrgencia.value;
    const tipoAtencion = selectTipoAtencion.value;
    const tiempoEstimado = parseInt(inputTiempo.value);

    // Validación básica de campos
    if (!nombre || !edad || !motivo || !urgencia || !tipoAtencion || !tiempoEstimado) {
        mostrarMensaje(mensajeRegistro, 'Por favor llena todos los datos requeridos.', 'aviso');
        return;
    }

    // Crear el objeto del nuevo paciente con los datos solicitados
    const nuevoPaciente = {
        numeroTurno: contadorTurnos,
        nombre: nombre,
        edad: parseInt(edad),
        motivoConsulta: motivo,
        clasificacionUrgencia: urgencia,
        tipoAtencion: tipoAtencion,
        tiempoEstimado: tiempoEstimado,
        horaRegistro: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    contadorTurnos++;

    // Incorporar a la fila correspondiente (FIFO: entra al final de la fila)
    if (tipoAtencion === 'Prioritaria') {
        filaPrioritaria.push(nuevoPaciente);
    } else {
        filaGeneral.push(nuevoPaciente);
    }

    // Guardar y refrescar la pantalla
    guardarDatos();
    actualizarInterfaz();

    mostrarMensaje(
        mensajeRegistro, 
        `Paciente registrado con éxito. Se le asignó el Turno #${nuevoPaciente.numeroTurno} (${nuevoPaciente.tipoAtencion}).`, 
        'exito'
    );

    // Limpiar el formulario
    formulario.reset();
    inputTiempo.value = 15;
    selectTipoAtencion.value = 'General';
});


// ========================================================
// 2. ATENDER PACIENTES (REGLA FIFO CON PRIORIDAD)
// ========================================================
btnAtender.addEventListener('click', function () {
    let atendido = null;

    // REGLA DEL SISTEMA:
    // El médico atiende primero a los pacientes de la fila prioritaria (FIFO).
    // Si la fila prioritaria se encuentra vacía, atiende al primer paciente de la fila general (FIFO).
    if (filaPrioritaria.length > 0) {
        atendido = filaPrioritaria.shift(); // Saca al primer paciente de la fila prioritaria
    } else if (filaGeneral.length > 0) {
        atendido = filaGeneral.shift();     // Saca al primer paciente de la fila general
    }

    if (atendido) {
        pacienteActual = atendido;
        atendido.horaAtencion = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        // Agregar al historial de pacientes atendidos
        historial.unshift(atendido);

        guardarDatos();
        actualizarInterfaz();

        mostrarMensaje(
            mensajeAtencion, 
            `Llamando a: Turno #${atendido.numeroTurno} - ${atendido.nombre} (${atendido.tipoAtencion})`, 
            'exito'
        );
    } else {
        mostrarMensaje(mensajeAtencion, 'No hay pacientes esperando en ninguna de las dos filas.', 'aviso');
    }
});


// ========================================================
// 3. ACTUALIZAR LA PANTALLA
// ========================================================
function actualizarInterfaz() {
    // A) Actualizar Fila Prioritaria
    totalPrioritarios.textContent = filaPrioritaria.length;
    if (filaPrioritaria.length === 0) {
        listaPrioritaria.innerHTML = '<li class="item-vacio">No hay pacientes en la fila prioritaria.</li>';
    } else {
        listaPrioritaria.innerHTML = '';
        filaPrioritaria.forEach(function (paciente, indice) {
            listaPrioritaria.innerHTML += crearElementoPaciente(paciente, indice + 1, 'prioritaria');
        });
    }

    // B) Actualizar Fila General
    totalGenerales.textContent = filaGeneral.length;
    if (filaGeneral.length === 0) {
        listaGeneral.innerHTML = '<li class="item-vacio">No hay pacientes en la fila general.</li>';
    } else {
        listaGeneral.innerHTML = '';
        filaGeneral.forEach(function (paciente, indice) {
            listaGeneral.innerHTML += crearElementoPaciente(paciente, indice + 1, 'general');
        });
    }

    // C) Mostrar paciente que se está atendiendo
    if (pacienteActual) {
        pacienteActualDiv.innerHTML = `
            <div class="datos-paciente-actual">
                <strong>Turno #${pacienteActual.numeroTurno}:</strong> ${pacienteActual.nombre} (${pacienteActual.edad} años)<br>
                <strong>Motivo:</strong> ${pacienteActual.motivoConsulta} | 
                <strong>Urgencia:</strong> ${pacienteActual.clasificacionUrgencia} | 
                <strong>Fila:</strong> ${pacienteActual.tipoAtencion} | 
                <strong>Tiempo:</strong> ${pacienteActual.tiempoEstimado} min
            </div>
        `;
    } else {
        pacienteActualDiv.innerHTML = '<p class="texto-espera">No hay ningún paciente en consulta actualmente.</p>';
    }

    // D) Estadísticas
    const totalEnEspera = filaPrioritaria.length + filaGeneral.length;
    const totalAtendidosCount = historial.length;
    const totalRegistradosCount = contadorTurnos - 1;

    statRegistrados.textContent = totalRegistradosCount;
    statAtendidos.textContent = totalAtendidosCount;
    statEnEspera.textContent = totalEnEspera;

    // Calcular promedio de tiempo estimado
    const todosLosPacientes = [...filaPrioritaria, ...filaGeneral, ...historial];
    if (todosLosPacientes.length > 0) {
        const sumaTiempos = todosLosPacientes.reduce(function (acumulador, p) {
            return acumulador + p.tiempoEstimado;
        }, 0);
        const promedio = Math.round(sumaTiempos / todosLosPacientes.length);
        statPromedioTiempo.textContent = `${promedio} min`;
    } else {
        statPromedioTiempo.textContent = '0 min';
    }

    // Conteo por urgencias
    const conteoUrgencias = { Leve: 0, Moderada: 0, Grave: 0, Crítica: 0 };
    todosLosPacientes.forEach(function (p) {
        if (conteoUrgencias[p.clasificacionUrgencia] !== undefined) {
            conteoUrgencias[p.clasificacionUrgencia]++;
        }
    });

    statUrgenciasTexto.textContent = 
        `Leve: ${conteoUrgencias.Leve} | Moderada: ${conteoUrgencias.Moderada} | Grave: ${conteoUrgencias.Grave} | Crítica: ${conteoUrgencias.Crítica}`;

    // E) Historial de atendidos
    if (historial.length === 0) {
        listaHistorial.innerHTML = '<li class="item-vacio">Aún no se ha atendido a ningún paciente hoy.</li>';
    } else {
        listaHistorial.innerHTML = '';
        historial.forEach(function (p) {
            listaHistorial.innerHTML += `
                <li class="item-turno">
                    <strong>Turno #${p.numeroTurno}</strong> - ${p.nombre} (${p.edad} años)<br>
                    Motivo: ${p.motivoConsulta} | Urgencia: ${p.clasificacionUrgencia} | Tipo: ${p.tipoAtencion}<br>
                    <small>Registrado: ${p.horaRegistro} • Atendido: ${p.horaAtencion || '--'} • Estimado: ${p.tiempoEstimado} min</small>
                </li>
            `;
        });
    }
}


// Función para armar el texto/HTML de cada paciente en la lista de espera
function crearElementoPaciente(paciente, lugar, tipo) {
    let claseUrgencia = 'urgencia-leve';
    if (paciente.clasificacionUrgencia === 'Moderada') claseUrgencia = 'urgencia-moderada';
    if (paciente.clasificacionUrgencia === 'Grave') claseUrgencia = 'urgencia-grave';
    if (paciente.clasificacionUrgencia === 'Crítica') claseUrgencia = 'urgencia-critica';

    const claseBorde = tipo === 'prioritaria' ? 'item-prioritario' : 'item-general';

    return `
        <li class="item-turno ${claseBorde}">
            <strong>#${lugar} en fila - Turno #${paciente.numeroTurno}:</strong> ${paciente.nombre} (${paciente.edad} años)<br>
            <span>Motivo: ${paciente.motivoConsulta}</span>
            <span class="badge-urgencia ${claseUrgencia}">${paciente.clasificacionUrgencia}</span><br>
            <small>Tiempo estimado: ${paciente.tiempoEstimado} min | Llegada: ${paciente.horaRegistro}</small>
        </li>
    `;
}

// Función simple para mostrar mensajes temporales
function mostrarMensaje(elemento, texto, tipo) {
    elemento.textContent = texto;
    elemento.className = `mensaje ${tipo}`;
    setTimeout(function () {
        elemento.textContent = '';
        elemento.className = 'mensaje';
    }, 4000);
}


// ========================================================
// 4. GUARDAR Y CARGAR DATOS (LOCALSTORAGE)
// ========================================================
function guardarDatos() {
    const datos = {
        contadorTurnos: contadorTurnos,
        filaPrioritaria: filaPrioritaria,
        filaGeneral: filaGeneral,
        historial: historial,
        pacienteActual: pacienteActual
    };
    localStorage.setItem('sistema_turnos_hospital_estudiante', JSON.stringify(datos));
}

function cargarDatos() {
    const guardado = localStorage.getItem('sistema_turnos_hospital_estudiante');
    if (guardado) {
        try {
            const parsed = JSON.parse(guardado);
            contadorTurnos = parsed.contadorTurnos || 1;
            filaPrioritaria = parsed.filaPrioritaria || [];
            filaGeneral = parsed.filaGeneral || [];
            historial = parsed.historial || [];
            pacienteActual = parsed.pacienteActual || null;
        } catch (e) {
            console.error('Error al cargar datos guardados:', e);
        }
    }
}

// Inicializar la interfaz al cargar la página
actualizarInterfaz();
