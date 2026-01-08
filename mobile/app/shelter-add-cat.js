import React, { useState } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TextInput, 
  TouchableOpacity, Image, ActivityIndicator, Alert, StatusBar 
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import api from '../src/services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ShelterAddCat() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  
  const [form, setForm] = useState({
    name: '', breed: '', age: '', gender: 'MALE', description: '',
    images: [],
    personality: [],
    health: []
  });

  const charOptions = ['Manja', 'Aktif', 'Tenang', 'Ramah', 'Penakut', 'Pintar'];
  const healthOptions = ['Sudah Steril', 'Sudah Vaksin', 'Obat Cacing', 'Bebas Kutu', 'Sehat'];

  const toggleTag = (type, value) => {
    const currentTags = [...form[type]];
    const index = currentTags.indexOf(value);
    if (index > -1) {
      currentTags.splice(index, 1);
    } else {
      currentTags.push(value);
    }
    setForm({ ...form, [type]: currentTags });
  };

  const pickImage = async () => {
    if (form.images.length >= 5) {
      Alert.alert("Maksimal", "Hanya boleh maksimal 5 foto.");
      return;
    }
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });
    if (!result.canceled) {
      setForm({ ...form, images: [...form.images, result.assets[0].uri] });
    }
  };

  const removeImage = (index) => {
    const newImages = [...form.images];
    newImages.splice(index, 1);
    setForm({ ...form, images: newImages });
  };

  const handleSave = async () => {
    if (!form.name || !form.breed || !form.age || form.images.length === 0) {
      Alert.alert("Peringatan", "Nama, Ras, Umur, dan minimal 1 foto wajib diisi.");
      return;
    }
    
    setSaving(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const formData = new FormData();
      formData.append('name', form.name);
      formData.append('breed', form.breed);
      formData.append('age', String(form.age));
      formData.append('gender', form.gender);
      formData.append('description', form.description);
      formData.append('personality', form.personality.join(','));
      formData.append('health', form.health.join(','));

      form.images.forEach((uri, index) => {
        const fileName = `cat_${Date.now()}_${index}.jpg`;
        const type = 'image/jpeg';
        formData.append('photos', { uri, name: fileName, type });
      });

      // Endpoint POST baru untuk simpan data
      await api.post('/data/cats', formData, {
        headers: { 
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}` 
        }
      });

      Alert.alert("Sukses", "Anabul baru berhasil didaftarkan! Menunggu persetujuan admin.", [
        { text: "OK", onPress: () => router.back() }
      ]);
    } catch (e) { 
      console.log("Add Cat Error:", e.response?.data || e.message);
      Alert.alert("Error", "Gagal mendaftarkan anabul."); 
    } finally { setSaving(false); }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
          <Feather name="x" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Daftarkan Anabul</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* UPLOAD SECTION */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Foto Anabul (Max 5)</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoList}>
            {form.images.map((uri, index) => (
              <View key={index} style={styles.photoWrapper}>
                <Image source={{ uri }} style={styles.imageItem} />
                <TouchableOpacity style={styles.removeBadge} onPress={() => removeImage(index)}>
                  <Feather name="trash-2" size={10} color="#FFF" />
                </TouchableOpacity>
              </View>
            ))}
            {form.images.length < 5 && (
              <TouchableOpacity style={styles.addPhotoBox} onPress={pickImage}>
                <View style={styles.addIconCircle}>
                    <Feather name="camera" size={24} color="#12464C" />
                </View>
                <Text style={styles.addPhotoText}>Tambah Foto</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>

        {/* DATA UTAMA */}
        <View style={styles.mainCard}>
          <Text style={styles.cardHeading}>Informasi Dasar</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nama Panggilan</Text>
            <TextInput 
              style={styles.input} 
              placeholder="Contoh: Meowy" 
              value={form.name} 
              onChangeText={(v) => setForm({...form, name: v})} 
            />
          </View>

          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 15 }}>
              <Text style={styles.label}>Jenis Ras</Text>
              <TextInput 
                style={styles.input} 
                placeholder="Persia / Domestik" 
                value={form.breed} 
                onChangeText={(v) => setForm({...form, breed: v})} 
              />
            </View>
            <View style={{ width: 120 }}>
              <Text style={styles.label}>Umur (Bulan)</Text>
              <TextInput 
                style={styles.input} 
                placeholder="12" 
                value={form.age} 
                onChangeText={(v) => setForm({...form, age: v})} 
                keyboardType="numeric" 
              />
            </View>
          </View>

          <Text style={styles.label}>Jenis Kelamin</Text>
          <View style={styles.genderRow}>
            {['MALE', 'FEMALE'].map((g) => (
              <TouchableOpacity 
                key={g} 
                style={[styles.genderOption, form.gender === g && styles.activeGender]} 
                onPress={() => setForm({...form, gender: g})}
              >
                <Ionicons 
                  name={g === 'MALE' ? 'male' : 'female'} 
                  size={18} 
                  color={form.gender === g ? '#FFF' : '#999'} 
                />
                <Text style={[styles.genderText, form.gender === g && styles.activeGenderText]}>
                  {g === 'MALE' ? 'Jantan' : 'Betina'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* KARAKTER & KESEHATAN */}
        <View style={styles.mainCard}>
           <Text style={styles.cardHeading}>Karakteristik & Kesehatan</Text>
           
           <Text style={styles.subLabel}>Sifat Anabul</Text>
           <View style={styles.tagWrapper}>
            {charOptions.map(tag => (
              <TouchableOpacity 
                key={tag} 
                style={[styles.tagChip, form.personality.includes(tag) && styles.tagChipActive]}
                onPress={() => toggleTag('personality', tag)}
              >
                <Text style={[styles.tagText, form.personality.includes(tag) && styles.tagTextActive]}>{tag}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.subLabel, { marginTop: 20 }]}>Kondisi Medis</Text>
          <View style={styles.tagWrapper}>
            {healthOptions.map(tag => (
              <TouchableOpacity 
                key={tag} 
                style={[styles.tagChip, form.health.includes(tag) && styles.tagChipActive]}
                onPress={() => toggleTag('health', tag)}
              >
                <Text style={[styles.tagText, form.health.includes(tag) && styles.tagTextActive]}>{tag}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* DESKRIPSI */}
        <View style={styles.mainCard}>
          <Text style={styles.cardHeading}>Tentang Anabul</Text>
          <TextInput 
            style={[styles.input, styles.textArea]} 
            placeholder="Ceritakan kepribadian uniknya atau latar belakang penyelamatannya..." 
            value={form.description} 
            onChangeText={(v) => setForm({...form, description: v})} 
            multiline 
          />
        </View>

      </ScrollView>

      {/* FOOTER ACTION */}
      <View style={styles.footer}>
        <TouchableOpacity 
            style={[styles.saveBtn, saving && { opacity: 0.7 }]} 
            onPress={handleSave} 
            disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Text style={styles.saveBtnText}>Daftarkan Sekarang</Text>
              <Feather name="arrow-right" size={20} color="#FFF" />
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, backgroundColor: '#FFF' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#1A1A1A' },
  closeBtn: { padding: 5 },
  scrollContent: { paddingBottom: 120 },
  section: { paddingVertical: 20, backgroundColor: '#FFF', marginBottom: 10 },
  sectionLabel: { fontSize: 13, fontWeight: 'bold', color: '#999', marginLeft: 20, marginBottom: 15, textTransform: 'uppercase' },
  photoList: { paddingLeft: 20 },
  photoWrapper: { 
    marginRight: 15, 
    marginTop: 10, // Kasih space dikit di atas biar badge nggak mepet banget ke label
    position: 'relative',
  },
  imageItem: { 
    width: 120, 
    height: 120, 
    borderRadius: 20, 
    backgroundColor: '#EEE' 
  },
  removeBadge: { 
    position: 'absolute', 
    top: -8, // Geser naik dikit biar kelihatan melayang
    right: -8, // Geser ke kanan dikit biar keluar dari border foto
    backgroundColor: '#E76F51', 
    width: 28, 
    height: 28, 
    borderRadius: 14, 
    justifyContent: 'center', 
    alignItems: 'center', 
    elevation: 5, // Biar ada shadow di Android
    shadowColor: '#000', // Biar ada shadow di iOS
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    zIndex: 10,
    borderWidth: 2, // Tambahin border putih biar lebih kontras
    borderColor: '#FFF'
  },
  addPhotoBox: { width: 120, height: 120, marginTop: 10, borderRadius: 20, borderStyle: 'dashed', borderWidth: 2, borderColor: '#D1E5E5', justifyContent: 'center', alignItems: 'center', backgroundColor: '#F0F7F7' },
  addIconCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', marginBottom: 8, elevation: 2 },
  addPhotoText: { fontSize: 11, fontWeight: 'bold', color: '#12464C' },
  mainCard: { backgroundColor: '#FFF', marginHorizontal: 20, padding: 20, borderRadius: 24, marginBottom: 15, elevation: 1 },
  cardHeading: { fontSize: 16, fontWeight: 'bold', color: '#12464C', marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '700', color: '#444', marginBottom: 8 },
  inputGroup: { marginBottom: 15 },
  input: { backgroundColor: '#F9F9F9', borderWidth: 1, borderColor: '#F0F0F0', borderRadius: 14, padding: 14, fontSize: 15, color: '#333' },
  row: { flexDirection: 'row', marginBottom: 15 },
  genderRow: { flexDirection: 'row', gap: 12 },
  genderOption: { flex: 1, flexDirection: 'row', padding: 14, borderRadius: 14, borderWidth: 1.5, borderColor: '#EEE', alignItems: 'center', justifyContent: 'center', gap: 8 },
  activeGender: { backgroundColor: '#12464C', borderColor: '#12464C' },
  genderText: { fontSize: 14, fontWeight: 'bold', color: '#888' },
  activeGenderText: { color: '#FFF' },
  subLabel: { fontSize: 12, fontWeight: 'bold', color: '#999', marginBottom: 10 },
  tagWrapper: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tagChip: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: '#EEE', backgroundColor: '#F9F9F9' },
  tagChipActive: { backgroundColor: '#12464C', borderColor: '#12464C' },
  tagText: { fontSize: 13, color: '#666', fontWeight: '600' },
  tagTextActive: { color: '#FFF' },
  textArea: { height: 120, textAlignVertical: 'top' },
  footer: { position: 'absolute', bottom: 0, width: '100%', padding: 20, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#EEE' },
  saveBtn: { backgroundColor: '#12464C', height: 56, borderRadius: 18, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, elevation: 4 },
  saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' }
});