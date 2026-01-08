import React, { useEffect, useState, useMemo } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, FlatList, 
  ActivityIndicator, Image, RefreshControl, TextInput, Alert 
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import api from '../src/services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams } from 'expo-router';

const formatRupiah = (num) => {
  if (!num) return 'Rp 0';
  return 'Rp ' + parseInt(num).toLocaleString('id-ID');
};

export default function HistoryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState(params.initialTab || 'laporan');
  const [activities, setActivities] = useState({ reports: [], adoptions: [], donations: [] });
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('SEMUA');

  const resolveImageUrl = (rawPath) => {
    if (!rawPath) return null;
    if (rawPath.startsWith('http')) return rawPath;
    const baseUrl = api.defaults.baseURL.replace(/\/api\/?$/, ''); 
    const cleanPath = rawPath.trim().replace(/\\/g, '/');
    return `${baseUrl}${cleanPath.startsWith('/') ? '' : '/'}${cleanPath}`;
  };

  const fetchActivities = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const res = await api.get('/auth/activities', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setActivities(res.data);
    } catch (error) {
      console.log('Error fetching history:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchActivities(); }, []);
  const onRefresh = () => { setRefreshing(true); fetchActivities(); };

  // FIX: Status Style sinkron dengan Enum database
  const getStatusStyle = (status) => {
    switch (status) {
      // Common
      case 'PENDING': return { bg: '#FFF3E0', text: '#EF6C00', label: 'Menunggu' };
      case 'REJECTED': return { bg: '#FFEBEE', text: '#D32F2F', label: 'Ditolak' };
      
      // Laporan Only
      case 'VERIFIED': return { bg: '#E1F5FE', text: '#0288D1', label: 'Terverifikasi' };
      case 'ON_PROCESS': return { bg: '#E3F2FD', text: '#1976D2', label: 'Diproses' };
      case 'RESCUED': return { bg: '#E8F5E9', text: '#2E7D32', label: 'Selesai' };
      
      // Adopsi Only
      case 'INTERVIEW': return { bg: '#F3E5F5', text: '#7B1FA2', label: 'Wawancara' };
      case 'APPROVED': return { bg: '#E8F5E9', text: '#2E7D32', label: 'Disetujui' };
      case 'COMPLETED': return { bg: '#E8F5E9', text: '#2E7D32', label: 'Berhasil' };
      case 'CANCELLED': return { bg: '#F5F5F5', text: '#616161', label: 'Dibatalkan' };
      
      // Donasi
      case 'SUCCESS': return { bg: '#E8F5E9', text: '#2E7D32', label: 'Berhasil' };
      default: return { bg: '#F5F5F5', text: '#666', label: status };
    }
  };

  // FIX: Daftar filter dinamis berdasarkan Tab
  const statusFilters = useMemo(() => {
    if (activeTab === 'laporan') return ['SEMUA', 'PENDING', 'VERIFIED', 'ON_PROCESS', 'RESCUED', 'REJECTED'];
    if (activeTab === 'adopsi') return ['SEMUA', 'PENDING', 'INTERVIEW', 'APPROVED', 'COMPLETED', 'REJECTED', 'CANCELLED'];
    return ['SEMUA'];
  }, [activeTab]);

  const filteredData = useMemo(() => {
    let data = [];
    if (activeTab === 'laporan') data = activities.reports || [];
    else if (activeTab === 'adopsi') data = activities.adoptions || [];
    else data = activities.donations || [];

    if (selectedStatus !== 'SEMUA') {
      data = data.filter(item => item.status === selectedStatus);
    }

    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      data = data.filter(item => {
        const val = activeTab === 'laporan' ? item.conditionTags : 
                    activeTab === 'adopsi' ? item.cat?.name : 
                    item.campaign?.title;
        return val?.toLowerCase().includes(query);
      });
    }
    return data;
  }, [activities, activeTab, searchQuery, selectedStatus]);

  const handleContact = async (item, type) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      let payload = {};
      let recipientName = "";

      if (type === 'laporan') {
        payload = { reportId: item.id }; 
        recipientName = item.rescuer?.nickname || "Petugas Rescue";
      } else {
        if (!item.cat?.shelterId) {
          Alert.alert("Error", "Data shelter tidak ditemukan.");
          return;
        }
        payload = { userTwoId: item.cat.shelterId };
        recipientName = item.cat.shelter?.name || "Shelter";
      }

      const res = await api.post('/chat/room/init', payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      router.push({
        pathname: '/chat-room',
        params: { roomId: res.data.id, name: recipientName, avatar: type === 'adopsi' ? item.cat?.shelter?.photoProfile : null }
      });

    } catch (error) {
      Alert.alert("Error", "Gagal memulai chat.");
    }
  };

  const renderItem = ({ item }) => {
    const status = getStatusStyle(item.status);
    const date = new Date(item.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });

    let displayImg = null;
    if (activeTab === 'laporan') displayImg = resolveImageUrl(item.imageUrl?.split(',')[0]);
    else if (activeTab === 'adopsi') displayImg = resolveImageUrl(item.cat?.images?.split(',')[0]);
    else if (activeTab === 'donasi') displayImg = resolveImageUrl(item.campaign?.imageUrl);

    const isLaporanPending = activeTab === 'laporan' && item.status === 'PENDING';

    return (
      <TouchableOpacity 
        style={styles.historyCard} 
        onPress={() => router.push({ pathname: '/history-detail', params: { data: JSON.stringify(item), type: activeTab } })}
        activeOpacity={0.7}
      >
        <View style={styles.cardMain}>
          <Image source={displayImg ? { uri: displayImg } : { uri: 'https://via.placeholder.com/150' }} style={styles.cardImage} />
          <View style={styles.cardContent}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardDate}>{date}</Text>
              <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
                <Text style={[styles.statusText, { color: status.text }]}>{status.label}</Text>
              </View>
            </View>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {activeTab === 'laporan' ? item.conditionTags : 
               activeTab === 'adopsi' ? `Adopsi ${item.cat?.name || 'Kucing'}` : 
               `Donasi ${formatRupiah(item.amount)}`}
            </Text>
            <Text style={styles.cardSubtitle} numberOfLines={1}>
              {activeTab === 'laporan' ? item.address : 
               activeTab === 'adopsi' ? `📍 ${item.cat?.shelter?.nickname || 'Shelter'}` : 
               `Untuk: ${item.campaign?.title}`}
            </Text>
          </View>
        </View>

        {activeTab !== 'donasi' && (
          <TouchableOpacity 
            style={[styles.actionButton, isLaporanPending && { backgroundColor: '#F5F5F5' }]}
            onPress={() => isLaporanPending ? Alert.alert("Sabar ya", "Laporanmu belum ada yang ambil.") : handleContact(item, activeTab)}
          >
            <Feather name={isLaporanPending ? "clock" : "message-circle"} size={14} color={isLaporanPending ? "#999" : "#12464C"} />
            <Text style={[styles.actionButtonText, isLaporanPending && { color: '#999' }]}>
              {activeTab === 'adopsi' ? 'Hubungi Shelter' : isLaporanPending ? 'Menunggu Respon' : 'Hubungi Petugas'}
            </Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topHeader}>
        <View style={styles.headerTitleRow}>
          <TouchableOpacity onPress={() => router.back()}><Feather name="arrow-left" size={24} color="#333" /></TouchableOpacity>
          <Text style={styles.headerTitle}>Riwayat Aktivitas</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.searchBox}>
          <Feather name="search" size={18} color="#999" />
          <TextInput style={styles.searchInput} placeholder={`Cari ${activeTab}...`} value={searchQuery} onChangeText={setSearchQuery} />
        </View>
      </View>

      <View style={styles.tabBar}>
        {['laporan', 'adopsi', 'donasi'].map((tab) => (
          <TouchableOpacity key={tab} style={[styles.tabItem, activeTab === tab && styles.activeTabItem]} onPress={() => { setActiveTab(tab); setSelectedStatus('SEMUA'); }}>
            <Text style={[styles.tabLabel, activeTab === tab && styles.activeTabLabel]}>{tab.toUpperCase()}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.filterContainer}>
        {activeTab === 'donasi' ? (
          <TouchableOpacity style={styles.donateCtaBtn} onPress={() => router.push('/donation-gallery')}>
            <MaterialCommunityIcons name="hand-heart" size={18} color="#FFF" /><Text style={styles.donateCtaText}>Donasi Lagi</Text>
          </TouchableOpacity>
        ) : (
          <FlatList 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            data={statusFilters} 
            keyExtractor={(i) => i} 
            renderItem={({item}) => (
              <TouchableOpacity style={[styles.filterChip, selectedStatus === item && styles.activeChip]} onPress={() => setSelectedStatus(item)}>
                <Text style={[styles.filterChipText, selectedStatus === item && styles.activeChipText]}>
                  {item === 'SEMUA' ? 'Semua' : getStatusStyle(item).label}
                </Text>
              </TouchableOpacity>
            )} 
            contentContainerStyle={{ paddingHorizontal: 20 }} 
          />
        )}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#12464C" style={{ marginTop: 50 }} />
      ) : (
        <FlatList 
          data={filteredData} 
          keyExtractor={(item) => item.id.toString()} 
          renderItem={renderItem} 
          contentContainerStyle={styles.listContainer} 
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />} 
          ListEmptyComponent={<View style={styles.emptyContainer}><MaterialCommunityIcons name="clipboard-text-outline" size={60} color="#DDD" /><Text style={styles.emptyText}>Kosong nih...</Text></View>} 
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  topHeader: { backgroundColor: '#FFF', paddingBottom: 15 },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1A1A1A' },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F5F5', marginHorizontal: 20, paddingHorizontal: 15, borderRadius: 12, height: 45 },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 14, color: '#333' },
  tabBar: { flexDirection: 'row', backgroundColor: '#FFF', paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  tabItem: { flex: 1, paddingVertical: 15, alignItems: 'center' },
  activeTabItem: { borderBottomWidth: 2, borderBottomColor: '#12464C' },
  tabLabel: { fontSize: 13, color: '#999', fontWeight: '700' },
  activeTabLabel: { color: '#12464C' },
  filterContainer: { paddingVertical: 12, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  donateCtaBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#12464C', marginHorizontal: 20, paddingVertical: 12, borderRadius: 12, gap: 8 },
  donateCtaText: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F5F5F5', marginRight: 8, borderWidth: 1, borderColor: '#EEE' },
  activeChip: { backgroundColor: '#12464C', borderColor: '#12464C' },
  filterChipText: { fontSize: 12, color: '#666', fontWeight: '700' },
  activeChipText: { color: '#FFF' },
  listContainer: { padding: 20 },
  historyCard: { backgroundColor: '#FFF', borderRadius: 16, marginBottom: 16, overflow: 'hidden', elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5 },
  cardMain: { flexDirection: 'row', minHeight: 100 },
  cardImage: { width: 100, height: 100, resizeMode: 'cover' },
  cardContent: { flex: 1, padding: 12, justifyContent: 'center' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  cardDate: { fontSize: 11, color: '#999' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusText: { fontSize: 9, fontWeight: '900' },
  cardTitle: { fontSize: 14, fontWeight: 'bold', color: '#333', marginBottom: 4 },
  cardSubtitle: { fontSize: 12, color: '#888' },
  actionButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F0F7F7', paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#E0F0F0', gap: 6 },
  actionButtonText: { fontSize: 12, color: '#12464C', fontWeight: 'bold' },
  emptyContainer: { alignItems: 'center', marginTop: 100 },
  emptyText: { marginTop: 10, color: '#999', fontSize: 15 }
});