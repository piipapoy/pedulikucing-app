import React, { useEffect, useState } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, ScrollView, 
  Image, ActivityIndicator, Dimensions, RefreshControl, TextInput, Platform, StatusBar
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import api from '../../src/services/api';

const { width } = Dimensions.get('window');

const COLORS = {
  primary: '#1A3C40',
  secondary: '#417D7A',
  accent: '#F4A261',
  background: '#FBFBFB',
  card: '#FFFFFF',
  textHeader: '#1A1A1A',
  textSub: '#777777',
  divider: '#F0F0F0'
};

export default function UserHomeScreen() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [cats, setCats] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const userData = await AsyncStorage.getItem('userData');
      if (userData) setUser(JSON.parse(userData));
      const resCats = await api.get('/data/cats');
      setCats(resCats.data);
      const resCampaigns = await api.get('/data/campaigns');
      setCampaigns(resCampaigns.data);
    } catch (error) {
      console.log('Error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.mainWrapper}>
      <StatusBar barStyle="light-content" />
      
      <ScrollView 
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* --- 1. HEADER INTEGRATED WITH DECORATION --- */}
        <View style={styles.headerBlock}>
           {/* Decorative Shapes Header */}
           <View style={styles.headerCircleTop} />
           <View style={styles.headerCircleBottom} />
           
           <SafeAreaView>
              <View style={styles.headerContent}>
                <View>
                  <Text style={styles.greetingSub}>Halo, Selamat Datang</Text>
                  <Text style={styles.greetingName}>{user?.name?.split(' ')[0] || 'Teman'} ✨</Text>
                </View>
                <TouchableOpacity activeOpacity={0.8} style={styles.profileBtn} onPress={() => router.push('/(tabs)/profile')}>
                  <Text style={styles.profileInitials}>{user?.name?.charAt(0) || 'U'}</Text>
                </TouchableOpacity>
              </View>
           </SafeAreaView>
        </View>

        {/* --- 2. SEARCH INTEGRATED --- */}
        <View style={styles.searchSection}>
          <View style={styles.searchContainer}>
            <Ionicons name="search-outline" size={20} color="#BBB" style={{marginRight: 10}} />
            <TextInput placeholder="Cari kebutuhan anabul..." placeholderTextColor="#BBB" style={styles.searchInput} />
            <TouchableOpacity style={styles.filterBtn}>
               <Ionicons name="options-outline" size={20} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* --- 3. QUICK MENU --- */}
        <View style={styles.menuContainer}>
          <MenuIcon icon="hospital-building" color="#455A64" label="Klinik" onPress={() => router.push('/clinic-gallery')} />
          <MenuIcon icon="heart-multiple" color="#D81B60" label="Donasi" onPress={() => router.push('/donation-gallery')} />
          <MenuIcon icon="book-open-page-variant" color="#2E7D32" label="Panduan" onPress={() => router.push('/guide')} />
          <MenuIcon icon="history" color="#F57C00" label="Riwayat" onPress={() => router.push('/history')} />
        </View>

        {/* --- 4. HERO BANNER WITH DECORATION --- */}
        <View style={styles.heroWrapper}>
          <View style={styles.heroCard}>
            {/* Decorative Shapes Hero */}
            <View style={styles.heroDecorationCircle} />
            <View style={styles.heroDecorationLine} />

            <View style={styles.heroContent}>
              <View style={styles.heroTextContainer}>
                <Text style={styles.heroTitle}>Beri Mereka Rumah</Text>
                <Text style={styles.heroSubtitle}>Adopsi kucing terlantar dan jadilah pahlawan mereka.</Text>
                <TouchableOpacity style={styles.heroButton} onPress={() => router.push('/adoption-gallery')}>
                  <Text style={styles.heroButtonText}>Lihat Kucing</Text>
                  <Ionicons name="arrow-forward" size={14} color="#FFF" />
                </TouchableOpacity>
              </View>
              <Image source={{ uri: 'https://cdn-icons-png.flaticon.com/512/616/616430.png' }} style={styles.heroImage} />
            </View>
          </View>
        </View>

        {/* --- 5. ADOPSI SECTION --- */}
        <SectionHeader title="Siap Diadopsi" onPress={() => router.push('/adoption-gallery')} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
            {cats.map((cat) => (
                <TouchableOpacity key={cat.id} activeOpacity={0.9} style={styles.catCard}>
                    <Image source={{ uri: cat.imageUrl }} style={styles.catImage} />
                    <View style={[styles.genderBadge, { backgroundColor: cat.gender === 'Jantan' ? 'rgba(25, 118, 210, 0.9)' : 'rgba(194, 24, 91, 0.9)' }]}>
                       <MaterialCommunityIcons name={cat.gender === 'Jantan' ? 'gender-male' : 'gender-female'} size={12} color="#FFF" />
                    </View>
                    <View style={styles.catInfo}>
                        <Text style={styles.catName} numberOfLines={1}>{cat.name}</Text>
                        <Text style={styles.catBreedText} numberOfLines={1}>{cat.breed}</Text>
                        <View style={styles.metaRow}>
                           <View style={styles.metaItem}>
                              <Ionicons name="calendar-outline" size={12} color={COLORS.textSub} />
                              <Text style={styles.metaLabel}>{cat.age} Thn</Text>
                           </View>
                           <View style={styles.metaItem}>
                              <Ionicons name="location-outline" size={12} color={COLORS.textSub} />
                              <Text style={styles.metaLabel}>Bdg</Text>
                           </View>
                        </View>
                    </View>
                </TouchableOpacity>
            ))}
        </ScrollView>

        {/* --- 6. DONASI SECTION --- */}
        <SectionHeader title="Campaign Donasi" onPress={() => router.push('/donation-gallery')} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
            {campaigns.map((camp) => (
                <TouchableOpacity key={camp.id} activeOpacity={0.9} style={styles.campaignCard}>
                    <Image source={{ uri: camp.imageUrl }} style={styles.campaignImage} />
                    <View style={styles.campInfo}>
                        <Text style={styles.campaignTitle} numberOfLines={2}>{camp.title}</Text>
                        <View style={styles.progressBarBg}>
                           <View style={[styles.progressBarFill, { width: `${(camp.currentAmount/camp.targetAmount)*100}%` }]} />
                        </View>
                        <View style={styles.campStatsRow}>
                           <Text style={styles.campValue}>Rp {parseInt(camp.currentAmount).toLocaleString()}</Text>
                           <Text style={styles.campPercent}>{Math.round((camp.currentAmount/camp.targetAmount)*100)}%</Text>
                        </View>
                    </View>
                </TouchableOpacity>
            ))}
        </ScrollView>
      </ScrollView>
    </View>
  );
}

const MenuIcon = ({ icon, color, label, onPress }) => (
  <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
    <View style={styles.menuIconBox}>
      <MaterialCommunityIcons name={icon} size={26} color={color} />
    </View>
    <Text style={styles.menuText}>{label}</Text>
  </TouchableOpacity>
);

const SectionHeader = ({ title, onPress }) => (
  <View style={styles.sectionHeader}>
    <Text style={styles.sectionTitle}>{title}</Text>
    <TouchableOpacity onPress={onPress}>
      <Text style={styles.seeAllText}>Lihat Semua</Text>
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  mainWrapper: { flex: 1, backgroundColor: COLORS.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  // HEADER DECORATION
  headerBlock: { 
    backgroundColor: COLORS.primary, 
    paddingBottom: 60, 
    borderBottomLeftRadius: 30, 
    borderBottomRightRadius: 30,
    overflow: 'hidden' // Biar shapes kepotong rapi
  },
  headerCircleTop: {
    position: 'absolute',
    top: -50,
    right: -20,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255, 255, 255, 0.05)'
  },
  headerCircleBottom: {
    position: 'absolute',
    bottom: -20,
    left: -30,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.03)'
  },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, marginTop: 20 },
  greetingSub: { fontSize: 13, color: 'rgba(255,255,255,0.6)', letterSpacing: 0.5 },
  greetingName: { fontSize: 22, fontWeight: '800', color: '#FFF', marginTop: 4 },
  profileBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  profileInitials: { color: '#FFF', fontWeight: 'bold', fontSize: 18 },
  
  searchSection: { paddingHorizontal: 24, marginTop: -28 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, height: 56, borderRadius: 18, paddingHorizontal: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 5 },
  searchInput: { flex: 1, fontSize: 15, color: COLORS.primary, fontWeight: '500' },
  filterBtn: { borderLeftWidth: 1, borderLeftColor: COLORS.divider, paddingLeft: 12 },
  
  menuContainer: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 24, marginTop: 30, marginBottom: 10 },
  menuItem: { alignItems: 'center' },
  menuIconBox: { width: 60, height: 60, borderRadius: 20, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', marginBottom: 10, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  menuText: { fontSize: 12, color: COLORS.primary, fontWeight: '700' },
  
  // HERO DECORATION
  heroWrapper: { paddingHorizontal: 24, marginVertical: 25 },
  heroCard: { 
    backgroundColor: COLORS.secondary, 
    borderRadius: 25, 
    padding: 24,
    overflow: 'hidden' // Penting buat dekorasi shapes
  },
  heroDecorationCircle: {
    position: 'absolute',
    bottom: -30,
    right: -20,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.1)'
  },
  heroDecorationLine: {
    position: 'absolute',
    top: 10,
    left: 100,
    width: 100,
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    transform: [{ rotate: '45deg' }]
  },
  heroContent: { flexDirection: 'row', alignItems: 'center' },
  heroTextContainer: { flex: 1 },
  heroTitle: { fontSize: 22, fontWeight: '900', color: '#FFF' },
  heroSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 8, lineHeight: 20 },
  heroButton: { backgroundColor: COLORS.primary, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 12, marginTop: 18, flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 8 },
  heroButtonText: { color: '#FFF', fontWeight: 'bold', fontSize: 13 },
  heroImage: { width: 90, height: 90, opacity: 0.9 },
  
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingHorizontal: 24, marginBottom: 15, marginTop: 10 },
  sectionTitle: { fontSize: 19, fontWeight: '800', color: COLORS.textHeader },
  seeAllText: { fontSize: 13, color: COLORS.secondary, fontWeight: '700' },
  horizontalList: { paddingLeft: 24, paddingRight: 10, paddingBottom: 15 },

  catCard: {
    width: 155,
    backgroundColor: COLORS.card,
    borderRadius: 20,
    marginRight: 15,
    overflow: 'hidden',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: Platform.OS === 'ios' ? 0 : 1,
    borderColor: '#F0F0F0',
  },
  catImage: { width: '100%', height: 160 },
  genderBadge: { position: 'absolute', top: 10, right: 10, width: 24, height: 24, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  catInfo: { padding: 12 },
  catName: { fontSize: 16, fontWeight: '800', color: COLORS.primary },
  catBreedText: { fontSize: 12, color: COLORS.textSub, marginTop: 2, marginBottom: 10 },
  metaRow: { flexDirection: 'row', gap: 8 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaLabel: { fontSize: 11, color: COLORS.textSub, fontWeight: '600' },

  campaignCard: { width: 220, backgroundColor: COLORS.card, borderRadius: 22, marginRight: 15, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.divider },
  campaignImage: { width: '100%', height: 120 },
  campInfo: { padding: 15 },
  campaignTitle: { fontSize: 14, fontWeight: '700', color: COLORS.primary, height: 40 },
  progressBarBg: { height: 6, backgroundColor: COLORS.divider, borderRadius: 10, marginTop: 12 },
  progressBarFill: { height: '100%', backgroundColor: COLORS.accent, borderRadius: 10 },
  campStatsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  campValue: { fontSize: 13, fontWeight: '800', color: COLORS.primary },
  campPercent: { fontSize: 12, color: COLORS.accent, fontWeight: 'bold' }
});