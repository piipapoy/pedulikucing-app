import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, ScrollView, 
  TextInput, ActivityIndicator, KeyboardAvoidingView, 
  Platform, Image, Modal, StatusBar, BackHandler 
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../src/services/api';

const CONDITION_TAGS = ['Luka Parah', 'Lemas/Sakit', 'Kecelakaan', 'Kucing Terancam', 'Induk & Anak'];

export default function LaporDaruratScreen() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [user, setUser] = useState(null);

  // Initial State untuk reset
  const initialFormState = {
    conditionTags: [],
    description: '',
    images: [], // Ganti dari image tunggal ke array
    video: null,
    address: '',
    latitude: null,
    longitude: null,
    reporterName: '',
    reporterPhone: ''
  };

  const [formData, setFormData] = useState(initialFormState);

  // RESET LOGIC: Setiap kali layar kehilangan fokus (user pindah menu), reset data
  useFocusEffect(
    useCallback(() => {
      // Pas masuk layar, ambil data user terbaru
      const getUser = async () => {
        const userData = await AsyncStorage.getItem('userData');
        if (userData) {
          const parsed = JSON.parse(userData);
          setUser(parsed);
          setFormData(prev => ({ 
            ...prev, 
            reporterName: parsed.name || '', 
            reporterPhone: parsed.phoneNumber || '' 
          }));
        }
      };
      getUser();

      return () => {
        // Pas keluar layar, balikkan ke step 1 dan kosongkan form
        setStep(1);
        setFormData(initialFormState);
      };
    }, [])
  );

  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
    else router.back();
  };

  const detectLocation = async () => {
    setLocating(true);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMessage('Akses lokasi diperlukan untuk akurasi penyelamatan.');
        setShowErrorModal(true);
        return;
      }
      let location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const { latitude, longitude } = location.coords;
      let reverseLoc = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (reverseLoc.length > 0) {
        const loc = reverseLoc[0];
        const readableAddr = `${loc.street || ''}, ${loc.district || ''}, ${loc.city || ''}`.replace(/^, /, '');
        setFormData(prev => ({ ...prev, latitude, longitude, address: readableAddr }));
      }
    } catch (e) {
      setErrorMessage('Gagal mengunci GPS. Pastikan GPS HP aktif.');
      setShowErrorModal(true);
    } finally {
      setLocating(false);
    }
  };

  const pickImages = async () => {
    if (formData.images.length >= 5) {
      setErrorMessage('Maksimal hanya 5 foto bukti.');
      setShowErrorModal(true);
      return;
    }
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: 5 - formData.images.length,
      quality: 0.4,
    });

    if (!result.canceled) {
      const newImages = result.assets.map(asset => asset.uri);
      setFormData(prev => ({ ...prev, images: [...prev.images, ...newImages].slice(0, 5) }));
    }
  };

  const pickVideo = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      allowsEditing: true,
      quality: 0.5,
    });

    if (!result.canceled) {
      const videoAsset = result.assets[0];
      // Limit 15MB sederhana (perkiraan)
      if (videoAsset.duration > 30000) { // Max 30 detik
         setErrorMessage('Durasi video maksimal 30 detik.');
         setShowErrorModal(true);
         return;
      }
      setFormData({ ...formData, video: videoAsset.uri });
    }
  };

  const removeImage = (index) => {
    const updated = formData.images.filter((_, i) => i !== index);
    setFormData({ ...formData, images: updated });
  };

  const handleNext = () => {
    if (step === 1) {
      if (formData.images.length < 3) {
        setErrorMessage('Harap unggah minimal 3 foto kondisi.');
        setShowErrorModal(true);
        return;
      }
      if (formData.conditionTags.length === 0) {
        setErrorMessage('Pilih minimal satu kategori kondisi.');
        setShowErrorModal(true);
        return;
      }
    }
    if (step === 2 && !formData.address) {
      setErrorMessage('Lokasi kejadian belum ditentukan.');
      setShowErrorModal(true);
      return;
    }
    setStep(step + 1);
  };

  const toggleTag = (tag) => {
    const updated = formData.conditionTags.includes(tag)
      ? formData.conditionTags.filter(t => t !== tag)
      : [...formData.conditionTags, tag];
    setFormData({ ...formData, conditionTags: updated });
  };

  const handleFinalSubmit = async () => {
    if (!formData.reporterName || !formData.reporterPhone) {
        setErrorMessage('Data pelapor harus lengkap untuk koordinasi.');
        setShowErrorModal(true);
        return;
    }

    setLoading(true);
    try {
        const token = await AsyncStorage.getItem('userToken');
        const data = new FormData();
        
        data.append('conditionTags', formData.conditionTags.join(', '));
        data.append('description', formData.description || '');
        data.append('address', formData.address);
        data.append('latitude', String(formData.latitude));
        data.append('longitude', String(formData.longitude));
        data.append('reporterName', formData.reporterName);
        data.append('reporterPhone', formData.reporterPhone);

        // Upload Multiple Images
        formData.images.forEach((uri, index) => {
          const uriParts = uri.split('.');
          const fileType = uriParts[uriParts.length - 1];
          data.append('image', {
            uri: uri,
            name: `report_img_${index}_${Date.now()}.${fileType}`,
            type: `image/${fileType === 'jpg' ? 'jpeg' : fileType}`,
          });
        });

        // Upload Video (Optional)
        if (formData.video) {
          const vUriParts = formData.video.split('.');
          const vType = vUriParts[vUriParts.length - 1];
          data.append('video', {
            uri: formData.video,
            name: `report_vid_${Date.now()}.${vType}`,
            type: `video/${vType}`,
          });
        }

        await api.post('/report/submit', data, {
            headers: {
                'Content-Type': 'multipart/form-data',
                Authorization: token ? `Bearer ${token}` : ''
            }
        });

        setLoading(false);
        setShowSuccessModal(true);
    } catch (error) {
        setLoading(false);
        const msg = error.response?.data?.message || 'Gagal terhubung ke server.';
        setErrorMessage(msg);
        setShowErrorModal(true);
    }
};

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.iconBtn}>
          <Feather name="chevron-left" size={28} color="#12464C" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Laporan Darurat</Text>
        <View style={{ width: 45 }} />
      </View>

      <View style={styles.stepperWrapper}>
        {[1, 2, 3].map((s) => (
          <View key={s} style={styles.stepIndicator}>
            <View style={[styles.stepDot, step >= s ? styles.dotActive : styles.dotInactive]}>
              {step > s ? <Feather name="check" size={14} color="#FFF" /> : <Text style={[styles.stepNum, step >= s && {color:'#FFF'}]}>{s}</Text>}
            </View>
            {s < 3 && <View style={[styles.stepLine, step > s ? styles.lineActive : styles.lineInactive]} />}
          </View>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {step === 1 && (
          <View>
            <Text style={styles.vibeTitle}>Ambil Bukti</Text>
            <Text style={styles.vibeDesc}>Unggah minimal 3 foto kondisi (Max 5). Video bersifat opsional.</Text>
            
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoGrid}>
              {formData.images.map((uri, index) => (
                <View key={index} style={styles.previewContainer}>
                  <Image source={{ uri }} style={styles.miniPreview} />
                  <TouchableOpacity style={styles.removeBadge} onPress={() => removeImage(index)}>
                    <Feather name="x" size={12} color="#FFF" />
                  </TouchableOpacity>
                </View>
              ))}
              {formData.images.length < 5 && (
                <TouchableOpacity style={styles.addPhotoBtn} onPress={pickImages}>
                  <Feather name="plus" size={30} color="#12464C" />
                  <Text style={styles.addText}>Foto</Text>
                </TouchableOpacity>
              )}
            </ScrollView>

            <TouchableOpacity style={styles.videoUploadBtn} onPress={pickVideo}>
                <Feather name={formData.video ? "check-circle" : "video"} size={20} color={formData.video ? "#2E7D32" : "#12464C"} />
                <Text style={[styles.videoBtnText, formData.video && {color: "#2E7D32"}]}>
                  {formData.video ? "Video Berhasil Ditambahkan" : "Unggah Video Pendek (Opsional)"}
                </Text>
            </TouchableOpacity>

            <Text style={styles.cardLabel}>KATEGORI KONDISI</Text>
            <View style={styles.tagGrid}>
              {CONDITION_TAGS.map(tag => (
                <TouchableOpacity key={tag} onPress={() => toggleTag(tag)} style={[styles.tagChip, formData.conditionTags.includes(tag) && styles.tagChipActive]}>
                  <Text style={[styles.tagText, formData.conditionTags.includes(tag) && {color:'#FFF'}]}>{tag}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {step === 2 && (
          <View>
            <Text style={styles.vibeTitle}>Lokasi Penemuan</Text>
            <Text style={styles.vibeDesc}>Gunakan fitur otomatis agar tim rescue tepat sasaran.</Text>
            <View style={styles.inputCard}>
              <View style={styles.addressContainer}>
                <View style={styles.pinWrapper}><Ionicons name="location" size={24} color="#12464C" /></View>
                <TextInput style={styles.addressInput} multiline value={formData.address} onChangeText={t => setFormData({...formData, address: t})} />
              </View>
              {formData.latitude && (
                <View style={styles.coordRow}>
                  <View style={styles.coordBadge}><Text style={styles.coordText}>Lat: {formData.latitude.toFixed(6)}</Text></View>
                  <View style={styles.coordBadge}><Text style={styles.coordText}>Long: {formData.longitude.toFixed(6)}</Text></View>
                </View>
              )}
              <TouchableOpacity style={styles.reDetectBtn} onPress={detectLocation} disabled={locating}>
                {locating ? <ActivityIndicator size="small" color="#12464C" /> : <><MaterialCommunityIcons name="target" size={18} color="#12464C" /><Text style={styles.reDetectText}>Dapatkan Lokasi Saya</Text></>}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {step === 3 && (
          <View>
            <Text style={styles.vibeTitle}>Data Terakhir</Text>
            <Text style={styles.vibeDesc}>Pastikan kontak Anda benar untuk koordinasi lapangan.</Text>
            <View style={styles.inputCard}>
              <View style={styles.field}>
                <Feather name="user" size={18} color="#12464C" style={styles.fieldIcon} />
                <TextInput style={styles.textInput} placeholder="Nama Lengkap" value={formData.reporterName} onChangeText={t => setFormData({...formData, reporterName: t})} />
              </View>
              <View style={styles.field}>
                <Feather name="phone" size={18} color="#12464C" style={styles.fieldIcon} />
                <TextInput style={styles.textInput} placeholder="WhatsApp Pelapor" keyboardType="phone-pad" value={formData.reporterPhone} onChangeText={t => setFormData({...formData, reporterPhone: t})} />
              </View>
              <View style={[styles.field, {height: 120, alignItems: 'flex-start', paddingTop: 15}]}>
                <Feather name="file-text" size={18} color="#12464C" style={[styles.fieldIcon, {marginTop: 4}]} />
                <TextInput style={[styles.textInput, {height: 100, paddingTop: 0}]} multiline placeholder="Catatan tambahan (opsional)" value={formData.description} onChangeText={t => setFormData({...formData, description: t})} textAlignVertical="top" />
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => step < 3 ? handleNext() : handleFinalSubmit()} disabled={loading}>
          {loading ? <ActivityIndicator color="#FFF" /> : (
            <><Text style={styles.primaryBtnText}>{step < 3 ? 'Lanjutkan' : 'Kirim Laporan'}</Text><Feather name="arrow-right" size={20} color="#FFF" /></>
          )}
        </TouchableOpacity>
      </View>

      <Modal animationType="fade" transparent visible={showSuccessModal} statusBarTranslucent>
        <View style={styles.modalOverlay}><View style={styles.modalContainer}><View style={styles.modalContent}>
              <View style={[styles.iconCircle, { backgroundColor: '#E8F5E9' }]}><Feather name="check-circle" size={40} color="#2E7D32" /></View>
              <Text style={styles.modalTitle}>Laporan Terkirim!</Text>
              <Text style={styles.modalDesc}>Data lokasi & bukti foto telah diterima tim penyelamat. Terima kasih!</Text>
              <TouchableOpacity style={styles.modalBtnPrimary} onPress={() => { setShowSuccessModal(false); router.replace('/home'); }}><Text style={{ color: '#FFF', fontWeight: 'bold' }}>Selesai</Text></TouchableOpacity>
        </View></View></View>
      </Modal>

      <Modal animationType="fade" transparent visible={showErrorModal} statusBarTranslucent>
        <View style={styles.modalOverlay}><View style={styles.modalContainer}><View style={styles.modalContent}>
                <View style={[styles.iconCircle, { backgroundColor: '#FFEBEE' }]}><Feather name="alert-circle" size={32} color="#D32F2F" /></View>
                <Text style={styles.modalTitle}>Periksa Kembali</Text>
                <Text style={styles.modalDesc}>{errorMessage}</Text>
                <TouchableOpacity style={styles.modalBtnSingle} onPress={() => setShowErrorModal(false)}><Text style={{color: '#666', fontWeight:'bold'}}>Tutup</Text></TouchableOpacity>
        </View></View></View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FBFBFB' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 15, height: 60, borderBottomWidth: 1, borderBottomColor: '#F0F0F0', backgroundColor: '#FFF' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#12464C' },
  iconBtn: { width: 45, height: 45, justifyContent: 'center', alignItems: 'center' },
  stepperWrapper: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 15, backgroundColor: '#FFF' },
  stepIndicator: { flexDirection: 'row', alignItems: 'center' },
  stepDot: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: '#EEE', backgroundColor: '#FFF' },
  dotActive: { backgroundColor: '#12464C', borderColor: '#12464C' },
  dotInactive: { backgroundColor: '#FFF' },
  stepNum: { fontSize: 11, fontWeight: 'bold', color: '#CCC' },
  stepLine: { width: 35, height: 2, marginHorizontal: 5 },
  lineActive: { backgroundColor: '#12464C' },
  lineInactive: { backgroundColor: '#EEE' },
  scrollContent: { padding: 25 },
  vibeTitle: { fontSize: 24, fontWeight: '900', color: '#12464C', marginBottom: 6 },
  vibeDesc: { fontSize: 14, color: '#666', marginBottom: 25, lineHeight: 20 },
  photoGrid: { flexDirection: 'row', marginBottom: 20 },
  previewContainer: { width: 120, height: 160, marginRight: 15, position: 'relative' },
  miniPreview: { width: '100%', height: '100%', borderRadius: 16 },
  removeBadge: { position: 'absolute', top: -5, right: -5, backgroundColor: '#D32F2F', width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center', elevation: 3 },
  addPhotoBtn: { width: 120, height: 160, backgroundColor: '#F0F7F7', borderRadius: 16, borderStyle: 'dashed', borderWidth: 2, borderColor: '#12464C', justifyContent: 'center', alignItems: 'center' },
  addText: { fontSize: 12, fontWeight: 'bold', color: '#12464C', marginTop: 5 },
  videoUploadBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF', padding: 15, borderRadius: 16, borderWidth: 1, borderColor: '#EEE', marginBottom: 25, gap: 10 },
  videoBtnText: { fontSize: 13, fontWeight: '700', color: '#12464C' },
  inputCard: { backgroundColor: '#FFF', padding: 20, borderRadius: 24, elevation: 4, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 15, marginBottom: 20 },
  cardLabel: { fontSize: 11, fontWeight: 'bold', color: '#999', marginBottom: 15, letterSpacing: 1.2 },
  field: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8F9FA', borderRadius: 16, paddingHorizontal: 15, marginBottom: 15, borderWidth: 1, borderColor: '#F0F0F0', minHeight: 55 },
  fieldIcon: { marginRight: 12 },
  textInput: { flex: 1, fontSize: 15, color: '#333', paddingVertical: Platform.OS === 'ios' ? 0 : 8 },
  addressContainer: { flexDirection: 'row', backgroundColor: '#F8F9FA', borderRadius: 16, borderWidth: 1, borderColor: '#F0F0F0', paddingHorizontal: 15, minHeight: 100, alignItems: 'flex-start' },
  pinWrapper: { height: 50, justifyContent: 'center', marginRight: 10 },
  addressInput: { flex: 1, paddingTop: 15, fontSize: 14, color: '#333', lineHeight: 20 },
  coordRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  coordBadge: { backgroundColor: '#E0F2F1', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  coordText: { fontSize: 10, color: '#12464C', fontWeight: '700' },
  reDetectBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-end', marginTop: 15, paddingVertical: 8, paddingHorizontal: 12, backgroundColor: '#E0F2F1', borderRadius: 10 },
  reDetectText: { fontSize: 12, color: '#12464C', fontWeight: '800' },
  tagGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  tagChip: { paddingHorizontal: 18, paddingVertical: 12, borderRadius: 14, backgroundColor: '#F0F0F0', borderWidth: 1, borderColor: '#E0E0E0' },
  tagChipActive: { backgroundColor: '#12464C', borderColor: '#12464C' },
  tagText: { fontSize: 13, color: '#666', fontWeight: '700' },
  footer: { paddingBottom: 45, paddingHorizontal: 20, paddingTop: 15, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#F0F0F0' },
  primaryBtn: { backgroundColor: '#12464C', height: 60, borderRadius: 20, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, elevation: 4 },
  primaryBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  modalContainer: { width: '85%', backgroundColor: '#FFF', borderRadius: 28, padding: 25 },
  modalContent: { alignItems: 'center' },
  iconCircle: { width: 70, height: 70, borderRadius: 35, backgroundColor: '#F0F7F7', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 10 },
  modalDesc: { fontSize: 14, color: '#777', textAlign: 'center', marginBottom: 25, lineHeight: 22 },
  modalBtnPrimary: { width: '100%', height: 55, borderRadius: 16, backgroundColor: '#12464C', justifyContent: 'center', alignItems: 'center' },
  modalBtnSingle: { width: '100%', height: 50, borderRadius: 16, backgroundColor: '#F5F5F5', justifyContent: 'center', alignItems: 'center' }
});