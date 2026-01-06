import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Linking } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import api from '../src/services/api';

export default function HistoryDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  // Data dikirim sebagai string JSON lewat params
  const item = JSON.parse(params.data); 
  const type = params.type;

  const getStatusStyle = (status) => {
    switch (status) {
      case 'PENDING': return { bg: '#FFF3E0', text: '#EF6C00', label: 'Menunggu' };
      case 'ON_PROCESS': return { bg: '#E3F2FD', text: '#1976D2', label: 'Diproses' };
      case 'RESCUED': return { bg: '#E8F5E9', text: '#2E7D32', label: 'Selesai' };
      case 'SUCCESS': return { bg: '#E8F5E9', text: '#2E7D32', label: 'Berhasil' };
      default: return { bg: '#F5F5F5', text: '#666', label: status };
    }
  };

  const status = getStatusStyle(item.status);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="arrow-left" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Detail {type.charAt(0).toUpperCase() + type.slice(1)}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Gambar Utama (Jika ada) */}
        {(item.imageUrl || item.cat?.imageUrl) && (
          <Image 
            source={{ uri: type === 'laporan' ? `${api.defaults.baseURL.replace('/api', '')}${item.imageUrl}` : (item.cat?.imageUrl || item.campaign?.imageUrl) }} 
            style={styles.mainImage} 
          />
        )}

        <View style={styles.content}>
          <View style={styles.statusRow}>
            <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
              <Text style={[styles.statusText, { color: status.text }]}>{status.label}</Text>
            </View>
            <Text style={styles.dateText}>{new Date(item.createdAt).toLocaleString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</Text>
          </View>

          {/* Konten Berdasarkan Tipe */}
          {type === 'laporan' && (
            <View>
              <Text style={styles.title}>{item.conditionTags}</Text>
              <View style={styles.infoBox}>
                <Feather name="map-pin" size={16} color="#12464C" />
                <Text style={styles.infoText}>{item.address}</Text>
              </View>
              <Text style={styles.sectionTitle}>Deskripsi Kondisi</Text>
              <Text style={styles.description}>{item.description || 'Tidak ada deskripsi tambahan.'}</Text>
            </View>
          )}

          {type === 'adopsi' && (
            <View>
              <Text style={styles.title}>Adopsi {item.cat?.name}</Text>
              <Text style={styles.description}>Anda telah mengajukan adopsi untuk {item.cat?.name}. Shelter akan meninjau alasan dan kelayakan tempat tinggal Anda.</Text>
              <Text style={styles.sectionTitle}>Alasan Adopsi</Text>
              <View style={styles.reasonCard}>
                <Text style={styles.reasonText}>"{item.reason}"</Text>
              </View>
            </View>
          )}

          {type === 'donasi' && (
            <View>
              <Text style={styles.title}>Donasi Berhasil</Text>
              <View style={styles.donationAmountBox}>
                <Text style={styles.amountLabel}>Jumlah Donasi</Text>
                <Text style={styles.amountValue}>Rp {parseInt(item.amount).toLocaleString('id-ID')}</Text>
              </View>
              <Text style={styles.sectionTitle}>Campaign</Text>
              <Text style={styles.description}>{item.campaign?.title}</Text>
              {item.message && (
                <>
                  <Text style={styles.sectionTitle}>Pesan Anda</Text>
                  <Text style={styles.description}>"{item.message}"</Text>
                </>
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  mainImage: { width: '100%', height: 250, resizeMode: 'cover' },
  content: { padding: 20 },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  statusText: { fontSize: 12, fontWeight: 'bold' },
  dateText: { fontSize: 12, color: '#999' },
  title: { fontSize: 22, fontWeight: 'bold', color: '#12464C', marginBottom: 10 },
  infoBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0F7F7', padding: 12, borderRadius: 10, marginBottom: 20 },
  infoText: { marginLeft: 8, color: '#12464C', fontSize: 14, flex: 1 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginTop: 20, marginBottom: 8 },
  description: { fontSize: 15, color: '#666', lineHeight: 24 },
  reasonCard: { backgroundColor: '#F9F9F9', padding: 15, borderRadius: 12, borderLeftWidth: 4, borderLeftColor: '#12464C' },
  reasonText: { fontStyle: 'italic', color: '#444' },
  donationAmountBox: { backgroundColor: '#12464C', padding: 20, borderRadius: 15, alignItems: 'center', marginVertical: 10 },
  amountLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginBottom: 4 },
  amountValue: { color: '#FFF', fontSize: 24, fontWeight: 'bold' }
});