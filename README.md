# Sistema de Administración de Turnos en un Hospital

Sistema web para administrar los turnos de pacientes en el área de consulta médica de un hospital.

## Descripción

Cuando un paciente llega al hospital, se registra y recibe un número de turno. Según su condición y el tipo de atención que requiere, es incorporado a una de las siguientes filas:

1. **Fila de atención general**: Pacientes que requieren consulta y pueden ser atendidos conforme al orden de llegada (FIFO).
2. **Fila de atención prioritaria**: Pacientes que por las características de su condición requieren ser atendidos antes que los de atención general.

### Reglas del sistema
- Dentro de cada fila se respeta el principio **FIFO** (First In, First Out).
- Cuando un médico está disponible, se atiende **primero** a los pacientes de la fila prioritaria.
- Si la fila prioritaria está vacía, se atiende al primer paciente de la fila general.

El sistema permite:
- Registrar pacientes con clasificación de urgencias.
- Controlar las consultas (atender pacientes).
- Generar estadísticas de atención.

## Datos del paciente

Cada paciente cuenta con:
- Número de turno
- Nombre
- Edad
- Motivo de consulta
- Tipo de atención (General / Prioritaria)
- Tiempo estimado de atención
- Clasificación de urgencia (Leve, Moderada, Grave, Crítica)

## Clasificación de urgencias

- **Leve / Moderada** → Fila de atención general
- **Grave / Crítica** → Fila de atención prioritaria

## Tecnologías

- HTML5
- CSS3
- JavaScript (Vanilla)
- Persistencia con `localStorage`

## Cómo ejecutar

1. Clona el repositorio:
   ```bash
   git clone https://github.com/Alex-RiP7/sistema-administracion-turnos-hospital.git
   ```
2. Abre el archivo `index.html` en tu navegador.

No requiere servidor ni dependencias externas.

## Funcionalidades

- Registro de nuevos pacientes con validación.
- Visualización en tiempo real de ambas colas.
- Atención de pacientes respetando la prioridad.
- Historial de pacientes atendidos.
- Panel de estadísticas (totales, por tipo, por urgencia, tiempos).
- Persistencia de datos en el navegador.

## Autor

Desarrollado como proyecto de administración de turnos hospitalarios.
