import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, FlatList, 
  Image, ActivityIndicator, Alert, Linking, Platform 
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import api from '../src/services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ShelterReports() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('incoming');
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState([]);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const endpoint = activeTab === 'incoming' ? '/data/reports/incoming' : '/data/reports/handled';
      const res = await api.get(endpoint, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setReports(res.data);
    } catch (e) {
      console.log("Fetch Reports Error:", e);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useFocusEffect(useCallback(() => { fetchReports(); }, [fetchReports]));

  const handleContactReporter = async (item) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      // Pelapor adalah item.userId (berdasarkan skema Report kamu)
      const res = await api.post('/chat/room/init', 
        { userTwoId: item.userId }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );

      router.push({
        pathname: '/chat-room',
        params: { 
          roomId: res.data.id, 
          name: item.user?.name || "Pelapor", 
          avatar: item.user?.photoProfile 
        }
      });
    } catch (error) {
      console.log("Error Chat Pelapor:", error.response?.data);
      Alert.alert("Error", "Gagal memulai chat dengan pelapor.");
    }
  };

  const handleUpdateStatus = async (reportId, newStatus) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      await api.patch(`/data/reports/${reportId}/status`, { status: newStatus }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      Alert.alert("Sukses", `Status laporan diperbarui.`);
      fetchReports();
    } catch (e) {
      Alert.alert("Error", "Gagal memperbarui status");
    }
  };

  const openInMaps = (lat, lon, address) => {
    if (!lat || !lon) {
      Alert.alert("Lokasi Tidak Tersedia", "Koordinat GPS tidak ditemukan.");
      return;
    }
    const label = encodeURIComponent(address || "Lokasi Laporan");
    const url = Platform.select({
      ios: `maps:0,0?q=${label}@${lat},${lon}`,
      android: `geo:${lat},${lon}?q=${lat},${lon}(${label})`
    });
    Linking.openURL(url);
  };

  const resolveImageUrl = (rawPath) => {
    if (!rawPath) return 'https://via.placeholder.com/400x200?text=No+Image';
    if (rawPath.startsWith('http')) return rawPath;
    const baseUrl = api.defaults.baseURL.replace(/\/api\/?$/, '');
    const cleanPath = rawPath.split(',')[0].trim().replace(/\\/g, '/');
    return `${baseUrl}${cleanPath.startsWith('/') ? '' : '/'}${cleanPath}`;
  };

  const renderReportCard = ({ item }) => {
    return (
      <View style={styles.card}>
        <Image 
          source={{ uri: resolveImageUrl(item.imageUrl) }} 
          style={styles.reportImg} 
          resizeMode="cover"
        />
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <Text style={styles.reporterName}>{item.user?.name || 'Pelapor Anonim'}</Text>
            <Text style={styles.timeText}>{new Date(item.createdAt).toLocaleDateString('id-ID')}</Text>
          </View>
          
          <View style={styles.locRow}>
            <MaterialCommunityIcons name="map-marker-radius" size={16} color="#12464C" />
            <Text style={styles.locationText} numberOfLines={1}>{item.address || 'Lokasi tidak tersemat'}</Text>
          </View>

          <Text style={styles.descText} numberOfLines={2}>{item.description}</Text>

          <View style={styles.divider} />

          {activeTab === 'incoming' ? (
            <View style={styles.actionRow}>
              <TouchableOpacity 
                style={styles.helpBtn} 
                onPress={() => handleUpdateStatus(item.id, 'VERIFIED')}
              >
                <FontAwesome5 name="hand-holding-heart" size={16} color="#FFF" style={{marginRight: 10}} />
                <Text style={styles.helpBtnText}>Bantu Sekarang</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.mapBtnSquare}
                onPress={() => openInMaps(item.latitude, item.longitude, item.address)}
              >
                <Feather name="map" size={20} color="#12464C" />
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              <View style={styles.statusActionRow}>
                {['ON_PROCESS', 'RESCUED', 'REJECTED'].map((s) => (
                  <TouchableOpacity 
                    key={s} 
                    style={[styles.statusMiniBtn, item.status === s && styles.activeStatusBtn]}
                    onPress={() => handleUpdateStatus(item.id, s)}
                  >
                    <Text style={[styles.statusMiniText, item.status === s && styles.activeStatusText]}>
                      {s === 'ON_PROCESS' ? 'Proses' : s === 'RESCUED' ? 'Selesai' : 'Tolak'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              
              <View style={styles.actionRow}>
                <TouchableOpacity 
                  style={styles.contactBtn}
                  onPress={() => handleContactReporter(item)}
                >
                  <Feather name="message-circle" size={18} color="#12464C" style={{marginRight: 8}} />
                  <Text style={styles.contactBtnText}>Hubungi Pelapor</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.mapBtnSquareSmall}
                  onPress={() => openInMaps(item.latitude, item.longitude, item.address)}
                >
                  <Feather name="map" size={18} color="#12464C" />
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Laporan Darurat</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.tabBar}>
        <TouchableOpacity style={[styles.tab, activeTab === 'incoming' && styles.tabActive]} onPress={() => setActiveTab('incoming')}>
          <Text style={[styles.tabLabel, activeTab === 'incoming' && styles.tabLabelActive]}>Laporan Masuk</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'handled' && styles.tabActive]} onPress={() => setActiveTab('handled')}>
          <Text style={[styles.tabLabel, activeTab === 'handled' && styles.tabLabelActive]}>Laporan Saya</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerLoading}><ActivityIndicator size="large" color="#12464C" /></View>
      ) : (
        <FlatList
          data={reports}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderReportCard}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="clipboard-text-search-outline" size={60} color="#DDD" />
              <Text style={styles.emptyText}>Tidak ada laporan ditemukan.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 15, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#EEE' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1A1A1A' },
  backBtn: { width: 40 },
  tabBar: { flexDirection: 'row', backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#EEE' },
  tab: { flex: 1, paddingVertical: 15, alignItems: 'center' },
  tabActive: { borderBottomWidth: 3, borderBottomColor: '#12464C' },
  tabLabel: { fontSize: 14, color: '#999', fontWeight: '600' },
  tabLabelActive: { color: '#12464C', fontWeight: 'bold' },
  listContent: { padding: 15, paddingBottom: 30 },
  card: { backgroundColor: '#FFF', borderRadius: 24, marginBottom: 20, overflow: 'hidden', elevation: 8, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
  reportImg: { width: '100%', height: 210, backgroundColor: '#F0F0F0' },
  cardContent: { padding: 20 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  reporterName: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  timeText: { fontSize: 12, color: '#999', fontWeight: '600' },
  locRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 6 },
  locationText: { fontSize: 13, color: '#555', flex: 1, fontWeight: '500' },
  descText: { fontSize: 14, color: '#666', lineHeight: 22, marginBottom: 18 },
  divider: { height: 1, backgroundColor: '#F5F5F5', marginBottom: 18 },
  actionRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  helpBtn: { flex: 1, backgroundColor: '#1A5D1A', paddingVertical: 15, borderRadius: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', elevation: 3 },
  helpBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 15 },
  mapBtnSquare: { backgroundColor: '#F0F7F7', width: 56, height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: '#12464C', elevation: 2 },
  statusActionRow: { flexDirection: 'row', gap: 8, marginBottom: 15 },
  statusMiniBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5, borderColor: '#EEE', alignItems: 'center', backgroundColor: '#FAFAFA' },
  activeStatusBtn: { backgroundColor: '#12464C', borderColor: '#12464C' },
  statusMiniText: { fontSize: 12, color: '#888', fontWeight: '700' },
  activeStatusText: { color: '#FFF' },
  contactBtn: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 14, backgroundColor: '#E8F2F2', borderRadius: 16, borderWidth: 1, borderColor: '#D1E5E5' },
  contactBtnText: { color: '#12464C', fontWeight: 'bold', fontSize: 14 },
  mapBtnSquareSmall: { backgroundColor: '#F0F7F7', width: 52, height: 52, borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: '#12464C' },
  centerLoading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { alignItems: 'center', marginTop: 100 },
  emptyText: { marginTop: 15, color: '#BBB', fontSize: 15, fontWeight: '500' }
});