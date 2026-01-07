import React, { useState } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, TextInput, 
  Image, ScrollView, ActivityIndicator, Alert, Dimensions, KeyboardAvoidingView, Platform
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import api from '../src/services/api';

const { width } = Dimensions.get('window');

// Mengikuti tema warna donation-detail (Oranye/Accent)
const COLORS = {
  primary: '#1A3C40',    // Teal gelap tetap untuk teks utama/kontras
  secondary: '#417D7A',
  accent: '#F4A261',     // Oranye Utama
  accentLight: '#FEF1E7',// Oranye Muda untuk background/badge
  background: '#FBFBFB',
  white: '#FFFFFF',
  textSub: '#777777',
  divider: '#F0F0F0',
};

export default function DonationPayment() {
  const { id, title } = useLocalSearchParams();
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [message, setMessage] = useState(''); // Fitur Pesan

  const nominalOptions = [50000, 100000, 200000, 500000];

  const handleProcessPayment = async () => {
    if (!amount || !method) {
        Alert.alert("Data Belum Lengkap", "Pilih nominal dan metode pembayaran dulu ya.");
        return;
    }
    setLoading(true);
    try {
      await api.post('/data/donate', {
        campaignId: id,
        amount: amount,
        paymentMethod: method,
        isAnonymous: isAnonymous,
        message: message // Sinkron ke DB
      });
      setStep(4); 
    } catch (error) {
      Alert.alert("Gagal", "Terjadi kesalahan saat sinkronisasi data.");
    } finally {
      setLoading(false);
    }
  };

  const StepIndicator = () => (
    <View style={styles.stepContainer}>
        {[1, 2, 3].map((s) => (
            <React.Fragment key={s}>
                <View style={[styles.stepCircle, step >= s && styles.stepCircleActive]}>
                    <Text style={[styles.stepText, step >= s && styles.stepTextActive]}>{s}</Text>
                </View>
                {s < 3 && <View style={[styles.stepLine, step > s && styles.stepLineActive]} />}
            </React.Fragment>
        ))}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={{ flex: 1 }}
      >
        <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                <Feather name="arrow-left" size={24} color={COLORS.primary} />
            </TouchableOpacity>
            <View style={{flex: 1, marginLeft: 15}}>
                <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
                <Text style={styles.headerSub}>Langkah {step} dari 3</Text>
            </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 25, paddingBottom: 100 }}>
            <StepIndicator />

            {step === 1 && (
                <View>
                    <Text style={styles.sectionTitle}>Mau bantu berapa?</Text>
                    <View style={styles.gridNominal}>
                        {nominalOptions.map((nom) => (
                            <TouchableOpacity 
                                key={nom} 
                                style={[styles.nomBtn, amount == nom && styles.nomActive]}
                                onPress={() => setAmount(nom.toString())}
                            >
                                <Text style={[styles.nomText, amount == nom && {color: COLORS.accent}]}>
                                    Rp {nom.toLocaleString('id-ID')}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                    
                    <View style={styles.inputWrapper}>
                        <Text style={styles.inputPrefix}>Rp</Text>
                        <TextInput
                            style={styles.inputNominal}
                            placeholder="0"
                            keyboardType="numeric"
                            value={amount}
                            onChangeText={setAmount}
                        />
                    </View>

                    {/* FITUR PESAN & ANONIM */}
                    <View style={styles.messageSection}>
                        <Text style={styles.label}>Tulis pesan atau doa (opsional)</Text>
                        <TextInput
                            style={styles.messageInput}
                            placeholder="Semoga lekas sembuh ya cing..."
                            multiline
                            numberOfLines={4}
                            value={message}
                            onChangeText={setMessage}
                        />
                        
                        <TouchableOpacity 
                            style={styles.anonimRow} 
                            onPress={() => setIsAnonymous(!isAnonymous)}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.checkbox, isAnonymous && styles.checkboxActive]}>
                                {isAnonymous && <Feather name="check" size={14} color="#fff" />}
                            </View>
                            <Text style={styles.anonimText}>Sembunyikan nama saya (Hamba Allah)</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {step === 2 && (
                <View>
                    <Text style={styles.sectionTitle}>Metode Pembayaran</Text>
                    {[
                        {name: 'GoPay', icon: 'wallet-outline'},
                        {name: 'OVO', icon: 'flash-outline'},
                        {name: 'Bank Transfer', icon: 'business-outline'}
                    ].map((m) => (
                        <TouchableOpacity 
                            key={m.name} 
                            style={[styles.methodBtn, method === m.name && styles.methodActive]}
                            onPress={() => setMethod(m.name)}
                        >
                            <View style={styles.methodIconWrapper}>
                                <Ionicons name={m.icon} size={24} color={method === m.name ? COLORS.accent : COLORS.primary} />
                                <Text style={[styles.methodText, method === m.name && styles.methodTextActive]}>{m.name}</Text>
                            </View>
                            <View style={[styles.radio, method === m.name && styles.radioActive]}>
                                {method === m.name && <View style={styles.radioInner} />}
                            </View>
                        </TouchableOpacity>
                    ))}
                </View>
            )}

            {step === 3 && (
                <View style={{ alignItems: 'center' }}>
                    <Text style={styles.sectionTitle}>Scan & Bayar</Text>
                    <View style={styles.qrCard}>
                        <Image 
                            source={{ uri: `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=DONATE_${id}_${amount}` }} 
                            style={styles.qrImg} 
                        />
                        <View style={styles.qrDivider} />
                        <Text style={styles.qrTotalLabel}>Total Pembayaran</Text>
                        <Text style={styles.qrTotalValue}>Rp {parseInt(amount).toLocaleString('id-ID')}</Text>
                    </View>
                    <View style={styles.infoBox}>
                        <Feather name="info" size={16} color={COLORS.secondary} />
                        <Text style={styles.infoText}>Simpan QR ini dan selesaikan pembayaran di aplikasi e-wallet pilihanmu.</Text>
                    </View>
                </View>
            )}

            {step === 4 && (
                <View style={styles.successWrapper}>
                    <View style={styles.successIconBg}>
                        <FontAwesome5 name="heart" size={50} color={COLORS.accent} />
                    </View>
                    <Text style={styles.successTitle}>Donasi Terkirim!</Text>
                    <Text style={styles.successSub}>
                        Kebaikanmu sangat berarti bagi mereka. Data donasi telah disinkronkan ke campaign dan profilmu.
                    </Text>
                    <TouchableOpacity style={styles.doneBtn} onPress={() => router.replace('/(tabs)/home')}>
                        <Text style={styles.doneBtnText}>Selesai</Text>
                    </TouchableOpacity>
                </View>
            )}
        </ScrollView>

        {step < 4 && (
            <View style={styles.footer}>
                <TouchableOpacity 
                    style={[styles.mainBtn, (!amount && step === 1) || (!method && step === 2) ? {opacity: 0.6} : {}]} 
                    onPress={() => step < 3 ? setStep(step + 1) : handleProcessPayment()}
                    disabled={loading}
                >
                    {loading ? <ActivityIndicator color="#fff" /> : (
                        <>
                            <Text style={styles.btnText}>{step === 3 ? "Saya Sudah Bayar" : "Lanjut"}</Text>
                            <Feather name="arrow-right" size={20} color="#fff" />
                        </>
                    )}
                </TouchableOpacity>
            </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15 },
  backBtn: { width: 45, height: 45, borderRadius: 15, backgroundColor: COLORS.white, justifyContent: 'center', alignItems: 'center', elevation: 2 },
  headerTitle: { fontSize: 18, fontWeight: '900', color: COLORS.primary },
  headerSub: { fontSize: 13, color: COLORS.textSub, fontWeight: '600' },
  
  // STEP INDICATOR UI
  stepContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 40 },
  stepCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#EEE', justifyContent: 'center', alignItems: 'center' },
  stepCircleActive: { backgroundColor: COLORS.accent },
  stepText: { fontSize: 14, fontWeight: 'bold', color: COLORS.textSub },
  stepTextActive: { color: COLORS.white },
  stepLine: { width: 40, height: 4, backgroundColor: '#EEE', marginHorizontal: 8, borderRadius: 2 },
  stepLineActive: { backgroundColor: COLORS.accent },

  sectionTitle: { fontSize: 24, fontWeight: '900', color: COLORS.primary, marginBottom: 25, textAlign: 'center' },
  
  // NOMINAL GRID
  gridNominal: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12, marginBottom: 20 },
  nomBtn: { width: (width - 62) / 2, paddingVertical: 18, backgroundColor: COLORS.white, borderRadius: 20, borderWidth: 1.5, borderColor: '#F0F0F0', alignItems: 'center' },
  nomActive: { borderColor: COLORS.accent, backgroundColor: COLORS.accentLight },
  nomText: { fontSize: 15, fontWeight: '800', color: COLORS.primary },
  
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, borderRadius: 20, paddingHorizontal: 20, height: 70, borderWidth: 1.5, borderColor: '#F0F0F0' },
  inputPrefix: { fontSize: 22, fontWeight: '900', color: COLORS.accent, marginRight: 10 },
  inputNominal: { flex: 1, fontSize: 24, fontWeight: '900', color: COLORS.primary },

  // MESSAGE SECTION
  messageSection: { marginTop: 30 },
  label: { fontSize: 15, fontWeight: '700', color: COLORS.primary, marginBottom: 12 },
  messageInput: { backgroundColor: COLORS.white, borderRadius: 20, padding: 20, fontSize: 15, color: COLORS.primary, textAlignVertical: 'top', borderWidth: 1.5, borderColor: '#F0F0F0', minHeight: 100 },
  anonimRow: { flexDirection: 'row', alignItems: 'center', marginTop: 15 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: COLORS.accent, marginRight: 10, justifyContent: 'center', alignItems: 'center' },
  checkboxActive: { backgroundColor: COLORS.accent },
  anonimText: { fontSize: 14, color: COLORS.textSub, fontWeight: '600' },

  // METHODS
  methodBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: COLORS.white, borderRadius: 22, marginBottom: 15, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10 },
  methodActive: { borderWidth: 1.5, borderColor: COLORS.accent, backgroundColor: COLORS.accentLight },
  methodIconWrapper: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  methodText: { fontSize: 16, fontWeight: '700', color: COLORS.primary },
  methodTextActive: { color: COLORS.accent },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#DDD', justifyContent: 'center', alignItems: 'center' },
  radioActive: { borderColor: COLORS.accent },
  radioInner: { width: 12, height: 12, borderRadius: 6, backgroundColor: COLORS.accent },

  // QR STEP
  qrCard: { backgroundColor: COLORS.white, padding: 30, borderRadius: 35, alignItems: 'center', elevation: 4, width: '100%' },
  qrImg: { width: 220, height: 220 },
  qrDivider: { width: '100%', height: 1, backgroundColor: COLORS.divider, marginVertical: 25 },
  qrTotalLabel: { fontSize: 14, color: COLORS.textSub, fontWeight: '600' },
  qrTotalValue: { fontSize: 28, fontWeight: '900', color: COLORS.primary, marginTop: 5 },
  infoBox: { flexDirection: 'row', gap: 12, backgroundColor: '#E0F2F1', padding: 15, borderRadius: 15, marginTop: 25 },
  infoText: { flex: 1, fontSize: 12, color: COLORS.secondary, lineHeight: 18, fontWeight: '600' },

  // SUCCESS STEP
  successWrapper: { alignItems: 'center', paddingHorizontal: 20 },
  successIconBg: { width: 120, height: 120, borderRadius: 60, backgroundColor: COLORS.accentLight, justifyContent: 'center', alignItems: 'center', marginBottom: 25 },
  successTitle: { fontSize: 28, fontWeight: '900', color: COLORS.primary },
  successSub: { textAlign: 'center', fontSize: 15, color: COLORS.textSub, marginTop: 15, lineHeight: 24, fontWeight: '500' },
  doneBtn: { marginTop: 40, width: '100%', height: 60, backgroundColor: COLORS.accent, borderRadius: 20, justifyContent: 'center', alignItems: 'center', elevation: 4 },
  doneBtnText: { color: COLORS.white, fontSize: 18, fontWeight: 'bold' },

  footer: { position: 'absolute', bottom: 0, width: '100%', padding: 25, backgroundColor: COLORS.white, borderTopWidth: 1, borderTopColor: COLORS.divider },
  mainBtn: { backgroundColor: COLORS.primary, height: 65, borderRadius: 22, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
  btnText: { color: COLORS.white, fontSize: 18, fontWeight: '900' }
});