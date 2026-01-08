import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, ScrollView, 
  ActivityIndicator, RefreshControl, Dimensions, Alert
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons, FontAwesome5, Ionicons } from '@expo/vector-icons';
import api from '../src/services/api';

const { width } = Dimensions.get('window');

// Helper format rupiah sederhana agar dashboard terlihat cantik
const formatCurrency = (num) => {
  if (num >= 1000000) return `Rp ${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `Rp ${(num / 1000).toFixed(0)}k`;
  return `Rp ${num}`;
};

export default function ShelterDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [shelterData, setShelterData] = useState(null);

  const [stats, setStats] = useState({
    totalCats: 0,
    pendingReports: 0,
    activeAdoptions: 0,
    totalDonations: 0
  });

  useEffect(() => {
    checkRoleAndLoad();
  }, []);

  const checkRoleAndLoad = async () => {
    try {
      const userStr = await AsyncStorage.getItem('userData');
      const user = JSON.parse(userStr);

      if (!user || user.role !== 'SHELTER') {
        router.replace('/'); 
        return;
      }

      setShelterData(user);
      await fetchStats();
    } catch (e) {
      console.log("Check Role Error:", e);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
  try {
    const token = await AsyncStorage.getItem('userToken');
    const res = await api.get('/auth/activities', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const data = res.data;

    if (data.isShelter) {
      setStats({
        totalCats: data.cats?.length || 0,
        // Ambil data globalPendingCount dari backend
        pendingReports: data.globalPendingCount || 0, 
        activeAdoptions: data.adoptions?.length || 0,
        totalDonations: data.donations?.reduce((acc, curr) => acc + curr.amount, 0) || 0
      });
    }
  } catch (e) {
    console.log("Fetch Stats Error:", e);
  }
};

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchStats();
    setRefreshing(false);
  };

  const handleLogout = async () => {
    Alert.alert("Keluar", "Apakah Anda yakin ingin keluar?", [
      { text: "Batal", style: "cancel" },
      { text: "Ya, Keluar", onPress: async () => {
          await AsyncStorage.clear();
          router.replace('/');
      }}
    ]);
  };

  if (loading) {
    return (
      <View style={styles.center}><ActivityIndicator size="large" color="#12464C" /></View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* HEADER SECTION */}
        <View style={styles.header}>
          <View>
            <Text style={styles.welcomeText}>Halo, Mitra Shelter!</Text>
            <Text style={styles.shelterName}>{shelterData?.name || 'Rumah Kucing'}</Text>
          </View>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutCircle}>
            <Feather name="log-out" size={20} color="#E76F51" />
          </TouchableOpacity>
        </View>

        {/* STATS GRID (Data Riil dari DB) */}
        <View style={styles.statsGrid}>
          <View style={[styles.statBox, { backgroundColor: '#E0F2F1' }]}>
            <FontAwesome5 name="cat" size={20} color="#12464C" />
            <Text style={styles.statNumber}>{stats.totalCats}</Text>
            <Text style={styles.statLabel}>Anabul</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: '#FFEBEE' }]}>
            <MaterialCommunityIcons name="alert-decagram" size={22} color="#C2185B" />
            <Text style={styles.statNumber}>{stats.pendingReports}</Text>
            <Text style={styles.statLabel}>Laporan Masuk</Text> 
          </View>
          <View style={[styles.statBox, { backgroundColor: '#E3F2FD' }]}>
            <Feather name="file-text" size={20} color="#1976D2" />
            <Text style={styles.statNumber}>{stats.activeAdoptions}</Text>
            <Text style={styles.statLabel}>Adopsi</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: '#E8F5E9' }]}>
            <FontAwesome5 name="hand-holding-usd" size={20} color="#2E7D32" />
            <Text style={styles.statNumber}>{formatCurrency(stats.totalDonations)}</Text>
            <Text style={styles.statLabel}>Donasi</Text>
          </View>
        </View>

        {/* PUSAT KENDALI SHELTER */}
        <Text style={styles.sectionTitle}>Pusat Kendali Shelter</Text>
        
        <View style={styles.menuContainer}>
          {/* Kelola Kucing */}
          <TouchableOpacity 
            style={styles.menuItem} 
            onPress={() => router.push('/shelter-inventory')}
          >
            <View style={[styles.menuIcon, { backgroundColor: '#12464C' }]}>
              <FontAwesome5 name="paw" size={18} color="#FFF" />
            </View>
            <Text style={styles.menuTitle}>Kelola Kucing</Text>
          </TouchableOpacity>

          {/* Laporan Darurat */}
          <TouchableOpacity 
            style={styles.menuItem} 
            onPress={() => router.push({ pathname: '/shelter-reports', params: { initialTab: 'laporan' } })}
          >
            <View style={[styles.menuIcon, { backgroundColor: '#C2185B' }]}>
              <MaterialCommunityIcons name="alarm-light" size={20} color="#FFF" />
            </View>
            <Text style={styles.menuTitle}>Laporan Darurat</Text>
          </TouchableOpacity>

          {/* Chat */}
          <TouchableOpacity 
            style={styles.menuItem} 
            onPress={() => router.push('/shelter-chat-list')}
          >
            <View style={[styles.menuIcon, { backgroundColor: '#2A9D8F' }]}>
              <Ionicons name="chatbubbles" size={20} color="#FFF" />
            </View>
            <Text style={styles.menuTitle}>Pesan Chat</Text>
          </TouchableOpacity>

          {/* Kelola Donasi */}
          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/shelter-donation-manage')}>
            <View style={[styles.menuIcon, { backgroundColor: '#2E7D32' }]}>
              <FontAwesome5 name="donate" size={18} color="#FFF" />
            </View>
            <Text style={styles.menuTitle}>Kelola Donasi</Text>
          </TouchableOpacity>

          {/* Kelola Adopsi */}
          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/shelter-adoption-manage')}>
            <View style={[styles.menuIcon, { backgroundColor: '#1976D2' }]}>
              <MaterialCommunityIcons name="clipboard-check" size={20} color="#FFF" />
            </View>
            <Text style={styles.menuTitle}>Kelola Adopsi</Text>
          </TouchableOpacity>

          {/* Profile Shelter */}
          <TouchableOpacity 
            style={styles.menuItem} 
            onPress={() => router.push('/shelter-profile')}
          >
            <View style={[styles.menuIcon, { backgroundColor: '#455A64' }]}>
              <Feather name="user" size={20} color="#FFF" />
            </View>
            <Text style={styles.menuTitle}>Profile Shelter</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  scrollContent: { padding: 20 },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 25,
    marginTop: 10
  },
  welcomeText: { fontSize: 13, color: '#888' },
  shelterName: { fontSize: 20, fontWeight: 'bold', color: '#12464C' },
  logoutCircle: { 
    width: 40, height: 40, borderRadius: 20, 
    backgroundColor: '#FFEBEE', justifyContent: 'center', alignItems: 'center' 
  },
  statsGrid: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    justifyContent: 'space-between',
    marginBottom: 25
  },
  statBox: { 
    width: (width - 55) / 2, 
    padding: 15, 
    borderRadius: 16, 
    marginBottom: 15,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 2
  },
  statNumber: { fontSize: 18, fontWeight: 'bold', color: '#333', marginTop: 8 },
  statLabel: { fontSize: 11, color: '#666', fontWeight: '500' },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 15 },
  menuContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between'
  },
  menuItem: { 
    width: (width - 55) / 2,
    backgroundColor: '#FFF', 
    padding: 18, 
    borderRadius: 16, 
    marginBottom: 15,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4
  },
  menuIcon: { 
    width: 45, height: 45, borderRadius: 12, 
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 12
  },
  menuTitle: { fontSize: 13, fontWeight: '700', color: '#333', textAlign: 'center' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});