import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';

const ALERT_TASK = 'BACKGROUND_INTRUDER_ALERT';
const IP_WEBCAM_BASE = 'http://192.168.4.2:8080';
const CAMERA_SNAPSHOT_URL = `${IP_WEBCAM_BASE}/shot.jpg`;
const SENSORS_URL = `${IP_WEBCAM_BASE}/sensors.json?sense=motion_active`;

export const checkAlertNow = async () => {
  const nowMs = Date.now();
  // Agregamos el timestamp a la URL para obligar al sistema a ignorar la caché de red
  const url = `${SENSORS_URL}&t=${nowMs}`;
  console.log(`[DEBUG] Consultando sensores en: ${url}`);
  
  try {
    // Usamos el API nativo fetch en lugar de axios para manejar mejor las peticiones locales sin fallos de CORS internos
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000); // Ampliamos el timeout a 6 segundos

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`El servidor respondió con HTTP ${response.status}`);
    }

    const data = await response.json();
    let isMotionActive = false;
    
    if (data && data.motion_active && data.motion_active.data) {
      const dataArray = data.motion_active.data;
      if (dataArray.length > 0) {
        const lastReading = dataArray[dataArray.length - 1]; 
        if (lastReading && lastReading[1] && lastReading[1][0] > 0.5) {
          isMotionActive = true;
        }
      }
    }

    console.log(`[DEBUG] ¿Cámara detectó movimiento?:`, isMotionActive);

    if (isMotionActive) {
      const now = Date.now();
      const lastAlertStr = await AsyncStorage.getItem('@last_alert_time');
      if (lastAlertStr && (now - parseInt(lastAlertStr)) < 30000) {
         console.log("[DEBUG] Movimiento detectado, pero ignorado por Cooldown (espera 30s).");
         return true; 
      }
      await AsyncStorage.setItem('@last_alert_time', now.toString());

      console.log("🚨 ALERTA DE INTRUSO 🚨 ¡Movimiento atrapado por análisis de video!");
      
      const timestamp = new Date().toISOString();
      const filename = `alert_${now}.jpg`;
      const fileUri = FileSystem.documentDirectory + filename;
      
      let localImageUri = null;
      try {
        console.log(`[DEBUG] Descargando foto de la evidencia...`);
        const downloadRes = await FileSystem.downloadAsync(`${CAMERA_SNAPSHOT_URL}?t=${now}`, fileUri);
        localImageUri = downloadRes.uri;
        console.log(`[DEBUG] Evidencia guardada en local: ${localImageUri}`);
      } catch (imgErr) {
        console.log("[ERROR] No se pudo descargar la evidencia:", imgErr.message);
      }

      try {
        const historyJson = await AsyncStorage.getItem('@alert_history');
        const history = historyJson ? JSON.parse(historyJson) : [];
        
        history.unshift({
          id: now.toString(),
          time: timestamp,
          imageUri: localImageUri
        });
        
        const limitedHistory = history.slice(0, 20);
        await AsyncStorage.setItem('@alert_history', JSON.stringify(limitedHistory));
        console.log("[DEBUG] Historial actualizado en la app.");
      } catch (storageErr) {
        console.log("[ERROR] Fallo guardando historial:", storageErr);
      }
      return true;
    }
    return false;
  } catch (error) {
    if (error.name === 'AbortError') {
      console.log(`[ERROR] Tiempo de espera agotado (Timeout) conectando a la cámara IP. Está muy lenta.`);
    } else {
      console.log(`[ERROR] Falló la conexión con la cámara IP:`, error.message);
    }
    return false; 
  }
};

TaskManager.defineTask(ALERT_TASK, async () => {
  const hasAlert = await checkAlertNow();
  return hasAlert ? BackgroundFetch.BackgroundFetchResult.NewData : BackgroundFetch.BackgroundFetchResult.NoData;
});

export const registerBackgroundAlerts = async () => {
  try {
    await BackgroundFetch.registerTaskAsync(ALERT_TASK, {
      minimumInterval: 15, 
      stopOnTerminate: false, 
      startOnBoot: true,      
    });
    console.log("Servicio en segundo plano registrado.");
  } catch (err) {
    console.log("Error registrando la tarea de fondo:", err);
  }
};

export const unregisterBackgroundAlerts = async () => {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(ALERT_TASK);
    if (isRegistered) {
      await BackgroundFetch.unregisterTaskAsync(ALERT_TASK);
      console.log("Servicio en segundo plano detenido.");
    }
  } catch (err) {
    console.log("Error deteniendo la tarea de fondo:", err);
  }
};

export const clearAlertHistory = async () => {
  await AsyncStorage.removeItem('@alert_history');
  await AsyncStorage.removeItem('@last_alert_time');
  console.log("[DEBUG] Historial y cooldown borrados.");
};
