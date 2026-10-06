import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { clearAlertHistory } from '../services/BackgroundAlertService';

export default function AlertHistory() {
  const [history, setHistory] = useState([]);

  const loadHistory = async () => {
    try {
      const data = await AsyncStorage.getItem('@alert_history');
      if (data) {
        setHistory(JSON.parse(data));
      } else {
        setHistory([]);
      }
    } catch (e) {
      console.log("Error leyendo historial", e);
    }
  };

  // Recargar historial al iniciar y luego chequear cada 5 segundos
  useEffect(() => {
    loadHistory();
    const interval = setInterval(loadHistory, 5000); 
    return () => clearInterval(interval);
  }, []);

  const handleClear = async () => {
    await clearAlertHistory();
    setHistory([]);
  };

  const renderItem = ({ item }) => {
    const date = new Date(item.time);
    return (
      <View style={styles.alertCard}>
        <View style={styles.alertInfo}>
          <Text style={styles.alertTitle}>Alerta detectada</Text>
          <Text style={styles.alertDate}>{date.toLocaleDateString()} - {date.toLocaleTimeString()}</Text>
        </View>
        {item.imageUri ? (
          <Image source={{ uri: item.imageUri }} style={styles.alertImage} />
        ) : (
          <View style={styles.noImageBlock}>
            <Text style={styles.noImageText}>Sin foto</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Historial ({history.length})</Text>
        {history.length > 0 && (
          <TouchableOpacity onPress={handleClear}>
            <Text style={styles.clearText}>Borrar</Text>
          </TouchableOpacity>
        )}
      </View>
      
      {history.length === 0 ? (
        <Text style={styles.emptyText}>No hay alertas registradas recientemente.</Text>
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          style={styles.list}
          nestedScrollEnabled={true}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 20,
    backgroundColor: '#1e1e1e',
    borderRadius: 10,
    padding: 15,
    marginHorizontal: 15,
    height: 350,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  clearText: {
    color: '#ff4444',
    fontSize: 14,
  },
  emptyText: {
    color: '#aaa',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 20,
  },
  list: {
    flex: 1,
  },
  alertCard: {
    flexDirection: 'row',
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    alignItems: 'center',
  },
  alertInfo: {
    flex: 1,
  },
  alertTitle: {
    color: '#ff4444',
    fontWeight: 'bold',
    fontSize: 16,
  },
  alertDate: {
    color: '#ccc',
    fontSize: 12,
    marginTop: 4,
  },
  alertImage: {
    width: 60,
    height: 45,
    borderRadius: 4,
    backgroundColor: '#000',
    marginLeft: 10,
  },
  noImageBlock: {
    width: 60,
    height: 45,
    borderRadius: 4,
    backgroundColor: '#444',
    marginLeft: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noImageText: {
    color: '#888',
    fontSize: 10,
  }
});
