# Sistema de Administración de Turnos en un Hospital

Sistema web para administrar los turnos de los pacientes que solicitan atención en el área de consulta médica de un hospital.

## Descripción del Proyecto

Cuando un paciente llega al hospital, se registra y recibe un número de turno consecutivo.
Dependiendo de su condición y el tipo de atención que requiere, es incorporado a una de las siguientes dos filas:

1. **Fila de atención general**: Pacientes que requieren consulta y pueden ser atendidos conforme al orden de llegada (FIFO).
2. **Fila de atención prioritaria**: Pacientes que por las características de su condición requieren ser atendidos antes que los pacientes de atención general.

## Reglas del Sistema (FIFO y Prioridad)

- Dentro de cada fila se respeta estrictamente el principio **FIFO** (*First In, First Out*).
- Cuando un médico está disponible, **deberá atender primero a los pacientes de la fila prioritaria**.
- **Si esta fila se encuentra vacía**, deberá atender al primer paciente de la **fila general**.

## Datos del Paciente

Cada paciente cuenta con los siguientes datos:
- **Número de turno**
- **Nombre completo**
- **Edad**
- **Motivo de consulta**
- **Clasificación de urgencias** (Leve, Moderada, Grave, Crítica)
- **Tipo de atención** (Atención General o Atención Prioritaria)
- **Tiempo estimado en la atención** (en minutos)

## Funcionalidades del Sistema

- **Registro de Pacientes**: Formulario para capturar los datos y asignarle su turno en la fila seleccionada.
- **Control de Consultas**: Botón para que el médico disponible llame al siguiente paciente respetando la prioridad y muestre sus datos en pantalla.
- **Filas de Atención en Vivo**: Muestra visual de los pacientes en espera dentro de la fila prioritaria y la fila general.
- **Estadísticas de Atención**:
  - Total de pacientes registrados.
  - Total de pacientes atendidos.
  - Total en espera.
  - Tiempo promedio estimado de consulta.
  - Conteo por nivel de urgencia.
- **Historial de Pacientes Atendidos**: Lista de los pacientes que ya fueron atendidos por el médico.

## Tecnologías Utilizadas

- **HTML5**: Estructura básica y limpia.
- **CSS3**: Estilos sencillos y legibles.
- **JavaScript (Vanilla)**: Manejo de colas FIFO, lógica de prioridad y `localStorage`.

## Cómo Ejecutar

Solo abre el archivo `index.html` en cualquier navegador web haciendo doble clic sobre él. No requiere servidores ni instalaciones adicionales.
