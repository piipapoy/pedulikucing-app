import React, { useState } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, 
  Dimensions, ActivityIndicator, Alert, StatusBar 
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import api from '../src/services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ShelterAdoptionDetail() {
  const { adoptionData } = useLocalSearchParams();
  const item = JSON.parse(adoptionData);
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(item.status);

  // FIX: Mapping Enum sesuai database kamu
  const STATUS_LIST = [
    { key: 'PENDING', label: 'Menunggu', color: '#FF9800' },
    { key: 'INTERVIEW', label: 'Wawancara', color: '#2196F3' },
    { key: 'APPROVED', label: 'Disetujui', color: '#4CAF50' },
    { key: 'COMPLETED', label: 'Selesai', color: '#12464C' },
    { key: 'REJECTED', label: 'Ditolak', color: '#F44336' },
    { key: 'CANCELLED', label: 'Batal', color: '#9E9E9E' },
  ];

  const resolveImageUrl = (rawPath) => {
    if (!rawPath) return 'https://via.placeholder.com/400x300?text=Tidak+Ada+Foto';
    if (rawPath.startsWith('http')) return rawPath;
    const baseUrl = api.defaults.baseURL.replace(/\/api\/?$/, '');
    return `${baseUrl}${rawPath.replace(/\\/g, '/')}`;
  };

  const handleUpdateStatus = async (newStatus) => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      await api.patch(`/data/adoptions/${item.id}/status`, { status: newStatus }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCurrentStatus(newStatus);
      Alert.alert("Sukses", `Status berhasil diubah menjadi ${newStatus}`);
    } catch (e) {
      Alert.alert("Error", "Gagal memperbarui status. Pastikan koneksi stabil.");
    } finally {
      setLoading(false);
    }
  };

  const handleChat = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const res = await api.post('/chat/room/init', { userTwoId: item.userId }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      router.push({
        pathname: '/chat-room',
        params: { roomId: res.data.id, name: item.fullName || item.user?.name, avatar: item.user?.photoProfile }
      });
    } catch (e) { Alert.alert("Error", "Gagal memulai chat."); }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconCircle} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Review Pengajuan</Text>
        <TouchableOpacity style={[styles.iconCircle, { backgroundColor: '#12464C' }]} onPress={handleChat}>
          <Ionicons name="chatbubble-ellipses" size={20} color="#FFF" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 180 }}>
        {/* HERO INFO */}
        <View style={styles.heroSection}>
          <Image source={{ uri: resolveImageUrl(item.cat?.images?.split(',')[0]) }} style={styles.heroCatImg} />
          <View style={styles.heroText}>
             <Text style={styles.catName}>{item.cat?.name}</Text>
             <Text style={styles.adopterName}>Pengaju: {item.fullName}</Text>
          </View>
        </View>

        {/* STATUS STEPPER (Visual Tracker) */}
        <View style={styles.stepperCard}>
            <Text style={styles.cardHeading}>Status Saat Ini</Text>
            <View style={styles.statusRow}>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(currentStatus) + '20' }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(currentStatus) }]}>{currentStatus}</Text>
                </View>
                <Text style={styles.dateInfo}>{new Date(item.createdAt).toLocaleDateString('id-ID')}</Text>
            </View>
        </View>

        {/* IDENTITAS CARDS */}
        <View style={styles.mainCard}>
          <Text style={styles.cardHeading}>Identitas Adopter</Text>
          <InfoLine label="WhatsApp" value={item.phone} icon="logo-whatsapp" />
          <InfoLine label="No. KTP" value={item.ktpNumber} icon="card-outline" />
          <Text style={styles.subHeading}>Foto KTP</Text>
          <Image source={{ uri: resolveImageUrl(item.idCardImage) }} style={styles.documentImg} />
        </View>

        {/* LINGKUNGAN CARDS */}
{/* SECTION 3: LINGKUNGAN TEMPAT TINGGAL */}
<View style={styles.mainCard}>
  <Text style={styles.cardHeading}>Lingkungan Tempat Tinggal</Text>
  <View style={styles.tagContainer}>
     <View style={styles.tag}><Text style={styles.tagText}>🏠 {item.homeStatus}</Text></View>
     <View style={styles.tag}><Text style={styles.tagText}>📜 Izin: {item.isPermitted ? 'Ada' : 'Tidak'}</Text></View>
     <View style={styles.tag}><Text style={styles.tagText}>👨‍👩‍👧‍👦 Bersama: {item.stayingWith}</Text></View>
  </View>

  {/* DETAIL ANAK-ANAK (JIKA ADA) */}
  {item.stayingWith?.includes('Anak-anak') && item.childAges && (
    <View style={styles.childSection}>
      <Text style={styles.subHeading}>Daftar Usia Anak</Text>
      <View style={styles.childGrid}>
        {item.childAges.split(',').map((age, idx) => (
          <View key={idx} style={styles.childChip}>
            <View style={styles.childIconBox}>
              <MaterialCommunityIcons name="face-man-shimmer" size={16} color="#12464C" />
            </View>
            <Text style={styles.childAgeText}>{age.trim()} Tahun</Text>
          </View>
        ))}
      </View>
    </View>
  )}

  <Text style={styles.subHeading}>Foto Area Rumah</Text>
  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
    {item.houseImages?.split(',').filter(p => p.trim() !== "").map((img, index) => (
      <Image key={index} source={{ uri: resolveImageUrl(img) }} style={styles.houseThumbnail} />
    ))}
  </ScrollView>
</View>

        {/* KOMITMEN CARDS */}
        <View style={styles.mainCard}>
          <Text style={styles.cardHeading}>Analisis Komitmen</Text>
          <Text style={styles.contentLabel}>Motivasi</Text>
          <Text style={styles.bodyPara}>{item.reason}</Text>
          <View style={styles.contentDivider} />
          <Text style={styles.contentLabel}>Rencana Jika Pindah</Text>
          <Text style={styles.bodyPara}>{item.movingPlan}</Text>
        </View>
      </ScrollView>

      {/* FLOATING ACTION PANEL: STATUS SELECTOR */}
      <View style={styles.floatingPanel}>
        <Text style={styles.panelTitle}>Perbarui Status Pengajuan</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statusOptions}>
          {STATUS_LIST.map((status) => (
            <TouchableOpacity 
              key={status.key} 
              style={[
                styles.statusBtn, 
                currentStatus === status.key && { backgroundColor: status.color, borderColor: status.color }
              ]}
              onPress={() => handleUpdateStatus(status.key)}
            >
              <Text style={[styles.statusBtnText, currentStatus === status.key && { color: '#FFF' }]}>
                {status.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading && <View style={styles.loadingOverlay}><ActivityIndicator size="large" color="#12464C" /></View>}
    </SafeAreaView>
  );
}

// Sub-components
const InfoLine = ({ label, value, icon }) => (
  <View style={styles.infoLine}>
    <Ionicons name={icon} size={18} color="#999" />
    <View style={{marginLeft: 12}}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value || '-'}</Text>
    </View>
  </View>
);

const Tag = ({ text }) => (
    <View style={styles.tag}><Text style={styles.tagText}>{text}</Text></View>
);

const getStatusColor = (s) => {
    if (s === 'APPROVED' || s === 'COMPLETED') return '#4CAF50';
    if (s === 'REJECTED' || s === 'CANCELLED') return '#F44336';
    if (s === 'INTERVIEW') return '#2196F3';
    return '#FF9800';
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 15, backgroundColor: '#FFF' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#333' },
  iconCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F5F5F5', justifyContent: 'center', alignItems: 'center' },
  heroSection: { flexDirection: 'row', padding: 20, alignItems: 'center', gap: 15 },
  heroCatImg: { width: 60, height: 60, borderRadius: 30 },
  catName: { fontSize: 20, fontWeight: '800', color: '#12464C' },
  adopterName: { fontSize: 13, color: '#666' },
  stepperCard: { backgroundColor: '#FFF', marginHorizontal: 20, padding: 15, borderRadius: 16, marginBottom: 15, elevation: 1 },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  statusText: { fontSize: 12, fontWeight: 'bold' },
  dateInfo: { fontSize: 11, color: '#BBB' },
  mainCard: { backgroundColor: '#FFF', marginHorizontal: 20, padding: 20, borderRadius: 24, marginBottom: 15, elevation: 1 },
  cardHeading: { fontSize: 14, fontWeight: 'bold', color: '#12464C', marginBottom: 15 },
  subHeading: { fontSize: 11, fontWeight: 'bold', color: '#BBB', marginTop: 15, marginBottom: 10, textTransform: 'uppercase' },
  infoLine: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  infoLabel: { fontSize: 11, color: '#999' },
  infoValue: { fontSize: 14, fontWeight: '600', color: '#333' },
  documentImg: { width: '100%', height: 180, borderRadius: 16, backgroundColor: '#F0F0F0' },
  tagContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { backgroundColor: '#F0F7F7', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  tagText: { fontSize: 11, color: '#12464C', fontWeight: 'bold' },
  houseThumbnail: { width: 120, height: 90, borderRadius: 12, marginRight: 10 },
  contentLabel: { fontSize: 12, fontWeight: 'bold', color: '#12464C', marginBottom: 4 },
  bodyPara: { fontSize: 14, color: '#555', lineHeight: 20 },
  contentDivider: { height: 1, backgroundColor: '#F0F0F0', marginVertical: 12 },
  
  // FLOATING PANEL STYLES
  floatingPanel: { 
    position: 'absolute', bottom: 0, width: '100%', 
    backgroundColor: '#FFF', padding: 20, 
    borderTopLeftRadius: 30, borderTopRightRadius: 30,
    elevation: 20, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10
  },
  panelTitle: { fontSize: 13, fontWeight: 'bold', color: '#666', marginBottom: 15, textAlign: 'center' },
  statusOptions: { gap: 10, paddingRight: 20 },
  statusBtn: { paddingHorizontal: 18, paddingVertical: 12, borderRadius: 14, borderWidth: 1.5, borderColor: '#EEE', backgroundColor: '#F9F9F9' },
  statusBtnText: { fontSize: 13, fontWeight: 'bold', color: '#888' },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.7)', justifyContent: 'center', alignItems: 'center', zIndex: 99 },
  childSection: {
    marginTop: 15,
    padding: 12,
    backgroundColor: '#F9F9F9',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EEE',
  },
  childGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  childChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D1E5E5',
    elevation: 1,
  },
  childIconBox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F0F7F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  childAgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#12464C',
  }
});