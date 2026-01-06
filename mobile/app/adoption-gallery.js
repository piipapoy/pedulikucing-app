import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, ScrollView, 
  Image, ActivityIndicator, Dimensions, TextInput, StatusBar, Modal 
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import api from '../src/services/api';

const { width, height } = Dimensions.get('window');

const COLORS = {
  primary: '#1A3C40',
  secondary: '#417D7A',
  accent: '#F4A261',
  background: '#FBFBFB',
  card: '#FFFFFF',
  textSub: '#777777',
  divider: '#F0F0F0',
  success: '#2E7D32',
  danger: '#C2185B'
};

export default function AdoptionGallery() {
  const router = useRouter();
  const [cats, setCats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilterModal, setShowFilterModal] = useState(false);

  // --- PAGINATION STATE ---
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  // Filter States
  const [filter, setFilter] = useState({
    breed: 'Semua',
    gender: 'Semua',
    ageGroup: 'Semua',
    personalities: [],
    healths: []
  });

  const breeds = ['Semua', 'Domestik', 'Anggora', 'Persia', 'British Shorthair'];
  const genders = ['Semua', 'Jantan', 'Betina'];
  const ageGroups = ['Semua', 'Kitten', 'Dewasa'];
  const personalityTags = ['Manja', 'Aktif', 'Pemalu', 'Tenang', 'Penurut'];
  const healthTags = ['Steril', 'Vaksin', 'Bebas Kutu', 'Sehat'];

  useEffect(() => { fetchCats(); }, []);

  // Reset ke halaman 1 tiap kali filter berubah biar gak error
  useEffect(() => { setCurrentPage(1); }, [searchQuery, filter]);

  const fetchCats = async () => {
    try {
      const res = await api.get('/data/cats');
      setCats(res.data);
    } catch (error) {
      console.log('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCats = cats.filter(cat => {
    const matchSearch = cat.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        cat.breed.toLowerCase().includes(searchQuery.toLowerCase());
    const matchBreed = filter.breed === 'Semua' || cat.breed === filter.breed;
    const matchGender = filter.gender === 'Semua' || cat.gender === filter.gender;
    const matchPerso = filter.personalities.length === 0 || 
                      filter.personalities.every(p => cat.personality?.includes(p));
    const matchHealth = filter.healths.length === 0 || 
                       filter.healths.every(h => cat.health?.includes(h));
    let matchAge = true;
    if (filter.ageGroup === 'Kitten') matchAge = cat.age < 1;
    if (filter.ageGroup === 'Dewasa') matchAge = cat.age >= 1;

    return matchSearch && matchBreed && matchGender && matchAge && matchPerso && matchHealth;
  });

  // --- PAGINATION LOGIC ---
  const totalPages = Math.ceil(filteredCats.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentCats = filteredCats.slice(indexOfFirstItem, indexOfLastItem);

  const setSingleFilter = (key, value) => setFilter(p => ({ ...p, [key]: value }));

  const toggleMultiFilter = (key, value) => {
    setFilter(prev => {
      const current = prev[key];
      const isExist = current.includes(value);
      return {
        ...prev,
        [key]: isExist ? current.filter(i => i !== value) : [...current, value]
      };
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Feather name="arrow-left" size={24} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Adopsi Kucing</Text>
        <TouchableOpacity 
            style={[styles.iconBtn, (filter.breed !== 'Semua' || filter.personalities.length > 0) && {backgroundColor: COLORS.primary}]} 
            onPress={() => setShowFilterModal(true)}
        >
          <Feather name="sliders" size={20} color={(filter.breed !== 'Semua' || filter.personalities.length > 0) ? '#FFF' : COLORS.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <Feather name="search" size={18} color="#999" />
          <TextInput placeholder="Cari kucing idamanmu..." style={styles.input} value={searchQuery} onChangeText={setSearchQuery} />
        </View>
      </View>

      <View style={styles.filterWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {breeds.map((b) => (
            <TouchableOpacity key={b} onPress={() => setSingleFilter('breed', b)} style={[styles.chip, filter.breed === b && styles.chipActive]}>
              <Text style={[styles.chipText, filter.breed === b && styles.chipTextActive]}>{b}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={{marginTop: 50}} />
      ) : (
        <ScrollView contentContainerStyle={styles.grid} showsVerticalScrollIndicator={false}>
          <View style={styles.row}>
            {currentCats.map((cat) => (
              <TouchableOpacity key={cat.id} style={styles.card} onPress={() => router.push({ pathname: '/cat-detail', params: { id: cat.id } })}>
                <Image source={{ uri: cat.images?.split(',')[0] }} style={styles.cardImg} />
                <View style={styles.cardInfo}>
                  <Text style={styles.catName}>{cat.name}</Text>
                  <Text style={styles.catBreed}>{cat.breed}</Text>
                  <View style={styles.cardFooter}>
                    <View style={styles.locBox}><Ionicons name="location-sharp" size={12} color={COLORS.secondary} /><Text style={styles.locText}>Bandung</Text></View>
                    <Text style={styles.ageLabel}>{cat.age < 1 ? 'Kitten' : cat.age + ' Thn'}</Text>
                  </View>
                </View>
                <View style={[styles.miniGender, { backgroundColor: cat.gender === 'Jantan' ? '#E3F2FD' : '#FCE4EC' }]}>
                  <MaterialCommunityIcons name={cat.gender === 'Jantan' ? 'gender-male' : 'gender-female'} size={12} color={cat.gender === 'Jantan' ? '#1976D2' : '#C2185B'} />
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* --- PAGINATION CONTROLLER --- */}
          {filteredCats.length > itemsPerPage && (
            <View style={styles.paginationContainer}>
              <TouchableOpacity 
                style={[styles.pageBtn, currentPage === 1 && styles.pageBtnDisabled]} 
                onPress={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <Feather name="chevron-left" size={20} color={currentPage === 1 ? "#CCC" : COLORS.primary} />
              </TouchableOpacity>

              <View style={styles.pageInfo}>
                <Text style={styles.currentPageText}>{currentPage}</Text>
              </View>

              <TouchableOpacity 
                style={[styles.pageBtn, currentPage === totalPages && styles.pageBtnDisabled]} 
                onPress={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                <Feather name="chevron-right" size={20} color={currentPage === totalPages ? "#CCC" : COLORS.primary} />
              </TouchableOpacity>
            </View>
          )}

          {filteredCats.length === 0 && (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="cat" size={60} color="#DDD" />
              <Text style={styles.emptyText}>Tidak menemukan anabul yang cocok.</Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* MODAL FILTER TETAP SAMA */}
      <Modal animationType="slide" transparent={true} visible={showFilterModal} statusBarTranslucent={true} onRequestClose={() => setShowFilterModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Filter Lanjutan</Text>
                <Text style={styles.modalSubTitle}>Sesuaikan pencarianmu</Text>
              </View>
              <TouchableOpacity onPress={() => setShowFilterModal(false)} style={styles.closeBtn}>
                <Feather name="x" size={24} color={COLORS.primary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              <FilterSection label="Jenis Kelamin" options={genders} selected={filter.gender} onSelect={(v) => setSingleFilter('gender', v)} isMulti={false} />
              <FilterSection label="Rentang Umur" options={ageGroups} selected={filter.ageGroup} onSelect={(v) => setSingleFilter('ageGroup', v)} isMulti={false} />
              <FilterSection label="Karakteristik (Bisa pilih banyak)" options={personalityTags} selected={filter.personalities} onSelect={(v) => toggleMultiFilter('personalities', v)} isMulti={true} />
              <FilterSection label="Status Kesehatan (Bisa pilih banyak)" options={healthTags} selected={filter.healths} onSelect={(v) => toggleMultiFilter('healths', v)} isMulti={true} />
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.fullResetBtn} onPress={() => {setFilter({breed:'Semua', gender:'Semua', ageGroup:'Semua', personalities:[], healths:[]}); setShowFilterModal(false);}}>
                <Text style={styles.resetText}>Reset Semua Filter</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const FilterSection = ({ label, options, selected, onSelect, isMulti }) => (
  <View style={styles.sectionContainer}>
    <Text style={styles.filterLabel}>{label}</Text>
    <View style={styles.optionRowWrap}>
      {options.map(opt => {
        const isActive = isMulti ? selected.includes(opt) : selected === opt;
        return (
          <TouchableOpacity key={opt} style={[styles.optionBtn, isActive && styles.optionBtnActive]} onPress={() => onSelect(opt)}>
            {isMulti && (
              <Ionicons name={isActive ? "checkbox" : "square-outline"} size={16} color={isActive ? "#FFF" : "#CCC"} style={{marginRight: 6}} />
            )}
            <Text style={[styles.optionText, isActive && styles.optionTextActive]}>{opt}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, height: 60 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: COLORS.primary },
  iconBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 14, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5 },
  searchSection: { paddingHorizontal: 20, marginTop: 15 },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', height: 54, borderRadius: 18, paddingHorizontal: 16, borderWidth: 1, borderColor: '#EEE' },
  input: { flex: 1, marginLeft: 12, fontSize: 15, color: COLORS.primary, fontWeight: '500' },
  filterWrapper: { marginTop: 18 },
  filterScroll: { paddingLeft: 20, paddingRight: 10 },
  chip: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 14, backgroundColor: '#FFF', marginRight: 10, borderWidth: 1, borderColor: '#EEE' },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: 14, color: '#777', fontWeight: '700' },
  chipTextActive: { color: '#FFF' },
  grid: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 50 },
  row: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  card: { width: (width / 2) - 30, backgroundColor: '#FFF', borderRadius: 24, marginBottom: 20, elevation: 4, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, overflow: 'hidden' },
  cardImg: { width: '100%', height: 170 },
  cardInfo: { padding: 14 },
  catName: { fontSize: 16, fontWeight: '800', color: COLORS.primary },
  catBreed: { fontSize: 12, color: COLORS.textSub, marginTop: 2, fontWeight: '600' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  locBox: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  locText: { fontSize: 11, color: COLORS.textSub, fontWeight: '700' },
  ageLabel: { fontSize: 11, color: COLORS.secondary, fontWeight: '900' },
  miniGender: { position: 'absolute', top: 12, right: 12, width: 28, height: 28, borderRadius: 10, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.9)' },

  // --- PAGINATION STYLES ---
  // --- PAGINATION STYLES UPDATE ---
  paginationContainer: { 
    flexDirection: 'row', 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginTop: 10, 
    marginBottom: 40, 
    gap: 25 // Gue lebarin gap-nya biar enak dilihat
  },
  pageBtn: { 
    width: 44, 
    height: 44, 
    backgroundColor: '#FFF', 
    borderRadius: 14, 
    justifyContent: 'center', 
    alignItems: 'center', 
    elevation: 3, 
    borderWidth: 1, 
    borderColor: '#EEE' 
  },
  pageBtnDisabled: { 
    backgroundColor: '#F9F9F9', 
    elevation: 0, 
    borderColor: '#F0F0F0' 
  },
  pageInfo: { 
    minWidth: 40, 
    alignItems: 'center' 
  },
  currentPageText: { 
    fontSize: 20, 
    fontWeight: '900', 
    color: COLORS.primary 
  },
  totalPagesText: { fontSize: 10, color: COLORS.textSub, fontWeight: '600' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContainer: { backgroundColor: '#FFF', borderTopLeftRadius: 35, borderTopRightRadius: 35, padding: 25, maxHeight: height * 0.85 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 25 },
  modalTitle: { fontSize: 22, fontWeight: '900', color: COLORS.primary },
  modalSubTitle: { fontSize: 13, color: COLORS.textSub, marginTop: 4, fontWeight: '600' },
  closeBtn: { padding: 5 },
  modalContent: { marginBottom: 20 },
  sectionContainer: { marginBottom: 24 },
  filterLabel: { fontSize: 15, fontWeight: '800', color: COLORS.primary, marginBottom: 14 },
  optionRowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  optionBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14, backgroundColor: '#F8F9FA', borderWidth: 1, borderColor: '#EEE' },
  optionBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  optionText: { color: '#666', fontSize: 13, fontWeight: '700' },
  optionTextActive: { color: '#FFF' },
  modalFooter: { borderTopWidth: 1, borderTopColor: '#F5F5F5', paddingTop: 20, paddingBottom: 10 },
  fullResetBtn: { paddingVertical: 16, alignItems: 'center' },
  resetText: { color: COLORS.danger, fontWeight: '800', fontSize: 15 },
  emptyState: { alignItems: 'center', marginTop: 80 },
  emptyText: { color: '#999', marginTop: 15, fontSize: 15, fontWeight: '600' }
});