# Skills

No existen skills específicas del proyecto confirmadas ni una ruta local que el cliente actual descubra automáticamente. Se reutiliza la skill global `skill-creator` únicamente para evaluar la forma correcta de skills; no se instala una skill de proyecto en una ubicación no confirmada.

Los procedimientos reutilizables de esta base están versionados como prompts en `prompts/` y como guías en este directorio. Una skill futura solo debe crearse cuando exista una tarea repetida, una ubicación de descubrimiento confirmada y un procedimiento que aporte decisiones no obvias. Debe validarse con el `quick_validate.py` de la skill creadora y registrarse aquí.
