import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, Switch, SafeAreaView, Alert, ScrollView } from 'react-native';
import { registerBackgroundAlerts, unregisterBackgroundAlerts, checkAlertNow } from './src/services/BackgroundAlertService';
import VideoViewer from './src/components/VideoViewer';
import AlertHistory from './src/components/AlertHistory';

export default function App() {
  const [isArmed, setIsArmed] = useState(false);

  useEffect(() => {
    const requestPermissions = async () => {
      console.log("Notificaciones nativas desactivadas en modo Expo Go.");
    };
    requestPermissions();
  }, []);

  // Polling en primer plano: 
  // BackgroundFetch en Android solo se ejecuta cuando la app está CERRADA y el sistema 
  // operativo lo permite (frecuentemente ignora el intervalo de 15s para ahorrar batería).
  // Este useEffect asegura que si tienes la app ABIERTA en pantalla y el sistema armado, 
  // chequee el sensor cada 3 segundos en tiempo real.
  useEffect(() => {
    let interval;
    if (isArmed) {
      interval = setInterval(() => {
        checkAlertNow();
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [isArmed]);

  const toggleArming = async () => {
    const nextState = !isArmed;
    setIsArmed(nextState);
    
    if (nextState) {
      await registerBackgroundAlerts();
      Alert.alert('Sistema Armado', 'Vigilancia activa. Si dejas la app abierta, atrapará eventos en tiempo real. Si la minimizas, Android demorará las consultas para ahorrar batería.');
    } else {
      await unregisterBackgroundAlerts();
      Alert.alert('Sistema Desarmado', 'La detección de intrusos ha sido desactivada.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={styles.header}>
          <Text style={styles.title}>Sistema IoT Intrusos</Text>
        </View>

        <View style={styles.viewerContainer}>
          <VideoViewer />
        </View>

        <View style={styles.controlsContainer}>
          <Text style={styles.controlTitle}>Panel de Control</Text>
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Modo "Fuera de Casa" (Armado):</Text>
            <Switch
              trackColor={{ false: "#767577", true: "#ff4444" }}
              thumbColor={isArmed ? "#fff" : "#f4f3f4"}
              ios_backgroundColor="#3e3e3e"
              onValueChange={toggleArming}
              value={isArmed}
            />
          </View>
          <Text style={styles.statusText}>
            Estado: {isArmed ? "Vigilando (Historial Activo)" : "Desarmado"}
          </Text>
        </View>

        <AlertHistory />
        
        <View style={{height: 50}} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  header: {
    padding: 20,
    paddingTop: 50,
    backgroundColor: '#1e1e1e',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
  viewerContainer: {
    height: 300,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 20,
  },
  controlsContainer: {
    padding: 20,
    backgroundColor: '#1e1e1e',
    marginHorizontal: 15,
    borderRadius: 10,
  },
  controlTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  switchLabel: {
    fontSize: 16,
    color: '#ddd',
  },
  statusText: {
    marginTop: 10,
    fontSize: 14,
    color: '#aaa',
    fontStyle: 'italic',
  }
});
