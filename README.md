# Sistema de Administración de Turnos en Hospital

Sistema web profesional para la administración de turnos y gestión de flujo de pacientes en el área de **Consulta Externa y Triaje Médico**, desarrollado bajo principios de usabilidad clínica, colas **FIFO** por prioridad y estándares de clasificación de urgencias.

---

## 📌 Descripción del Sistema

Cuando un paciente arriba a la unidad hospitalaria, acude al módulo de admisión/recepción donde es registrado y se le asigna un número de turno oficial (`P-001` para prioritaria, `G-001` para general).

Dependiendo de su edad, condición clínica y el tipo de atención que requiere, el paciente es incorporado a una de las siguientes dos filas:

1. **Fila de Atención Prioritaria**: Pacientes que por las características de su condición (emergencias, dolor severo/agudo, adultos mayores ≥65 años, niños ≤5 años, mujeres embarazadas) requieren ser atendidos antes que los pacientes generales.
2. **Fila de Atención General**: Pacientes que requieren consulta médica regular (controles de rutina, recetas, sintomatología leve o moderada) y son atendidos estrictamente conforme a su orden de llegada.

---

## ⚖️ Reglas de Atención Médica (Algoritmo de Colas)

El sistema garantiza el cumplimiento de las siguientes directrices:

* **Principio FIFO dentro de cada fila**: Tanto la fila prioritaria como la general operan bajo el principio First-In, First-Out (el primer paciente en llegar a una fila es el primero en ser llamado dentro de esa misma fila).
* **Precedencia de Atención Prioritaria**: Cuando un médico se encuentra disponible en su consultorio, **siempre atiende primero a los pacientes de la fila prioritaria** (FIFO).
* **Atención a la Fila General**: **Únicamente cuando la fila prioritaria se encuentra completamente vacía**, el médico procede a atender al primer paciente en espera de la fila general (FIFO).

---

## 📋 Datos del Paciente Registrado

Cada registro clínico cuenta obligatoriamente con los siguientes campos:

| Campo | Tipo | Descripción |
| :--- | :--- | :--- |
| **Número de Turno** | Texto | Identificador único (`P-001` para Fila Prioritaria, `G-001` para Fila General). |
| **Nombre Completo** | Texto | Nombre y apellidos del paciente. |
| **Edad** | Numérico | Edad en años (con detección automática de grupos prioritarios). |
| **Motivo de Consulta** | Texto | Descripción clínica o síntoma principal que motiva la visita. |
| **Tipo de Atención** | Selección | `Fila Prioritaria` o `Fila General`. |
| **Tiempo Estimado** | Numérico | Duración prevista de la consulta en minutos (ej. 10, 15, 20 min). |
| **Clasificación de Urgencia** | Escala | Nivel de triaje clínico (Crítica, Grave, Moderada, Leve). |

---

## 🩺 Clasificación de Urgencias (Triaje Clínico)

El sistema integra una escala basada en protocolos hospitalarios tipo Manchester / ESI:

* **Nivel I: Crítica / Emergencia (Rojo)**: Riesgo vital inmediato o descompensación severa. Asignado a **Fila Prioritaria**.
* **Nivel II: Grave / Muy Urgente (Naranja)**: Dolor agudo o condición de alto riesgo sin peligro de vida inminente. Asignado a **Fila Prioritaria**.
* **Nivel III: Moderada / Urgente Relativa (Amarillo)**: Síntomas moderados que toleran espera. Asignado a **Fila General** (salvo criterio de edad).
* **Nivel IV / V: Leve / Consulta Estándar (Verde)**: Controles rutinarios, certificados médicos, recetas. Asignado a **Fila General**.

---

## 🚀 Módulos y Funcionalidades Principales

1. **Módulo de Admisión & Triaje**:
   * Registro con atajos rápidos para motivos clínicos comunes.
   * Detección automática de grupo de edad (Adulto Mayor / Pediátrico).
   * Generación automática del **Comprobante de Turno (Ticket)** con cálculo de posición en fila y tiempo de espera estimado, listo para imprimir.
2. **Estación Médica (Consultorio)**:
   * Botón de llamado con indicación predictiva en tiempo real de quién es el siguiente paciente según las reglas FIFO.
   * Campanilla sonora hospitalaria (Web Audio API) al realizar el llamado.
   * Cronómetro de tiempo en consulta en vivo frente al tiempo estimado.
   * Finalización de consulta con cálculo automático de duración real.
3. **Monitor de Sala de Espera (Modo Pantalla TV)**:
   * Vista de alta visibilidad para monitores de sala con el turno llamado en gran tamaño y la lista de los próximos turnos en espera.
4. **Panel de Estadísticas Clínicas**:
   * Indicadores de demanda (registrados, concluidos, en espera, tiempos promedio).
   * Gráficas de distribución por nivel de urgencia y proporción entre filas.
   * Exportación de métricas a archivo JSON descargable.
5. **Historial de Consultas Médicas**:
   * Auditoría clínica completa con buscador en tiempo real por nombre, turno o motivo.
6. **Herramientas de Demostración**:
   * Botón **"Cargar Casos Demo"** para poblar al instante 6 pacientes con diferentes niveles de urgencia y verificar de inmediato el orden de atención FIFO.

---

## 💻 Tecnologías Utilizadas

* **HTML5 Semántico**: Estructura accesible y modular.
* **CSS3 Moderno**: Diseño con variables CSS, arquitectura Flexbox/Grid responsiva, tipografía médica (`Plus Jakarta Sans` y `JetBrains Mono`) y paleta clínica de alto contraste.
* **JavaScript Moderno (ES6+)**: Programación orientada a objetos sin librerías externas para garantizar velocidad, cero dependencias y máxima compatibilidad.
* **Web Audio API**: Generación sintética del timbre hospitalario de llamado.
* **Web Storage API (`localStorage`)**: Persistencia de turnos, estado de consulta e historial.

---

## 🛠️ Cómo Ejecutar el Proyecto

1. Abrir la carpeta del proyecto en el explorador de archivos.
2. Hacer doble clic en el archivo `index.html` para abrirlo en cualquier navegador web moderno (Chrome, Edge, Firefox, Safari).
3. No requiere instalar Node.js, Python ni servidores externos: funciona 100% en el navegador de manera autónoma.
