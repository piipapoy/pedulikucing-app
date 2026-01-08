import React, { useState, useCallback } from 'react';
import { 
  View, Text, StyleSheet, FlatList, TouchableOpacity, 
  Image, ActivityIndicator, RefreshControl, Alert // 🔥 Tambahkan Alert di sini
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import api from '../src/services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ShelterDonationManage() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchCampaigns = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const res = await api.get('/data/shelter/campaigns', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCampaigns(res.data);
    } catch (e) {
      console.log("Error fetch campaigns:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchCampaigns(); }, []));

const resolveImageUrl = (path) => {
  if (!path) return 'https://via.placeholder.com/400x225?text=No+Image'; // Placeholder 16:9
  if (path.startsWith('http') || path.startsWith('file')) return path;
  
  const baseUrl = api.defaults.baseURL.replace(/\/api\/?$/, '');
  const cleanPath = path.trim().replace(/\\/g, '/');
  return `${baseUrl}${cleanPath.startsWith('/') ? '' : '/'}${cleanPath}`;
};

  const renderItem = ({ item }) => {
    const isWaiting = item.label === "WAITING_ADMIN";
    const isClosed = item.label === "CLOSED";

    const handlePress = () => {
      if (isWaiting) {
        // 🔥 Kasih Alert proteksi di sini
        Alert.alert(
          "Pendaftaran Sedang Ditinjau",
          "Campaign ini sedang dalam proses verifikasi oleh Admin. Kamu baru bisa mengelola atau memberikan update setelah statusnya disetujui.",
          [{ text: "Mengerti", style: "default" }]
        );
      } else {
        // ✅ Kalau sudah diapprove baru boleh masuk
        router.push({
          pathname: '/shelter-donation-detail-edit',
          params: { id: item.id }
        });
      }
    };

    return (
      <TouchableOpacity 
        style={[styles.card, isWaiting && { opacity: 0.85 }]} // Kasih sedikit efek transparan kalau nunggu
        onPress={handlePress}
      >
        <Image source={{ uri: resolveImageUrl(item.imageUrl) }} style={styles.thumb} />
        <View style={styles.cardBody}>
          <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.amount}>Target: Rp {item.targetAmount.toLocaleString('id-ID')}</Text>
          
          <View style={[styles.badge, { backgroundColor: isWaiting ? '#F5F5F5' : isClosed ? '#FFEBEE' : '#E8F5E9' }]}>
            <Text style={[styles.badgeText, { color: isWaiting ? '#757575' : isClosed ? '#D32F2F' : '#2E7D32' }]}>
              {isWaiting ? 'Menunggu Admin' : isClosed ? 'Selesai' : 'Berjalan'}
            </Text>
          </View>
        </View>
        
        {/* Kalau nunggu admin, ganti icon chevron jadi lock (opsional biar makin mantap UX-nya) */}
        <Feather name={isWaiting ? "lock" : "chevron-right"} size={18} color="#CCC" />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Kelola Donasi</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#12464C" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={campaigns}
          renderItem={renderItem}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchCampaigns(); }} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Feather name="heart" size={50} color="#DDD" />
              <Text style={styles.emptyText}>Belum ada campaign donasi.</Text>
            </View>
          }
        />
      )}

      <TouchableOpacity style={styles.fab} onPress={() => router.push('/shelter-add-donation')}>
        <Feather name="plus" size={24} color="#FFF" />
        <Text style={styles.fabText}>Buat Campaign</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FBFBFB' },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 20, 
    paddingVertical: 15, 
    backgroundColor: '#FFF', 
    borderBottomWidth: 1, 
    borderBottomColor: '#EEE' 
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1A1A1A' },
  backBtn: { width: 40 },
  card: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#FFF', 
    padding: 15, 
    borderRadius: 20, 
    marginBottom: 15, 
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5
  },
  thumb: { width: 70, height: 70, borderRadius: 14, backgroundColor: '#EEE' },
  cardBody: { flex: 1, marginLeft: 15 },
  title: { fontSize: 15, fontWeight: 'bold', color: '#333' },
  amount: { fontSize: 12, color: '#888', marginTop: 4 },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginTop: 10 },
  badgeText: { fontSize: 10, fontWeight: 'bold' },
  fab: { 
    position: 'absolute', 
    bottom: 30, 
    left: 20, 
    right: 20, 
    backgroundColor: '#12464C', 
    height: 56, 
    borderRadius: 28, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    elevation: 8, 
    gap: 8,
    shadowColor: '#12464C',
    shadowOpacity: 0.3,
    shadowRadius: 10
  },
  fabText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  emptyContainer: { alignItems: 'center', marginTop: 100 },
  emptyText: { marginTop: 15, color: '#999', fontSize: 14 }
});