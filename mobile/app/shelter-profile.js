import React, { useState, useCallback } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, ScrollView, 
  TextInput, Alert, ActivityIndicator, RefreshControl, Modal, KeyboardAvoidingView, Platform, StatusBar
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import api from '../src/services/api'; // Sesuaikan path api
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'react-native';

export default function ShelterProfileScreen() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // State Form (Full Data Shelter)
  const [nickname, setNickname] = useState(''); // Nama Shelter
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  // State Ganti Password
  const [showCurrentPassModal, setShowCurrentPassModal] = useState(false);
  const [showNewPassModal, setShowNewPassModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isCurrentPasswordVisible, setIsCurrentPasswordVisible] = useState(false);
  const [isNewPasswordVisible, setIsNewPasswordVisible] = useState(false);
  const [loadingPass, setLoadingPass] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchShelterProfile();
    }, [])
  );

  const fetchShelterProfile = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await api.get('/auth/profile', {
        headers: { Authorization: `Bearer ${token}` }
      });

      const { user: userData } = response.data;
      setUser(userData);
      setNickname(userData.nickname || '');
      setPhone(userData.phoneNumber || '');
      setAddress(userData.shelterAddress || '');
    } catch (error) {
      console.log('Gagal ambil profil:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert('Konfirmasi', 'Keluar dari akun Shelter?', [
      { text: 'Batal', style: 'cancel' },
      { text: 'Keluar', style: 'destructive', onPress: async () => {
          await AsyncStorage.clear();
          router.replace('/');
      }}
    ]);
  };

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert("Izin Ditolak", "Butuh akses galeri untuk ganti foto.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled) uploadPhoto(result.assets[0].uri);
  };

  const uploadPhoto = async (uri) => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const formData = new FormData();
      formData.append('photo', { uri, name: `shelter_${user.id}.jpg`, type: 'image/jpeg' });

      const res = await api.put('/auth/update-photo', formData, {
        headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${token}` }
      });

      setUser({ ...user, photoProfile: res.data.photoProfile });
      Alert.alert("Sukses", "Foto profil shelter diperbarui!");
    } catch (error) {
      Alert.alert("Gagal", "Gagal mengunggah foto.");
    } finally { setLoading(false); }
  };

  const handleSaveProfile = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      await api.put('/auth/update-profile', { 
        nickname, 
        phoneNumber: phone,
        shelterAddress: address // Pastikan backend handle field ini
      }, { headers: { Authorization: `Bearer ${token}` } });

      setIsEditing(false);
      Alert.alert('Sukses', 'Data Shelter berhasil diperbarui!');
      fetchShelterProfile();
    } catch (error) {
      Alert.alert('Error', 'Gagal menyimpan data.');
    } finally { setLoading(false); }
  };

  const resolveImageUrl = (path) => {
    if (!path) return null;
    const baseUrl = api.defaults.baseURL.replace('/api', '');
    return `${baseUrl}${path}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <ScrollView 
        showsVerticalScrollIndicator={false} 
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => {setRefreshing(true); fetchShelterProfile();}} tintColor="#12464C" />}
      >
        
        {/* HEADER BLOCK */}
        <View style={styles.headerBlock}>
          <View style={{ alignItems: 'center' }}>
            <TouchableOpacity 
              style={styles.avatarContainer} 
              onPress={() => isEditing && handlePickImage()} 
              activeOpacity={isEditing ? 0.7 : 1}
            >
              {user?.photoProfile ? (
                <Image source={{ uri: resolveImageUrl(user.photoProfile) }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarText}>{user?.name?.charAt(0) || 'S'}</Text>
              )}
              {isEditing && (
                <View style={styles.editPhotoOverlay}>
                  <Feather name="camera" size={20} color="#FFF" />
                </View>
              )}
            </TouchableOpacity>
            <Text style={styles.fullName}>{user?.name}</Text>
            <Text style={styles.emailText}>{user?.email}</Text>
            <View style={styles.badgeVerified}>
                <MaterialCommunityIcons name="check-decagram" size={16} color="#12464C" />
                <Text style={styles.badgeText}>Shelter Terverifikasi</Text>
            </View>
          </View>
        </View>

        {/* FORM DATA SHELTER */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Informasi Shelter</Text>
            {!isEditing && (
              <TouchableOpacity style={styles.editBtn} onPress={() => setIsEditing(true)}>
                <Feather name="edit-3" size={14} color="#12464C" />
                <Text style={styles.editText}>Edit Profil</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.card}>
            {/* Nama Shelter / Nickname */}
            <ProfileInput icon="home" label="Nama Shelter (Nickname)" value={nickname} onChange={setNickname} editing={isEditing} />
            <View style={styles.divider} />
            
            {/* Nomor Telepon */}
            <ProfileInput icon="phone" label="Nomor Telepon" value={phone} onChange={setPhone} editing={isEditing} keyboardType="phone-pad" />
            <View style={styles.divider} />

            {/* Alamat Shelter */}
            <ProfileInput icon="map-pin" label="Lokasi / Alamat Lengkap" value={address} onChange={setAddress} editing={isEditing} multiline />

            {isEditing && (
              <View style={styles.editActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => {setIsEditing(false); fetchShelterProfile();}}>
                  <Text style={styles.cancelText}>Batal</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={handleSaveProfile} disabled={loading}>
                  {loading ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={styles.saveText}>Simpan</Text>}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* KEAMANAN */}
        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionTitle, {marginBottom: 10}]}>Keamanan</Text>
          <View style={styles.card}>
            <TouchableOpacity style={styles.menuItem} onPress={() => setShowCurrentPassModal(true)}>
              <View style={styles.menuLeft}>
                <Feather name="lock" size={18} color="#555" />
                <Text style={styles.menuLabel}>Ganti Kata Sandi</Text>
              </View>
              <Feather name="chevron-right" size={18} color="#CCC" />
            </TouchableOpacity>
          </View>
        </View>

        {/* LOGOUT */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Feather name="log-out" size={18} color="#FF3B30" />
            <Text style={styles.logoutText}>Keluar Akun</Text>
        </TouchableOpacity>

      </ScrollView>

      {/* MODAL GANTI PASSWORD (Reuse logic dari profile user) */}
      <PasswordModals 
        showCurrent={showCurrentPassModal} 
        setShowCurrent={setShowCurrentPassModal}
        showNew={showNewPassModal}
        setShowNew={setShowNewPassModal}
        userEmail={user?.email}
        api={api}
      />

    </SafeAreaView>
  );
}

// SUB-COMPONENT: Input Bar
const ProfileInput = ({ icon, label, value, onChange, editing, ...props }) => (
  <View style={styles.inputRow}>
    <View style={styles.iconBox}><Feather name={icon} size={18} color="#12464C" /></View>
    <View style={{ flex: 1 }}>
      <Text style={styles.inputLabel}>{label}</Text>
      {editing ? (
        <TextInput style={styles.textInput} value={value} onChangeText={onChange} {...props} />
      ) : <Text style={styles.valueText}>{value || '-'}</Text>}
    </View>
  </View>
);

// Ganti Password Modals (Logic Simplified)
const PasswordModals = ({ showCurrent, setShowCurrent, showNew, setShowNew, userEmail, api }) => {
    const [pass, setPass] = useState('');
    const [newP, setNewP] = useState('');
    const [loading, setLoading] = useState(false);

    const verify = async () => {
        setLoading(true);
        try {
            await api.post('/auth/login', { email: userEmail, password: pass });
            setShowCurrent(false);
            setPass('');
            setShowNew(true);
        } catch (e) { Alert.alert("Error", "Kata sandi salah."); }
        finally { setLoading(false); }
    };

    const update = async () => {
        if (newP.length < 6) return Alert.alert("Error", "Min 6 karakter.");
        setLoading(true);
        try {
            await api.post('/auth/reset-password', { email: userEmail, newPassword: newP });
            setShowNew(false);
            setNewP('');
            Alert.alert("Sukses", "Kata sandi diganti.");
        } catch (e) { Alert.alert("Error", "Gagal ganti kata sandi."); }
        finally { setLoading(false); }
    };

    return (
        <>
        <Modal visible={showCurrent} transparent animationType="fade">
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>Verifikasi Kata Sandi</Text>
                    <TextInput style={styles.modalInput} placeholder="Sandi saat ini" secureTextEntry value={pass} onChangeText={setPass} />
                    <View style={styles.modalActions}>
                        <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setShowCurrent(false)}><Text>Batal</Text></TouchableOpacity>
                        <TouchableOpacity style={styles.modalBtnConfirm} onPress={verify} disabled={loading}>
                            {loading ? <ActivityIndicator color="#FFF" /> : <Text style={{color:'#FFF'}}>Lanjut</Text>}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
        <Modal visible={showNew} transparent animationType="fade">
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>Kata Sandi Baru</Text>
                    <TextInput style={styles.modalInput} placeholder="Min 6 karakter" secureTextEntry value={newP} onChangeText={setNewP} />
                    <View style={styles.modalActions}>
                        <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setShowNew(false)}><Text>Batal</Text></TouchableOpacity>
                        <TouchableOpacity style={styles.modalBtnConfirm} onPress={update} disabled={loading}>
                             {loading ? <ActivityIndicator color="#FFF" /> : <Text style={{color:'#FFF'}}>Simpan</Text>}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
        </>
    );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  headerBlock: { paddingVertical: 40, backgroundColor: '#FFF', borderBottomLeftRadius: 30, borderBottomRightRadius: 30, marginBottom: 20, elevation: 3 },
  avatarContainer: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#12464C', justifyContent: 'center', alignItems: 'center', marginBottom: 15, overflow: 'hidden', position: 'relative' },
  avatarImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  editPhotoOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 40, fontWeight: 'bold', color: '#FFF' },
  fullName: { fontSize: 22, fontWeight: 'bold', color: '#1A1A1A' },
  emailText: { fontSize: 14, color: '#888', marginTop: 4 },
  badgeVerified: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, backgroundColor: '#F0F7F7', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  badgeText: { fontSize: 12, fontWeight: 'bold', color: '#12464C' },
  sectionContainer: { paddingHorizontal: 20, marginBottom: 25 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#E0F2F1', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 15 },
  editText: { fontSize: 12, color: '#12464C', fontWeight: 'bold' },
  card: { backgroundColor: '#FFF', borderRadius: 20, padding: 20, elevation: 2 },
  inputRow: { flexDirection: 'row', paddingVertical: 5 },
  iconBox: { width: 35, marginTop: 10 },
  inputLabel: { fontSize: 11, color: '#999', marginBottom: 2 },
  valueText: { fontSize: 15, color: '#333', fontWeight: '600' },
  textInput: { fontSize: 15, color: '#333', borderBottomWidth: 1, borderBottomColor: '#12464C', paddingVertical: 5 },
  divider: { height: 1, backgroundColor: '#F0F0F0', marginVertical: 15 },
  editActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 20, gap: 12 },
  cancelBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, backgroundColor: '#F5F5F5' },
  saveBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, backgroundColor: '#12464C', minWidth: 100, alignItems: 'center' },
  saveText: { color: '#FFF', fontWeight: 'bold' },
  menuItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  menuLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  menuLabel: { fontSize: 15, fontWeight: '500', color: '#333' },
  logoutBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFEBEE', marginHorizontal: 20, paddingVertical: 16, borderRadius: 15, gap: 10, marginBottom: 30 },
  logoutText: { color: '#D32F2F', fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#FFF', borderRadius: 20, padding: 25, width: '85%' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
  modalInput: { borderWidth: 1, borderColor: '#EEE', borderRadius: 10, padding: 12, marginBottom: 20, backgroundColor: '#F9F9F9' },
  modalActions: { flexDirection: 'row', gap: 10 },
  modalBtnCancel: { flex: 1, padding: 12, alignItems: 'center', borderRadius: 10, backgroundColor: '#F5F5F5' },
  modalBtnConfirm: { flex: 1, padding: 12, alignItems: 'center', borderRadius: 10, backgroundColor: '#12464C' }
});