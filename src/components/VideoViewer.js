import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';

const STREAM_URL = 'http://192.168.4.2:8080/video';

export default function VideoViewer() {
  const [error, setError] = useState(false);
  const [retryTimeout, setRetryTimeout] = useState(1000);
  const [key, setKey] = useState(Date.now());

  useEffect(() => {
    let timer;
    if (error) {
      timer = setTimeout(() => {
        setError(false);
        setKey(Date.now());
        setRetryTimeout(prev => Math.min(prev * 2, 16000));
      }, retryTimeout);
    } else {
      setRetryTimeout(1000);
    }
    return () => clearTimeout(timer);
  }, [error, retryTimeout]);

  // Se inyecta un HTML que ocupa todo el espacio sin márgenes para mostrar el Stream
  const htmlContent = `
    <html>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <body style="margin:0;padding:0;background-color:black;display:flex;justify-content:center;align-items:center;height:100vh;overflow:hidden;">
        <img src="${STREAM_URL}?t=${key}" style="width:100%;height:100%;object-fit:contain;" onerror="window.ReactNativeWebView.postMessage('error')" />
      </body>
    </html>
  `;

  return (
    <View style={styles.container}>
      {!error ? (
        <WebView 
          key={key}
          source={{ html: htmlContent }}
          style={styles.videoStream}
          scrollEnabled={false}
          bounces={false}
          onMessage={(event) => {
            if(event.nativeEvent.data === 'error') {
              setError(true);
            }
          }}
          onError={() => setError(true)}
        />
      ) : (
        <View style={styles.errorContainer}>
          <ActivityIndicator size="large" color="#ff4444" />
          <Text style={styles.errorText}>Conexión con cámara perdida.</Text>
          <Text style={styles.errorText}>Reconectando en {retryTimeout / 1000}s...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    backgroundColor: '#000',
  },
  videoStream: {
    flex: 1,
    backgroundColor: '#000',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  errorText: {
    color: '#ff4444',
    marginTop: 10,
    fontSize: 16,
  }
});
