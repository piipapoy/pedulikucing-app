import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, ScrollView, 
  Image, ActivityIndicator, Dimensions, TextInput, StatusBar, Modal, Platform 
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import api from '../../src/services/api'; // Path disesuaikan karena pindah ke subfolder (tabs)

const { width, height } = Dimensions.get('window');

const COLORS = {
  primary: '#1A3C40',
  secondary: '#417D7A',
  accent: '#F4A261',
  background: '#FBFBFB',
  card: '#FFFFFF',
  textSub: '#777777',
  divider: '#F0F0F0',
  danger: '#C2185B'
};

export default function AdoptionGalleryScreen() {
  const router = useRouter();
  const [cats, setCats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilterModal, setShowFilterModal] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
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

  const getCityFromAddress = (fullAddress) => {
    if (!fullAddress) return 'Indonesia';
    const parts = fullAddress.split(',');
    const cityPart = parts.find(p => p.trim().includes('Kota') || p.trim().includes('Kab')) || parts[2] || parts[0];
    return cityPart.trim();
  };

  const formatAge = (totalMonths) => {
    if (totalMonths < 12) return `${totalMonths} Bln`;
    const years = Math.floor(totalMonths / 12);
    const months = totalMonths % 12;
    return months === 0 ? `${years} Thn` : `${years}th ${months}bln`;
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
    if (filter.ageGroup === 'Kitten') matchAge = cat.age < 12;
    if (filter.ageGroup === 'Dewasa') matchAge = cat.age >= 12;

    return matchSearch && matchBreed && matchGender && matchAge && matchPerso && matchHealth;
  });

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
      
      <View style={styles.fixedTopSection}>
        <View style={styles.header}>
          {/* HEADER TANPA TOMBOL BACK KARENA INI TAB UTAMA */}
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
            <TextInput placeholder="Cari ras atau nama..." style={styles.input} value={searchQuery} onChangeText={setSearchQuery} />
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
                  <Text style={styles.catName} numberOfLines={1}>{cat.name}</Text>
                  
                  <View style={styles.miniTagWrapper}>
                    {cat.personality?.split(',').slice(0, 1).map((p, i) => (
                      <View key={i} style={styles.miniTagPerso}><Text style={styles.miniTagText}>{p}</Text></View>
                    ))}
                  </View>

                  <View style={styles.cardFooter}>
                    <View style={styles.locBox}>
                      <Ionicons name="location-sharp" size={10} color={COLORS.secondary} />
                      <Text style={styles.locText} numberOfLines={1}>
                        {getCityFromAddress(cat.shelter?.shelterAddress)}
                      </Text>
                    </View>
                    <Text style={styles.ageLabel}>{formatAge(cat.age)}</Text>
                  </View>
                </View>

                <View style={[styles.miniGender, { backgroundColor: cat.gender === 'Jantan' ? '#E3F2FD' : '#FCE4EC' }]}>
                  <MaterialCommunityIcons name={cat.gender === 'Jantan' ? 'gender-male' : 'gender-female'} size={12} color={cat.gender === 'Jantan' ? '#1976D2' : '#C2185B'} />
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* Pagination & Empty State tetap sama */}
          {/* ... */}
        </ScrollView>
      )}

      {/* MODAL FILTER tetap sama */}
      {/* ... */}
      <Modal animationType="slide" transparent={true} visible={showFilterModal} statusBarTranslucent={true} onRequestClose={() => setShowFilterModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View><Text style={styles.modalTitle}>Filter Lanjutan</Text></View>
              <TouchableOpacity onPress={() => setShowFilterModal(false)} style={styles.closeBtn}><Feather name="x" size={24} color={COLORS.primary} /></TouchableOpacity>
            </View>
            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              <FilterSection label="Jenis Kelamin" options={genders} selected={filter.gender} onSelect={(v) => setSingleFilter('gender', v)} isMulti={false} />
              <FilterSection label="Rentang Umur" options={ageGroups} selected={filter.ageGroup} onSelect={(v) => setSingleFilter('ageGroup', v)} isMulti={false} />
              <FilterSection label="Karakteristik" options={personalityTags} selected={filter.personalities} onSelect={(v) => toggleMultiFilter('personalities', v)} isMulti={true} />
              <FilterSection label="Status Kesehatan" options={healthTags} selected={filter.healths} onSelect={(v) => toggleMultiFilter('healths', v)} isMulti={true} />
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.fullResetBtn} onPress={() => {setFilter({breed:'Semua', gender:'Semua', ageGroup:'Semua', personalities:[], healths:[]}); setShowFilterModal(false);}}>
                <Text style={styles.resetText}>Reset Filter</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// Komponen FilterSection dan Styles tetap sama dengan galeri kamu
const FilterSection = ({ label, options, selected, onSelect, isMulti }) => (
    <View style={styles.sectionContainer}>
      <Text style={styles.filterLabel}>{label}</Text>
      <View style={styles.optionRowWrap}>
        {options.map(opt => {
          const isActive = isMulti ? selected.includes(opt) : selected === opt;
          return (
            <TouchableOpacity key={opt} style={[styles.optionBtn, isActive && styles.optionBtnActive]} onPress={() => onSelect(opt)}>
              {isMulti && <Ionicons name={isActive ? "checkbox" : "square-outline"} size={16} color={isActive ? "#FFF" : "#CCC"} style={{marginRight: 6}} />}
              <Text style={[styles.optionText, isActive && styles.optionTextActive]}>{opt}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  fixedTopSection: {
    backgroundColor: COLORS.background, zIndex: 10, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, paddingBottom: 10,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, height: 60 },
  headerTitle: { fontSize: 22, fontWeight: '900', color: COLORS.primary },
  iconBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 14, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5 },
  searchSection: { paddingHorizontal: 20, marginTop: 10 },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', height: 50, borderRadius: 16, paddingHorizontal: 16, borderWidth: 1, borderColor: '#EEE' },
  input: { flex: 1, marginLeft: 12, fontSize: 14, color: COLORS.primary, fontWeight: '500' },
  filterWrapper: { marginTop: 15 },
  filterScroll: { paddingLeft: 20, paddingRight: 10 },
  chip: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 12, backgroundColor: '#FFF', marginRight: 10, borderWidth: 1, borderColor: '#EEE' },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: 13, color: '#777', fontWeight: '700' },
  chipTextActive: { color: '#FFF' },
  grid: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 50 },
  row: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  card: { width: (width / 2) - 30, backgroundColor: '#FFF', borderRadius: 24, marginBottom: 20, elevation: 4, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, overflow: 'hidden' },
  cardImg: { width: '100%', height: 160 },
  cardInfo: { padding: 12 },
  catName: { fontSize: 15, fontWeight: '800', color: COLORS.primary },
  miniTagWrapper: { flexDirection: 'row', gap: 4, marginTop: 6, marginBottom: 10 },
  miniTagPerso: { backgroundColor: '#F4A26120', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6 },
  miniTagText: { fontSize: 9, fontWeight: '800', color: COLORS.secondary },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#F5F5F5', paddingTop: 8 },
  locBox: { flexDirection: 'row', alignItems: 'center', gap: 2, flex: 1, marginRight: 8 },
  locText: { fontSize: 10, color: COLORS.textSub, fontWeight: '700' },
  ageLabel: { fontSize: 10, color: COLORS.primary, fontWeight: '900' },
  miniGender: { position: 'absolute', top: 10, right: 10, width: 26, height: 26, borderRadius: 9, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.95)' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContainer: { backgroundColor: '#FFF', borderTopLeftRadius: 35, borderTopRightRadius: 35, padding: 25, maxHeight: height * 0.85 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 25 },
  modalTitle: { fontSize: 22, fontWeight: '900', color: COLORS.primary },
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
  resetText: { color: COLORS.danger, fontWeight: '800', fontSize: 15 }
});