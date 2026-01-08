import React, { useState, useCallback } from 'react'; 
import { 
  View, Text, StyleSheet, TouchableOpacity, FlatList, 
  Image, ActivityIndicator, RefreshControl, Dimensions, Alert 
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import api from '../src/services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

export default function ShelterGallery() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cats, setCats] = useState([]);

  const resolveImageUrl = (rawPath) => {
    if (!rawPath) return null;
    if (rawPath.startsWith('http')) return rawPath;
    const baseUrl = api.defaults.baseURL.replace(/\/api\/?$/, '');
    const cleanPath = rawPath.split(',')[0].trim().replace(/\\/g, '/');
    return `${baseUrl}${cleanPath.startsWith('/') ? '' : '/'}${cleanPath}`;
  };

  const fetchShelterCats = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      // Kita gunakan endpoint khusus shelter/cats yang sudah ada logic labelnya di backend
      const res = await api.get('/data/shelter/cats', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCats(res.data);
    } catch (error) {
      console.error("Fetch Shelter Cats Error:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchShelterCats();
    }, [fetchShelterCats])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchShelterCats();
  };

const renderCatItem = ({ item }) => {
  // Logic label warna & teks default (Tersedia)
  let statusLabel = "Tersedia";
  let statusColor = "#2E7D32";
  let statusBg = "#E8F5E9";

  if (item.label === "WAITING_ADMIN") {
    statusLabel = "Menunggu Admin";
    statusColor = "#757575"; // Abu-abu profesional untuk indikasi pending
    statusBg = "#F5F5F5";
  } else if (item.label === "ADOPTED") {
    statusLabel = "Adopted";
    statusColor = "#12464C";
    statusBg = "#E0EDED";
  } else if (item.label === "PROCESS") {
    statusLabel = "Proses";
    statusColor = "#EF6C00";
    statusBg = "#FFF3E0";
  }

  return (
    <TouchableOpacity 
      style={styles.catCard}
      onPress={() => router.push({ pathname: '/shelter-cat-detail', params: { id: item.id, isOwner: true } })}
    >
      <Image 
        source={{ uri: resolveImageUrl(item.images) || 'https://via.placeholder.com/150' }} 
        style={styles.catImage} 
      />
      <View style={styles.catInfo}>
        <View style={styles.nameRow}>
          <Text style={styles.catName} numberOfLines={1}>{item.name}</Text>
          <View style={[styles.genderBadge, { backgroundColor: item.gender === 'MALE' ? '#E3F2FD' : '#FCE4EC' }]}>
            <MaterialCommunityIcons 
              name={item.gender === 'MALE' ? 'gender-male' : 'gender-female'} 
              size={12} 
              color={item.gender === 'MALE' ? '#1976D2' : '#C2185B'} 
            />
          </View>
        </View>
        
        <Text style={styles.catBreed} numberOfLines={1}>{item.breed || 'Domestik'}</Text>

        <View style={styles.divider} />

        <View style={styles.applicantInfo}>
          <Feather name="users" size={12} color="#999" />
          <Text style={styles.applicantText}>
            {item.label === "WAITING_ADMIN" 
              ? "Belum Tayang" 
              : item.applicantCount > 0 
                ? `${item.applicantCount} Pengaju` 
                : 'Belum ada pengaju'}
          </Text>
        </View>

        <View style={[styles.statusTag, { backgroundColor: statusBg }]}>
          <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Kelola Anabul</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color="#12464C" />
        </View>
      ) : (
        <FlatList
          data={cats}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderCatItem}
          numColumns={2}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <FontAwesome5 name="cat" size={50} color="#DDD" />
              <Text style={styles.emptyText}>Belum ada anabul terdaftar</Text>
            </View>
          }
        />
      )}

      <TouchableOpacity 
        style={styles.fab}
        activeOpacity={0.8}
        onPress={() => router.push('/shelter-add-cat')}
        >
        <Feather name="plus" size={24} color="#FFF" />
        <Text style={styles.fabText}>Tambah Anabul</Text>
        </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 15, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#EEE' },
  backBtn: { width: 40 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1A1A1A' },
  centerLoading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: 10, paddingBottom: 120 },
  catCard: { flex: 1, margin: 8, backgroundColor: '#FFF', borderRadius: 16, overflow: 'hidden', elevation: 3, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5 },
  catImage: { width: '100%', height: 130 },
  catInfo: { padding: 12 },
  nameRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  catName: { fontSize: 14, fontWeight: 'bold', color: '#333', flex: 1, marginRight: 4 },
  genderBadge: { padding: 4, borderRadius: 6 },
  catBreed: { fontSize: 11, color: '#888', marginTop: 2 },
  divider: { height: 1, backgroundColor: '#F0F0F0', marginVertical: 8 },
  applicantInfo: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 },
  applicantText: { fontSize: 10, color: '#999', fontWeight: '500' },
  statusTag: { paddingVertical: 6, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  statusText: { fontSize: 10, fontWeight: 'bold' },
  emptyContainer: { alignItems: 'center', marginTop: 100 },
  emptyText: { marginTop: 15, color: '#999', fontSize: 14 },
  fab: { position: 'absolute', bottom: 30, right: 20, left: 20, backgroundColor: '#12464C', height: 56, borderRadius: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', elevation: 8, gap: 8 },
  fabText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 }
});