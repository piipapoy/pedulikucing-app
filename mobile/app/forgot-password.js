import React, { useState } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, 
  ActivityIndicator, Image, Dimensions, ScrollView, 
  KeyboardAvoidingView, Platform 
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

const { width, height } = Dimensions.get('window');

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleReset = () => {
    if (!email) {
      Alert.alert('Peringatan', 'Mohon isi email Anda.');
      return;
    }
    
    setLoading(true);
    
    // SIMULASI REQUEST KE SERVER (MOCK)
    setTimeout(() => {
      setLoading(false);
      Alert.alert(
        'Email Terkirim', 
        `Link untuk mereset kata sandi telah dikirim ke ${email}. Silakan cek kotak masuk atau folder spam Anda.`,
        [{ text: 'Kembali ke Login', onPress: () => router.back() }]
      );
    }, 1500);
  };

  return (
    <View style={styles.mainContainer}>
      <StatusBar style="dark" />
      
      {/* Background Image Konsisten */}
      <Image 
        source={require('../src/assets/images/common/auth_bg_shape.png')} 
        style={styles.backgroundImage}
        resizeMode="cover"
      />

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          <View style={styles.header}>
            <Image 
              source={require('../src/assets/images/common/logo.png')} 
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          <View style={styles.titleSection}>
            <Text style={styles.title}>Lupa Kata Sandi? 🔒</Text>
            <Text style={styles.subtitle}>
              Jangan khawatir! Masukkan email yang terdaftar dan kami akan mengirimkan instruksi reset.
            </Text>
          </View>

          <View style={styles.formSection}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email Terdaftar</Text>
              <TextInput
                style={styles.input}
                placeholder="nama@email.com"
                placeholderTextColor="#A0A0A0"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <TouchableOpacity style={styles.button} onPress={handleReset} disabled={loading}>
              {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.buttonText}>Kirim Link Reset</Text>}
            </TouchableOpacity>

            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <Text style={styles.backButtonText}>Kembali ke Masuk</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: 'transparent' },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
    width: width, height: height, zIndex: -1,
    transform: [{translateY: 35}]
  },
  scrollContent: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 60, paddingBottom: 40 },
  header: { marginBottom: 30, alignItems: 'flex-start' },
  logo: { width: 140, height: 45 },
  titleSection: { marginBottom: 30 },
  title: { fontSize: 26, fontWeight: 'bold', color: '#1A1A1A', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#666666', lineHeight: 22 },
  formSection: { marginBottom: 20 },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 8 },
  input: { height: 52, backgroundColor: '#FAFAFA', borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 10, paddingHorizontal: 16, fontSize: 14, color: '#333' },
  button: { height: 52, backgroundColor: '#12464C', borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginTop: 20, shadowColor: '#12464C', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  buttonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  backButton: { marginTop: 20, alignItems: 'center' },
  backButtonText: { color: '#666', fontWeight: '600', fontSize: 14 },
});