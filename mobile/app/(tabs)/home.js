import React, { useEffect, useState } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, ScrollView, 
  Image, ActivityIndicator, Dimensions, RefreshControl, TextInput, Platform 
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import api from '../../src/services/api';

const { width } = Dimensions.get('window');

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
      console.log('Error fetching home data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#12464C" />
      </View>
    );
  }

  return (
    <View style={styles.mainWrapper}>
      
      {/* BACKGROUND PATTERN */}
      <View style={styles.bgPatternContainer}>
         <View style={styles.bgBlob1} />
         <View style={styles.bgBlob2} />
         <View style={styles.bgBlob3} />
      </View>

      <ScrollView 
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#12464C" />}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        
        {/* --- 1. HEADER COMPACT --- */}
        <View style={styles.headerContainer}>
           <View style={styles.headerCircle1} />
           <View style={styles.headerCircle2} />

           <SafeAreaView>
              <View style={styles.headerContent}>
                <View>
                  <Text style={styles.greetingSub}>Selamat Pagi,</Text>
                  <Text style={styles.greetingName}>{user?.name?.split(' ')[0] || 'Teman'} 👋</Text>
                </View>
                <TouchableOpacity style={styles.profileBtn} onPress={() => router.push('/(tabs)/profile')}>
                  <Text style={styles.profileInitials}>{user?.name?.charAt(0) || 'U'}</Text>
                </TouchableOpacity>
              </View>
           </SafeAreaView>
        </View>

        {/* --- 2. SEARCH BAR + FILTER --- */}
        <View style={styles.searchBarWrapper}>
          <View style={styles.searchContainer}>
            <Ionicons name="search-outline" size={20} color="#888" style={{marginRight: 10}} />
            <TextInput 
              placeholder="Cari kucing, ras, atau shelter..." 
              placeholderTextColor="#999"
              style={styles.searchInput}
            />
            {/* Filter Icon */}
            <TouchableOpacity style={styles.filterBtn}>
               <Ionicons name="options-outline" size={20} color="#12464C" />
            </TouchableOpacity>
          </View>
        </View>

        {/* --- 3. HERO BANNER (Rounded Button Fix) --- */}
        <View style={styles.heroWrapper}>
          <View style={styles.heroCard}>
            <View style={styles.heroContent}>
              <View style={styles.heroTextContainer}>
                <Text style={styles.heroTitle}>Adopsi, Jangan Beli.</Text>
                <Text style={styles.heroSubtitle}>Temukan sahabat barumu di sini.</Text>
                <TouchableOpacity style={styles.heroButton} onPress={() => router.push('/(tabs)/adopsi')}>
                  <Text style={styles.heroButtonText}>Lihat Kucing</Text>
                </TouchableOpacity>
              </View>
              <Image 
                source={{ uri: 'https://cdn-icons-png.flaticon.com/512/616/616430.png' }} 
                style={styles.heroImage} 
              />
            </View>
          </View>
        </View>

        {/* --- 4. QUICK MENU --- */}
        <View style={styles.menuContainer}>
          <MenuIcon icon="medkit" color="#006064" label="Klinik" />
          <MenuIcon icon="heart" color="#C2185B" label="Donasi" />
          <MenuIcon icon="book" color="#33691E" label="Panduan" />
          <MenuIcon icon="time" color="#E65100" label="Riwayat" />
        </View>

        {/* --- 5. SECTION: TEMAN BARU (Revisi Layout Card) --- */}
        <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="paw" size={22} color="#12464C" style={{ marginRight: 8 }} />
              <Text style={styles.sectionTitle}>Teman Baru</Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/(tabs)/adopsi')}>
              <Text style={styles.seeAll}>Lihat Semua</Text>
            </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalListContainer}>
            {cats.length === 0 ? (
                <EmptyState icon="cat-outline" text="Belum ada kucing baru" />
            ) : (
                cats.map((cat) => (
                    <TouchableOpacity key={cat.id} style={styles.catCard}>
                        {/* Image Container with Gender Badge Overlay */}
                        <View>
                          <Image source={{ uri: cat.imageUrl }} style={styles.catImage} />
                          <View style={[styles.genderBadge, { backgroundColor: cat.gender === 'Jantan' ? '#1976D2' : '#E91E63' }]}>
                             <MaterialCommunityIcons 
                                name={cat.gender === 'Jantan' ? 'gender-male' : 'gender-female'} 
                                size={12} 
                                color="#FFF" 
                             />
                          </View>
                        </View>
                        
                        {/* Info Bersih */}
                        <View style={styles.catInfo}>
                            <Text style={styles.catName} numberOfLines={1}>{cat.name}</Text>
                            <Text style={styles.catBreedText} numberOfLines={1}>{cat.breed}</Text>

                            <View style={styles.catMetaRow}>
                                <View style={styles.metaBadge}>
                                  <Ionicons name="time-outline" size={10} color="#666" />
                                  <Text style={styles.metaText}>{cat.age} Thn</Text>
                                </View>
                                <View style={styles.metaBadge}>
                                  <Ionicons name="location-outline" size={10} color="#666" />
                                  <Text style={styles.metaText}>Bdg</Text>
                                </View>
                            </View>
                        </View>
                    </TouchableOpacity>
                ))
            )}
        </ScrollView>

        {/* --- 6. SECTION: DONASI --- */}
        <View style={[styles.sectionHeader, { marginTop: 24 }]}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="heart" size={22} color="#12464C" style={{ marginRight: 8 }} />
              <Text style={styles.sectionTitle}>Bantu Mereka</Text>
            </View>
            <TouchableOpacity><Text style={styles.seeAll}>Lihat Semua</Text></TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalListContainer}>
            {campaigns.length === 0 ? (
                <EmptyState icon="heart-dislike-outline" text="Belum ada donasi aktif" />
            ) : (
                campaigns.map((camp) => (
                    <TouchableOpacity key={camp.id} style={styles.campaignCard}>
                        <Image source={{ uri: camp.imageUrl }} style={styles.campaignImage} />
                        <View style={styles.campaignContent}>
                            <Text style={styles.campaignTitle} numberOfLines={2}>{camp.title}</Text>
                            
                            <View style={styles.campMetaRow}>
                               <View style={styles.metaIconRow}>
                                  <Ionicons name="people-outline" size={12} color="#777" />
                                  <Text style={styles.campMetaText}>45</Text>
                               </View>
                               <View style={styles.metaIconRow}>
                                  <Ionicons name="time-outline" size={12} color="#777" />
                                  <Text style={styles.campMetaText}>12 Hari</Text>
                               </View>
                            </View>

                            <View style={styles.progressContainer}>
                                <View style={[styles.progressBar, { width: `${Math.min((camp.currentAmount / camp.targetAmount) * 100, 100)}%` }]} />
                            </View>
                            
                            <View style={styles.campaignStats}>
                                <Text style={styles.statValue}>Rp {parseInt(camp.currentAmount).toLocaleString()}</Text>
                                <Text style={styles.statTarget}> / {parseInt(camp.targetAmount / 1000).toLocaleString()}k</Text>
                            </View>
                        </View>
                    </TouchableOpacity>
                ))
            )}
        </ScrollView>

      </ScrollView>
    </View>
  );
}

// -- COMPONENTS --
const MenuIcon = ({ icon, color, label }) => (
  <TouchableOpacity style={styles.menuItem}>
    <View style={styles.menuIconBox}>
      <Ionicons name={icon} size={24} color={color} />
    </View>
    <Text style={styles.menuText}>{label}</Text>
  </TouchableOpacity>
);

const EmptyState = ({ icon, text }) => (
  <View style={styles.emptyStateCard}>
    <Ionicons name={icon} size={32} color="#DDD" />
    <Text style={styles.emptyStateText}>{text}</Text>
  </View>
);

const styles = StyleSheet.create({
  mainWrapper: { flex: 1, backgroundColor: '#F8F9FA' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // BG PATTERN
  bgPatternContainer: { ...StyleSheet.absoluteFillObject, zIndex: -1, overflow: 'hidden' },
  bgBlob1: { position: 'absolute', top: 100, left: -50, width: 200, height: 200, borderRadius: 100, backgroundColor: '#12464C', opacity: 0.03 },
  bgBlob2: { position: 'absolute', top: 300, right: -60, width: 250, height: 250, borderRadius: 125, backgroundColor: '#12464C', opacity: 0.04 },
  bgBlob3: { position: 'absolute', bottom: 100, left: 40, width: 150, height: 150, borderRadius: 75, backgroundColor: '#E76F51', opacity: 0.03 },

  // HEADER
  headerContainer: {
    backgroundColor: '#12464C', paddingBottom: 50, // Nambah dikit biar Search Bar lebih lega
    borderBottomLeftRadius: 24, borderBottomRightRadius: 24,
    paddingTop: Platform.OS === 'android' ? 10 : 0, overflow: 'hidden', position: 'relative'
  },
  headerCircle1: { position: 'absolute', top: -30, right: -30, width: 150, height: 150, borderRadius: 75, backgroundColor: 'rgba(255,255,255,0.08)' },
  headerCircle2: { position: 'absolute', top: 50, left: -50, width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(255,255,255,0.05)' },

  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, marginTop: 10 },
  greetingSub: { fontSize: 13, color: '#B2DFDB' },
  greetingName: { fontSize: 20, fontWeight: 'bold', color: '#FFF' },
  profileBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  profileInitials: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },

  // SEARCH BAR (Fix Filter Icon)
  searchBarWrapper: { paddingHorizontal: 24, marginTop: -25 }, 
  searchContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF',
    height: 50, borderRadius: 16, paddingHorizontal: 16,
    elevation: 4, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, shadowOffset: {width:0, height:4},
  },
  searchInput: { flex: 1, fontSize: 14, color: '#333' },
  filterBtn: { paddingLeft: 10, borderLeftWidth: 1, borderLeftColor: '#EEE', height: '60%', justifyContent:'center' },

  // HERO (Fix Rounded Button)
  heroWrapper: { paddingHorizontal: 24, marginTop: 24, marginBottom: 20 },
  heroCard: {
    backgroundColor: '#FFF', borderRadius: 20, padding: 18, borderWidth: 1, borderColor: '#EAEAEA',
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4,
  },
  heroContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroTextContainer: { flex: 1, marginRight: 8 },
  heroTitle: { fontSize: 18, fontWeight: 'bold', color: '#12464C', marginBottom: 6 },
  heroSubtitle: { fontSize: 12, color: '#666', marginBottom: 14, lineHeight: 18 },
  heroButton: { 
    backgroundColor: '#12464C', paddingHorizontal: 16, paddingVertical: 8, 
    borderRadius: 20, // Full Rounded (Pill)
    alignSelf: 'flex-start' 
  },
  heroButtonText: { color: '#FFF', fontWeight: 'bold', fontSize: 12 },
  heroImage: { width: 75, height: 75, resizeMode: 'contain' },

  // MENU GRID
  menuContainer: { 
    flexDirection: 'row', justifyContent: 'center', gap: 20, marginBottom: 24, flexWrap: 'wrap'
  },
  menuItem: { alignItems: 'center', width: 64 },
  menuIconBox: {
    width: 54, height: 54, borderRadius: 16, backgroundColor: '#FFFFFF',
    justifyContent: 'center', alignItems: 'center', marginBottom: 8,
    elevation: 3, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: {width:0, height:2}
  },
  menuText: { fontSize: 11, color: '#444', fontWeight: '600' },

  // SECTIONS (Larger Font, More Breathing Room)
  sectionHeader: { 
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', 
    paddingHorizontal: 24, marginBottom: 16 
  },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1A1A1A' }, // Font size naik dikit
  seeAll: { fontSize: 13, color: '#12464C', fontWeight: '700' },
  
  horizontalListContainer: { 
    paddingHorizontal: 24, // Lebih lega (24px)
    paddingBottom: 10, gap: 14 
  },

  // EMPTY STATE
  emptyStateCard: { width: width - 48, height: 100, backgroundColor: '#FFF', borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#DDD', borderStyle: 'dashed' },
  emptyStateText: { marginTop: 6, color: '#999', fontSize: 13 },

  // CARD KUCING (Revisi Gender & Hierarchy)
  catCard: { 
    width: 145, backgroundColor: '#FFF', borderRadius: 16, 
    elevation: 3, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 5, shadowOffset: {width:0, height:2},
    overflow: 'hidden' // Biar image ga bocor
  },
  catImage: { width: '100%', height: 130, resizeMode: 'cover' },
  
  // Gender Badge Overlay (Top Right Image)
  genderBadge: {
    position: 'absolute', top: 8, right: 8,
    width: 20, height: 20, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 2, elevation: 2
  },

  catInfo: { padding: 12 },
  catName: { fontSize: 15, fontWeight: 'bold', color: '#222', marginBottom: 2 }, // Nama Dominan
  catBreedText: { fontSize: 11, color: '#888', marginBottom: 10 }, // Ras lebih soft
  
  catMetaRow: { flexDirection: 'row', gap: 6 },
  metaBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F5F5', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6 },
  metaText: { fontSize: 10, color: '#555', marginLeft: 3, fontWeight: '600' },

  // CARD CAMPAIGN
  campaignCard: { width: 250, backgroundColor: '#FFF', borderRadius: 16, elevation: 3, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 5, shadowOffset: {width:0, height:2} },
  campaignImage: { width: '100%', height: 115, borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  campaignContent: { padding: 14 },
  campaignTitle: { fontSize: 13, fontWeight: 'bold', color: '#333', marginBottom: 8, lineHeight: 18, height: 36 },
  campMetaRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  metaIconRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  campMetaText: { fontSize: 10, color: '#777' },
  progressContainer: { height: 5, backgroundColor: '#F0F0F0', borderRadius: 3, marginBottom: 8, overflow: 'hidden' },
  progressBar: { height: '100%', backgroundColor: '#F4A261', borderRadius: 3 },
  campaignStats: { flexDirection: 'row', alignItems: 'flex-end' },
  statValue: { fontSize: 13, fontWeight: 'bold', color: '#12464C' },
  statTarget: { fontSize: 11, color: '#999', marginBottom: 1 },
});