// public/js/modules/services/index.js
import { ServiciosManager } from "./manager.js";

/**
 * Creamos una instancia ÚNICA del manager.
 * Todos los demás archivos que importen 'serviciosManager' 
 * desde este archivo, recibirán esta misma instancia.
 */
export const serviciosManager = new ServiciosManager();