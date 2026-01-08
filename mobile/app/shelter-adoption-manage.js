import React, { useState, useCallback } from 'react';
import { 
  View, Text, StyleSheet, FlatList, TouchableOpacity, 
  Image, ActivityIndicator, RefreshControl 
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import api from '../src/services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ShelterAdoptionManage() {
  const router = useRouter();
  const [adoptions, setAdoptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAdoptions = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const res = await api.get('/data/adoptions/incoming', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAdoptions(res.data);
    } catch (e) {
      console.log("Fetch Adoptions Error:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Mengambil data ulang setiap kali halaman mendapatkan fokus
  useFocusEffect(
    useCallback(() => {
      fetchAdoptions();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchAdoptions();
  };

  const resolveImageUrl = (rawPath) => {
    if (!rawPath) return 'https://via.placeholder.com/150';
    if (rawPath.startsWith('http')) return rawPath;
    const baseUrl = api.defaults.baseURL.replace(/\/api\/?$/, '');
    const cleanPath = rawPath.split(',')[0].trim().replace(/\\/g, '/');
    return `${baseUrl}${cleanPath.startsWith('/') ? '' : '/'}${cleanPath}`;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'PENDING': return '#FFF3E0';
      case 'ON_PROCESS': return '#E3F2FD';
      case 'APPROVED': return '#E8F5E9';
      case 'REJECTED': return '#FFEBEE';
      default: return '#F5F5F5';
    }
  };

  const getStatusTextColor = (status) => {
    switch (status) {
      case 'PENDING': return '#EF6C00';
      case 'ON_PROCESS': return '#1976D2';
      case 'APPROVED': return '#2E7D32';
      case 'REJECTED': return '#D32F2F';
      default: return '#666';
    }
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.simpleCard} 
      activeOpacity={0.7}
      onPress={() => router.push({
        pathname: '/shelter-adoption-detail',
        params: { adoptionData: JSON.stringify(item) }
      })}
    >
      {/* Thumbnail Anabul */}
      <Image 
        source={{ uri: resolveImageUrl(item.cat?.images) }} 
        style={styles.thumb} 
      />
      
      <View style={styles.cardBody}>
        <View style={styles.cardHeader}>
          <Text style={styles.catName} numberOfLines={1}>{item.cat?.name || 'Anabul'}</Text>
          <Text style={styles.dateText}>
            {new Date(item.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
          </Text>
        </View>
        
        <Text style={styles.userName} numberOfLines={1}>
          Pengaju: <Text style={{fontWeight: '700', color: '#333'}}>{item.user?.name}</Text>
        </Text>

        <View style={[styles.badge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={[styles.badgeText, { color: getStatusTextColor(item.status) }]}>
            {item.status}
          </Text>
        </View>
      </View>

      <Feather name="chevron-right" size={20} color="#CCC" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header Custom */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manajemen Adopsi</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#12464C" />
        </View>
      ) : (
        <FlatList
          data={adoptions}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} color="#12464C" />
          }
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Feather name="info" size={50} color="#DDD" />
              <Text style={styles.emptyText}>Belum ada pengajuan adopsi masuk.</Text>
            </View>
          }
        />
      )}
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: 20, paddingBottom: 40 },
  simpleCard: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#FFF', 
    padding: 15, 
    borderRadius: 20, 
    marginBottom: 15, 
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 }
  },
  thumb: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#F0F0F0' },
  cardBody: { flex: 1, marginLeft: 15 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  catName: { fontSize: 16, fontWeight: 'bold', color: '#12464C', flex: 1 },
  dateText: { fontSize: 10, color: '#999' },
  userName: { fontSize: 13, color: '#666', marginTop: 2 },
  badge: { 
    alignSelf: 'flex-start', 
    paddingHorizontal: 10, 
    paddingVertical: 4, 
    borderRadius: 8, 
    marginTop: 8 
  },
  badgeText: { fontSize: 10, fontWeight: '800' },
  emptyBox: { alignItems: 'center', marginTop: 100 },
  emptyText: { marginTop: 15, color: '#999', fontSize: 14, textAlign: 'center' }
});