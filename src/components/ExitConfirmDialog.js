// src/components/ExitConfirmDialog.js
import React, { useRef, useEffect } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ClickSoundContext } from '../../app/clickSound';

export default function ExitConfirmDialog({ visible, title = 'Exit ChessMate', message = 'Are you sure you want to exit?', cancelText = 'Cancel', exitText = 'Exit', onCancel, onExit }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const clickSoundContext = React.useContext(ClickSoundContext);
  const scale = useRef(new Animated.Value(0.96)).current;
  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 160, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, friction: 9, tension: 80, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 140, easing: Easing.in(Easing.quad), useNativeDriver: true }),
        Animated.timing(scale, { toValue: 0.96, duration: 140, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      ]).start();
    }
  }, [visible, opacity, scale]);
  return (
    <Modal animationType="none" transparent visible={visible} onRequestClose={()=>{clickSoundContext?.playClick?.(),onCancel()}} hardwareAccelerated>
      <Animated.View style={[styles.overlay, { opacity }]}>
        <Animated.View style={[styles.card, { transform: [{ scale }] }]}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <View style={styles.row}>
            <TouchableOpacity activeOpacity={0.85} style={{ flex: 1, marginRight: 8 }} onPress={()=>{clickSoundContext?.playClick?.(),onCancel()}}>
              <View style={styles.ghostBtn}><Text style={styles.ghostText}>{cancelText}</Text></View>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.9} style={{ flex: 1 }} onPress={()=>{clickSoundContext?.playClick?.(),onExit()}}>
              <LinearGradient colors={['#FF6B6B', '#FF8E8E']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.primaryBtn}>
                <Text style={styles.primaryText}>{exitText}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}
const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  card: { width: '84%', maxWidth: 420, borderRadius: 18, padding: 18, backgroundColor: '#101010', borderWidth: 1, borderColor: '#2A2A2A' },
  title: { color: '#EDEDED', fontSize: 18, fontWeight: '800', textAlign: 'center', marginBottom: 8 },
  message: { color: '#CFCFCF', fontSize: 13, lineHeight: 20, textAlign: 'center', marginBottom: 16 },
  row: { flexDirection: 'row', alignItems: 'center' },
  ghostBtn: { borderRadius: 12, borderWidth: 1, borderColor: '#333', backgroundColor: '#1A1A1A', paddingVertical: 12, alignItems: 'center' },
  ghostText: { color: '#EDEDED', fontWeight: '800' },
  primaryBtn: { borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  primaryText: { color: '#FFFFFF', fontWeight: '800' },
});


