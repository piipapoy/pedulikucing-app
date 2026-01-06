import React, { useState, useCallback } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, ScrollView, 
  TextInput, Alert, ActivityIndicator, RefreshControl, Modal, KeyboardAvoidingView, Platform, StatusBar
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import api from '../../src/services/api';

export default function ProfileScreen() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({ donations: 0, reports: 0, adoptions: 0 });
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // State Form
  const [nickname, setNickname] = useState('');
  const [phone, setPhone] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  // State Verifikasi & Error Modal
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [otpCode, setOtpCode] = useState('');

  useFocusEffect(
    useCallback(() => {
      fetchUserProfile();
    }, [])
  );

  const fetchUserProfile = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;

      const response = await api.get('/auth/profile', {
        headers: { Authorization: `Bearer ${token}` }
      });

      const { user: userData, stats: userStats } = response.data;
      
      setUser(userData);
      setStats(userStats);
      setNickname(userData.nickname || '');
      setPhone(userData.phoneNumber || '');
      await AsyncStorage.setItem('userData', JSON.stringify(userData));
    } catch (error) {
      console.log('Gagal ambil profil:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchUserProfile();
  };

  const handleLogout = async () => {
    Alert.alert('Konfirmasi', 'Keluar dari akun?', [
      { text: 'Batal', style: 'cancel' },
      { 
        text: 'Keluar', 
        style: 'destructive',
        onPress: async () => {
          await AsyncStorage.clear();
          router.replace('/');
        }
      }
    ]);
  };

  // CEK SEBELUM SIMPAN
  const handlePreSave = async () => {
    if (nickname.length > 12) {
      setErrorMessage('Nickname maksimal 12 karakter.');
      setShowErrorModal(true);
      return;
    }

    // Jika ganti nomor dan tidak kosong -> Cek duplikat dulu
    if (phone !== user?.phoneNumber && phone.trim() !== '') {
      setLoading(true);
      try {
        const token = await AsyncStorage.getItem('userToken');
        await api.post('/auth/check-phone', { phoneNumber: phone }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        setLoading(false);
        setShowVerifyModal(true);
      } catch (error) {
        setLoading(false);
        if (error.response && error.response.status === 409) {
          setErrorMessage('Nomor telepon ini sudah digunakan oleh pengguna lain.');
          setShowErrorModal(true);
        } else {
          setErrorMessage('Terjadi kesalahan jaringan. Coba lagi nanti.');
          setShowErrorModal(true);
        }
      }
    } else {
      executeSaveProfile();
    }
  };

  const handleVerifyOtp = () => {
    if (otpCode === 'ABC123') {
      setShowVerifyModal(false);
      setOtpCode('');
      executeSaveProfile();
    } else {
      setErrorMessage('Kode verifikasi salah! (Gunakan: ABC123)');
      setShowErrorModal(true);
    }
  };

  const executeSaveProfile = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await api.put('/auth/update-profile', 
        { nickname, phoneNumber: phone },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const updatedUser = response.data.user;
      setUser(updatedUser);
      setIsEditing(false);
      
      Alert.alert('Sukses', 'Profil berhasil diperbarui!');
      fetchUserProfile(); 
    } catch (error) {
      if (error.response?.status === 409) {
         setErrorMessage('Nomor telepon sudah digunakan.');
      } else {
         setErrorMessage('Gagal menyimpan profil.');
      }
      setShowErrorModal(true);
    } finally {
      setLoading(false);
    }
  };

  const maskPhoneNumber = (number) => {
    if (!number || number.length < 8) return number;
    const firstPart = number.slice(0, 4);
    const lastPart = number.slice(-3);
    return `${firstPart}****${lastPart}`;
  };

  const isVerified = !!user?.phoneNumber;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#12464C" />}
      >
        
        {/* HEADER */}
        <View style={styles.headerBlock}>
           <View style={{ alignItems: 'center', paddingHorizontal: 20 }}>
              <View style={styles.avatarContainer}>
                  <Text style={styles.avatarText}>{user?.name?.charAt(0) || 'U'}</Text>
              </View>
              <Text style={styles.fullName}>{user?.name}</Text>
              <Text style={styles.emailText}>{user?.email}</Text>
              
              <View style={[styles.statusTag, { backgroundColor: isVerified ? '#E8F5E9' : '#FFF3E0' }]}>
                  <Text style={[styles.statusText, { color: isVerified ? '#2E7D32' : '#EF6C00' }]}>
                    {isVerified ? 'Akun Terverifikasi' : 'Belum Diverifikasi'}
                  </Text>
              </View>
           </View>
           <View style={styles.headerDivider} />
           <View style={styles.statsRow}>
              <View style={styles.statItem}><Text style={styles.statNumber}>{stats.reports}</Text><Text style={styles.statLabel}>Laporan</Text></View>
              <View style={styles.verticalLine} />
              <View style={styles.statItem}><Text style={styles.statNumber}>{stats.adoptions}</Text><Text style={styles.statLabel}>Adopsi</Text></View>
              <View style={styles.verticalLine} />
              <View style={styles.statItem}><Text style={styles.statNumber}>{stats.donations}</Text><Text style={styles.statLabel}>Donasi</Text></View>
           </View>
        </View>

        {/* DATA DIRI */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Data Diri</Text>
            {!isEditing && (
               <TouchableOpacity style={styles.editBtn} onPress={() => setIsEditing(true)}>
                 <Feather name="edit-2" size={12} color="#12464C" style={{ marginRight: 4 }} />
                 <Text style={styles.editText}>Ubah</Text>
               </TouchableOpacity>
            )}
          </View>
          <View style={styles.card}>
            <View style={styles.inputRow}>
              <View style={styles.iconBox}><Feather name="smile" size={20} color="#555" /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Panggilan (Nickname)</Text>
                {isEditing ? (
                  <TextInput style={styles.textInput} value={nickname} onChangeText={setNickname} placeholder="Contoh: Budi" maxLength={12} />
                ) : <Text style={styles.valueText}>{nickname || '-'}</Text>}
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.inputRow}>
              <View style={styles.iconBox}><Feather name="smartphone" size={20} color="#555" /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Nomor Telepon</Text>
                {isEditing ? (
                  <TextInput style={styles.textInput} value={phone} onChangeText={setPhone} placeholder="0812..." keyboardType="phone-pad" />
                ) : (
                  <View style={{flexDirection:'row', justifyContent:'space-between'}}>
                    <Text style={[styles.valueText, { color: phone ? '#333' : '#999', fontStyle: phone ? 'normal' : 'italic' }]}>
                      {phone ? maskPhoneNumber(phone) : 'Belum diatur'}
                    </Text>
                  </View>
                )}
              </View>
            </View>
            {isEditing && (
              <View style={styles.editActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => { setIsEditing(false); setNickname(user?.nickname || ''); setPhone(user?.phoneNumber || ''); }}>
                  <Text style={styles.cancelText}>Batal</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={handlePreSave} disabled={loading}>
                  {loading ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={styles.saveText}>Simpan</Text>}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* AKUN */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Akun & Keamanan</Text></View>
          <View style={styles.card}>
            <MenuItem icon="clock" label="Riwayat Aktivitas" onPress={() => Alert.alert('Info', 'Coming Soon')} />
            <View style={styles.divider} />
            <MenuItem icon="lock" label="Ganti Kata Sandi" onPress={() => Alert.alert('Info', 'Coming Soon')} />
            <View style={styles.divider} />
            <MenuItem icon="home" label="Daftar Sebagai Shelter" color="#12464C" onPress={() => Alert.alert('Upgrade', 'Coming Soon')} />
          </View>
        </View>

        {/* LOGOUT */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
           <Feather name="log-out" size={18} color="#FF3B30" />
           <Text style={styles.logoutText}>Keluar</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* --- MODAL VERIFIKASI (OTP) --- */}
      <Modal animationType="fade" transparent={true} visible={showVerifyModal} statusBarTranslucent={true} onRequestClose={() => setShowVerifyModal(false)}>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <View style={styles.iconCircle}><Feather name="shield" size={32} color="#12464C" /></View>
              <Text style={styles.modalTitle}>Verifikasi Nomor</Text>
              <Text style={styles.modalDesc}>Kode dikirim ke nomor Anda. (Demo: ABC123)</Text>
              <TextInput style={styles.modalInput} placeholder="Kode OTP" value={otpCode} onChangeText={setOtpCode} autoCapitalize="characters" textAlign="center" />
              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setShowVerifyModal(false)}><Text style={styles.modalBtnTextCancel}>Batal</Text></TouchableOpacity>
                <TouchableOpacity style={styles.modalBtnConfirm} onPress={handleVerifyOtp}><Text style={styles.modalBtnTextConfirm}>Verifikasi</Text></TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* --- MODAL ERROR (MERAH - FIXED STYLE) --- */}
      <Modal animationType="fade" transparent={true} visible={showErrorModal} statusBarTranslucent={true} onRequestClose={() => setShowErrorModal(false)}>
        <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalContent}>
                {/* Icon Error */}
                <View style={[styles.iconCircle, { backgroundColor: '#FFEBEE' }]}>
                  <Feather name="alert-triangle" size={32} color="#FF3B30" />
                </View>
                {/* Judul Neutral */}
                <Text style={styles.modalTitle}>Tidak Bisa Menyimpan</Text>
                {/* Pesan Error Dinamis */}
                <Text style={styles.modalDesc}>{errorMessage}</Text>
                
                {/* Tombol Tunggal (Tutup) */}
                <View style={{ width: '100%' }}>
                  <TouchableOpacity style={styles.modalBtnSingle} onPress={() => setShowErrorModal(false)}>
                    <Text style={styles.modalBtnTextCancel}>Tutup</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const MenuItem = ({ icon, label, onPress, color = '#333' }) => (
  <TouchableOpacity style={styles.menuItem} onPress={onPress}>
    <View style={styles.menuLeft}>
      <Feather name={icon} size={20} color={color} />
      <Text style={[styles.menuLabel, { color }]}>{label}</Text>
    </View>
    <Feather name="chevron-right" size={20} color="#CCC" />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  headerBlock: { paddingTop: 30, paddingBottom: 20, backgroundColor: '#FFF', borderBottomLeftRadius: 30, borderBottomRightRadius: 30, marginBottom: 20, elevation: 3, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10 },
  avatarContainer: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#12464C', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  avatarText: { fontSize: 32, fontWeight: 'bold', color: '#FFF' },
  fullName: { fontSize: 20, fontWeight: 'bold', color: '#1A1A1A' },
  emailText: { fontSize: 14, color: '#888', marginTop: 2, marginBottom: 10 },
  statusTag: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginTop: 4 },
  statusText: { fontSize: 12, fontWeight: '600' },
  headerDivider: { height: 1, backgroundColor: '#F0F0F0', width: '85%', alignSelf: 'center', marginVertical: 20 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-evenly', alignItems: 'center', paddingHorizontal: 10 },
  statItem: { alignItems: 'center', minWidth: 60 },
  statNumber: { fontSize: 18, fontWeight: 'bold', color: '#12464C' },
  statLabel: { fontSize: 12, color: '#888', marginTop: 2 },
  verticalLine: { width: 1, height: 30, backgroundColor: '#E0E0E0' },
  sectionContainer: { paddingHorizontal: 20, marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#1A1A1A' },
  editBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E0F2F1', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  editText: { fontSize: 12, color: '#12464C', fontWeight: '700' },
  card: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5 },
  inputRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  iconBox: { width: 30, alignItems: 'center', marginRight: 12 },
  inputLabel: { fontSize: 11, color: '#999', marginBottom: 4 },
  valueText: { fontSize: 15, color: '#333', fontWeight: '500' },
  textInput: { fontSize: 15, color: '#333', borderBottomWidth: 1, borderBottomColor: '#12464C', paddingVertical: 2, height: 30, flex: 1 },
  divider: { height: 1, backgroundColor: '#F0F0F0', marginVertical: 12 },
  editActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16, gap: 12 },
  cancelBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, backgroundColor: '#F5F5F5' },
  cancelText: { color: '#666', fontSize: 14, fontWeight: '600' },
  saveBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, backgroundColor: '#12464C', minWidth: 80, alignItems: 'center' },
  saveText: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  menuItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  menuLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  menuLabel: { fontSize: 15, fontWeight: '500' },
  logoutBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFEBEE', marginHorizontal: 20, paddingVertical: 14, borderRadius: 12, gap: 8 },
  logoutText: { color: '#D32F2F', fontWeight: 'bold', fontSize: 14 },
  
  // MODAL STYLES (UPDATED FOR CENTERING)
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  modalContainer: { width: '85%' }, // Container yg ngatur lebar
  modalContent: { 
    backgroundColor: '#FFF', 
    borderRadius: 20, 
    padding: 24, 
    alignItems: 'center',
    width: '100%' // Isiannya full ngikutin container
  },
  iconCircle: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#E0F2F1', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 8 },
  modalDesc: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 20, lineHeight: 20 },
  modalInput: { width: '100%', height: 50, borderWidth: 1, borderColor: '#DDD', borderRadius: 12, paddingHorizontal: 16, fontSize: 18, marginBottom: 20, backgroundColor: '#FAFAFA' },
  modalActions: { flexDirection: 'row', gap: 12, width: '100%' },
  modalBtnCancel: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: '#F5F5F5', alignItems: 'center' },
  modalBtnTextCancel: { color: '#666', fontWeight: 'bold' },
  modalBtnConfirm: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: '#12464C', alignItems: 'center' },
  modalBtnSingle: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#EEE',
    alignItems: 'center',
    marginTop: 10
  },
  modalBtnTextConfirm: { color: '#FFF', fontWeight: 'bold' },
});