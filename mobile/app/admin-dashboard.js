import React, { useState, useCallback } from 'react';
import { 
  View, Text, StyleSheet, FlatList, TouchableOpacity, 
  Image, ActivityIndicator, Alert, Modal, ScrollView, StatusBar
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import api from '../src/services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function AdminDashboard() {
  const router = useRouter();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('cats'); 
  const [selectedItem, setSelectedItem] = useState(null);
  const [showDetail, setShowDetail] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      let endpoint = '/data/admin/pending-cats';
      if (activeTab === 'donations') endpoint = '/data/admin/pending-campaigns';
      if (activeTab === 'shelters') endpoint = '/data/admin/pending-shelters';
      
      const res = await api.get(endpoint, { headers: { Authorization: `Bearer ${token}` } });
      setData(res.data);
    } catch (e) { 
      console.log(e); 
    } finally { 
      setLoading(false); 
    }
  };

  useFocusEffect(useCallback(() => { fetchData(); }, [activeTab]));

  const handleApprove = async (id) => {
    Alert.alert("Konfirmasi", "Setujui pendaftaran ini?", [
      { text: "Batal", style: "cancel" },
      { text: "Setujui", onPress: async () => {
          try {
            const token = await AsyncStorage.getItem('userToken');
            let url = `/data/admin/approve-cat/${id}`;
            if (activeTab === 'donations') url = `/data/admin/approve-campaign/${id}`;
            if (activeTab === 'shelters') url = `/data/admin/approve-shelter/${id}`;
            await api.patch(url, {}, { headers: { Authorization: `Bearer ${token}` } });
            setShowDetail(false);
            fetchData();
          } catch (e) { 
            Alert.alert("Error", "Gagal menyetujui."); 
          }
      }}
    ]);
  };

  const handleReject = async (id) => {
    Alert.alert("TOLAK DATA", "Data ini akan dihapus/dibatalkan secara permanen. Lanjutkan?", [
      { text: "Batal", style: "cancel" },
      { text: "Ya, Tolak", style: "destructive", onPress: async () => {
          try {
            const token = await AsyncStorage.getItem('userToken');
            let type = activeTab === 'cats' ? 'cat' : activeTab === 'donations' ? 'campaign' : 'shelter';
            await api.delete(`/data/admin/reject/${type}/${id}`, { headers: { Authorization: `Bearer ${token}` } });
            setShowDetail(false);
            fetchData();
          } catch (e) { 
            Alert.alert("Error", "Gagal menolak."); 
          }
      }}
    ]);
  };

  const resolveImageUrl = (path) => {
    if (!path) return 'https://via.placeholder.com/150';
    if (path.startsWith('http')) return path;
    const baseUrl = api.defaults.baseURL.replace(/\/api\/?$/, '');
    const cleanPath = path.split(',')[0].trim().replace(/\\/g, '/');
    return `${baseUrl}${cleanPath.startsWith('/') ? '' : '/'}${cleanPath}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <View>
          <Text style={styles.welcome}>Control Panel</Text>
          <Text style={styles.headerTitle}>Administrator</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={async () => { await AsyncStorage.clear(); router.replace('/'); }}>
          <Feather name="log-out" size={20} color="#FFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.tabBar}>
        <TabItem active={activeTab === 'cats'} label="Anabul" icon="cat" onPress={() => setActiveTab('cats')} />
        <TabItem active={activeTab === 'donations'} label="Donasi" icon="hand-heart" onPress={() => setActiveTab('donations')} />
        <TabItem active={activeTab === 'shelters'} label="Shelter" icon="home-city" onPress={() => setActiveTab('shelters')} />
      </View>

      <FlatList
        data={data}
        keyExtractor={item => item.id.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => { setSelectedItem(item); setShowDetail(true); }}>
            <Image 
              source={{ uri: resolveImageUrl(item.images || item.imageUrl || item.photoProfile || item.shelterPhotos) }} 
              style={styles.thumb} 
            />
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle}>{item.name || item.title || item.nickname}</Text>
              <Text style={styles.cardSub}>{item.shelter?.nickname || item.email || 'Pengaju Baru'}</Text>
            </View>
            <Feather name="chevron-right" size={20} color="#CCC" />
          </TouchableOpacity>
        )}
        contentContainerStyle={{ padding: 20 }}
        ListEmptyComponent={<Text style={styles.emptyText}>Tidak ada antrean.</Text>}
      />

      <Modal visible={showDetail} animationType="slide">
        <SafeAreaView style={{ flex: 1, backgroundColor: '#FFF' }}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowDetail(false)}>
              <Feather name="x" size={28} color="#333" />
            </TouchableOpacity>
            <Text style={styles.modalTitleHeader}>Review Detail</Text>
            <TouchableOpacity onPress={() => handleReject(selectedItem?.id)}>
              <Feather name="trash-2" size={24} color="#E76F51" />
            </TouchableOpacity>
          </View>
          
          <ScrollView contentContainerStyle={{ padding: 20 }}>
            {activeTab !== 'shelters' && (
              <View>
                <Text style={styles.sectionLabel}>DATA OBJEK</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom: 15}}>
                  {(selectedItem?.images || selectedItem?.imageUrl)?.split(',').map((img, i) => (
                    <Image key={i} source={{ uri: resolveImageUrl(img) }} style={styles.bigPreview} />
                  ))}
                </ScrollView>
                <Text style={styles.objTitle}>{selectedItem?.name || selectedItem?.title}</Text>
                
                {activeTab === 'cats' && (
                  <View>
                    <View style={styles.richGrid}>
                      <InfoBox l="Ras" v={selectedItem?.breed || '-'} />
                      <InfoBox l="Umur" v={`${selectedItem?.age || 0} Bln`} />
                      <InfoBox l="Gender" v={selectedItem?.gender === 'MALE' ? 'Jantan' : 'Betina'} />
                    </View>
                    <Text style={styles.infoLabel}>Karakteristik & Kesehatan:</Text>
                    <View style={styles.tagWrapper}>
                      {selectedItem?.personality?.split(',').map((t, i) => (
                        <View key={`p-${i}`} style={styles.tagP}><Text style={styles.tagText}>{t.trim()}</Text></View>
                      ))}
                      {selectedItem?.health?.split(',').map((t, i) => (
                        <View key={`h-${i}`} style={styles.tagH}><Text style={styles.tagText}>{t.trim()}</Text></View>
                      ))}
                    </View>
                  </View>
                )}

                {activeTab === 'donations' && (
                  <View style={styles.richGrid}>
                    <InfoBox l="Target" v={`Rp ${parseInt(selectedItem?.targetAmount || 0).toLocaleString()}`} />
                    <InfoBox l="Deadline" v={selectedItem?.deadline ? new Date(selectedItem.deadline).toLocaleDateString() : '-'} />
                  </View>
                )}

                <Text style={styles.infoLabel}>Deskripsi:</Text>
                <Text style={styles.objDesc}>{selectedItem?.description || '-'}</Text>
                <View style={styles.divider} />
              </View>
            )}

            <Text style={styles.sectionLabel}>PROFIL PENGAJU</Text>
            <View style={styles.shelterBox}>
              <Image source={{ uri: resolveImageUrl(selectedItem?.shelter?.photoProfile || selectedItem?.photoProfile) }} style={styles.largeAvatar} />
              <View style={{flex:1}}>
                <Text style={styles.detailName}>{selectedItem?.shelter?.name || selectedItem?.name || '-'}</Text>
                <Text style={styles.detailNick}>@{selectedItem?.shelter?.nickname || selectedItem?.nickname || '-'}</Text>
                <Text style={styles.detailContact}>{selectedItem?.shelter?.email || selectedItem?.email || '-'}</Text>
              </View>
            </View>
            
            <View style={styles.cardInner}>
              <Text style={styles.infoLabel}>Alamat Lengkap:</Text>
              <Text style={styles.objDesc}>{selectedItem?.shelter?.shelterAddress || selectedItem?.shelterAddress || '-'}</Text>
              
              <View style={styles.divider} />
              
              <View style={styles.registrationTypeBox}>
                <View style={styles.typeIndicator}>
                  <View style={[styles.iconCircleLarge, { backgroundColor: selectedItem?.isClinic ? '#E3F2FD' : '#E0F2F1' }]}>
                    <MaterialCommunityIcons 
                      name={selectedItem?.isClinic ? "hospital-building" : "home-heart"} 
                      size={32} 
                      color={selectedItem?.isClinic ? "#1976D2" : "#12464C"} 
                    />
                  </View>
                  <View style={{ marginLeft: 15 }}>
                    <Text style={styles.typeTitle}>Tipe Pengajuan</Text>
                    <Text style={styles.typeValue}>
                      {selectedItem?.isClinic ? "Klinik Hewan & Shelter" : "Shelter Komunitas"}
                    </Text>
                  </View>
                </View>
              </View>

              {selectedItem?.isClinic && (
                <View>
                  <Text style={[styles.infoLabel, {marginTop: 15}]}>Jam Operasional Klinik:</Text>
                  <View style={styles.infoRowSimple}>
                    <Feather name="clock" size={14} color="#666" />
                    <Text style={[styles.objDesc, {marginLeft: 8}]}>{selectedItem?.clinicOpenHours || '-'}</Text>
                  </View>
                </View>
              )}

              <Text style={[styles.infoLabel, {marginTop: 15}]}>Layanan Yang Ditawarkan:</Text>
              <View style={styles.infoRowSimple}>
                <Feather name="activity" size={14} color="#666" />
                <Text style={[styles.objDesc, {marginLeft: 8}]}>{selectedItem?.services || 'Hanya Adopsi'}</Text>
              </View>
            </View>

            <Text style={[styles.infoLabel, {marginTop: 20}]}>Dokumen KTP (Legalitas):</Text>
            <Image 
              source={{ uri: resolveImageUrl(selectedItem?.shelter?.documentKtp || selectedItem?.documentKtp) }} 
              style={styles.ktpPreview} 
              resizeMode="contain" 
            />

            {selectedItem?.shelterPhotos && (
              <View>
                <Text style={[styles.infoLabel, {marginTop: 20}]}>Foto Fasilitas:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {selectedItem.shelterPhotos.split(',').map((img, i) => (
                    <Image key={`f-${i}`} source={{ uri: resolveImageUrl(img) }} style={styles.shelterPhotoItem} />
                  ))}
                </ScrollView>
              </View>
            )}

            <TouchableOpacity style={styles.approveBtn} onPress={() => handleApprove(selectedItem.id)}>
              <Text style={styles.approveBtnText}>SETUJUI & VERIFIKASI</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const TabItem = ({ active, label, icon, onPress }) => (
  <TouchableOpacity style={[styles.tab, active && styles.tabActive]} onPress={onPress}>
    <MaterialCommunityIcons name={icon} size={20} color={active ? '#12464C' : '#999'} />
    <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
  </TouchableOpacity>
);

const InfoBox = ({ l, v }) => (
  <View style={styles.infoBox}>
    <Text style={styles.infoL}>{l}</Text>
    <Text style={styles.infoV}>{v}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 25, backgroundColor: '#12464C', borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  welcome: { fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: 'bold' },
  headerTitle: { fontSize: 22, fontWeight: '900', color: '#FFF' },
  logoutBtn: { backgroundColor: '#D32F2F', width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  tabBar: { flexDirection: 'row', backgroundColor: '#FFF', margin: 20, borderRadius: 15, elevation: 5 },
  tab: { flex: 1, paddingVertical: 15, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 },
  tabActive: { borderBottomWidth: 3, borderBottomColor: '#12464C' },
  tabText: { fontSize: 12, color: '#999', fontWeight: 'bold' },
  tabTextActive: { color: '#12464C' },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 15, borderRadius: 20, marginBottom: 12, elevation: 1 },
  thumb: { width: 55, height: 55, borderRadius: 12, backgroundColor: '#F5F5F5' },
  cardBody: { flex: 1, marginLeft: 15 },
  cardTitle: { fontSize: 15, fontWeight: 'bold', color: '#333' },
  cardSub: { fontSize: 11, color: '#999' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  modalTitleHeader: { fontSize: 16, fontWeight: 'bold' },
  sectionLabel: { fontSize: 10, fontWeight: '900', color: '#BBB', letterSpacing: 1, marginBottom: 15 },
  bigPreview: { width: 300, height: 180, borderRadius: 20, marginRight: 15 },
  objTitle: { fontSize: 20, fontWeight: 'bold', color: '#12464C' },
  richGrid: { flexDirection: 'row', gap: 10, marginVertical: 15 },
  infoBox: { flex: 1, backgroundColor: '#F0F7F7', padding: 12, borderRadius: 14 },
  infoL: { fontSize: 10, color: '#999' },
  infoV: { fontSize: 13, fontWeight: 'bold', color: '#12464C' },
  infoLabel: { fontSize: 13, fontWeight: 'bold', color: '#12464C', marginTop: 15, marginBottom: 5 },
  objDesc: { fontSize: 14, color: '#666', lineHeight: 22 },
  tagWrapper: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tagP: { backgroundColor: '#F4A26120', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  tagH: { backgroundColor: '#2E7D3220', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  tagText: { fontSize: 11, fontWeight: 'bold', color: '#333' },
  divider: { height: 1, backgroundColor: '#EEE', marginVertical: 20 },
  shelterBox: { flexDirection: 'row', alignItems: 'center', gap: 15, marginBottom: 15 },
  largeAvatar: { width: 60, height: 60, borderRadius: 30 },
  detailName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  detailNick: { fontSize: 13, color: '#12464C', fontWeight: 'bold' },
  detailContact: { fontSize: 12, color: '#999' },
  ktpPreview: { width: '100%', height: 220, borderRadius: 15, backgroundColor: '#F5F5F5', marginTop: 10 },
  shelterPhotoItem: { width: 150, height: 100, borderRadius: 12, marginRight: 10, marginTop: 5 },
  approveBtn: { backgroundColor: '#2E7D32', height: 56, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginTop: 30, marginBottom: 20 },
  approveBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  emptyText: { textAlign: 'center', marginTop: 100, color: '#CCC', fontWeight: 'bold' },
  registrationTypeBox: { backgroundColor: '#F8F9FA', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#EEE', marginVertical: 10 },
  typeIndicator: { flexDirection: 'row', alignItems: 'center' },
  iconCircleLarge: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  typeTitle: { fontSize: 12, fontWeight: 'bold', color: '#999', textTransform: 'uppercase', letterSpacing: 1 },
  typeValue: { fontSize: 18, fontWeight: '900', color: '#12464C', marginTop: 2 },
  infoRowSimple: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9F9F9', padding: 10, borderRadius: 12, marginTop: 5 },
  cardInner: { padding: 5 }
});