import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Image, ActivityIndicator, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker'; // 🔥 Library baru
import api from '../src/services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ShelterAddDonation() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [image, setImage] = useState(null);
  const [date, setDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  
  const [form, setForm] = useState({ 
    title: '', 
    target: '', 
    description: '' 
  });

  const onDateChange = (event, selectedDate) => {
    setShowPicker(false);
    if (selectedDate) setDate(selectedDate);
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({ 
      mediaTypes: ImagePicker.MediaTypeOptions.Images, 
      allowsEditing: true, 
      aspect: [16, 9], 
      quality: 0.7 
    });
    if (!result.canceled) setImage(result.assets[0].uri);
  };

  const handleSave = async () => {
    if (!form.title || !form.target || !image) {
      Alert.alert("Peringatan", "Judul, Target, dan Foto wajib diisi.");
      return;
    }
    setSaving(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const formData = new FormData();
      formData.append('title', form.title);
      formData.append('targetAmount', form.target);
      // Kirim format ISO untuk diparsing backend
      formData.append('deadline', date.toISOString()); 
      formData.append('description', form.description);
      formData.append('image', { 
        uri: image, 
        name: 'campaign.jpg', 
        type: 'image/jpeg' 
      });

      await api.post('/data/campaigns', formData, {
        headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${token}` }
      });
      Alert.alert("Sukses", "Campaign diajukan ke admin.", [{ text: "OK", onPress: () => router.back() }]);
    } catch (e) {
      Alert.alert("Error", "Gagal mengirim data.");
    } finally { setSaving(false); }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Feather name="x" size={24} color="#333" /></TouchableOpacity>
        <Text style={styles.headerTitle}>Buat Campaign</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        <TouchableOpacity style={styles.uploadBox} onPress={pickImage}>
          {image ? <Image source={{ uri: image }} style={styles.fullImg} /> : (
            <View style={styles.uploadPlaceholder}>
              <MaterialCommunityIcons name="image-plus" size={50} color="#CCC" />
              <Text style={styles.uploadText}>Unggah Foto Cover (16:9)</Text>
            </View>
          )}
        </TouchableOpacity>

        <View style={styles.mainCard}>
          <Text style={styles.label}>Judul Campaign</Text>
          <TextInput 
            style={styles.input} 
            placeholder="Contoh: Renovasi Kandang Kucing" 
            value={form.title} 
            onChangeText={v => setForm({ ...form, title: v })} 
          />
          
          <Text style={styles.label}>Target Dana (Rp)</Text>
          <TextInput 
            style={styles.input} 
            placeholder="Contoh: 5000000" 
            keyboardType="numeric" 
            value={form.target} 
            onChangeText={v => setForm({ ...form, target: v })} 
          />
          
          <Text style={styles.label}>Batas Waktu</Text>
          <TouchableOpacity style={styles.dateSelector} onPress={() => setShowPicker(true)}>
            <Feather name="calendar" size={18} color="#12464C" />
            <Text style={styles.dateValue}>{date.toLocaleDateString('id-ID')}</Text>
          </TouchableOpacity>

          {showPicker && (
            <DateTimePicker
              value={date}
              mode="date"
              display="calendar"
              minimumDate={new Date()}
              onChange={onDateChange}
            />
          )}
        </View>

        <View style={styles.mainCard}>
          <Text style={styles.label}>Detail Cerita</Text>
          <TextInput 
            style={[styles.input, styles.textArea]} 
            multiline 
            placeholder="Jelaskan tujuan penggalangan dana ini secara detail..." 
            value={form.description} 
            onChangeText={v => setForm({ ...form, description: v })} 
          />
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.btnPrimary} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnText}>Ajukan Campaign</Text>}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, backgroundColor: '#FFF' },
  headerTitle: { fontSize: 18, fontWeight: '800' },
  uploadBox: { width: '100%', height: 210, backgroundColor: '#FFF', borderBottomWidth: 1, borderColor: '#EEE', justifyContent: 'center', alignItems: 'center' },
  uploadPlaceholder: { alignItems: 'center' },
  uploadText: { color: '#AAA', fontSize: 12, marginTop: 10, fontWeight: '600' },
  fullImg: { width: '100%', height: '100%', resizeMode: 'cover' },
  mainCard: { backgroundColor: '#FFF', marginHorizontal: 20, marginTop: 20, padding: 20, borderRadius: 24, elevation: 1 },
  label: { fontSize: 13, fontWeight: 'bold', color: '#12464C', marginBottom: 8 },
  input: { backgroundColor: '#F9F9F9', borderRadius: 14, padding: 14, fontSize: 15, borderWidth: 1, borderColor: '#F0F0F0' },
  dateSelector: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9F9F9', padding: 14, borderRadius: 14, gap: 10, borderWidth: 1, borderColor: '#F0F0F0' },
  dateValue: { fontSize: 15, color: '#333', fontWeight: '500' },
  textArea: { height: 150, textAlignVertical: 'top' },
  footer: { position: 'absolute', bottom: 0, width: '100%', padding: 20, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#EEE' },
  btnPrimary: { backgroundColor: '#12464C', height: 56, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  btnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' }
});