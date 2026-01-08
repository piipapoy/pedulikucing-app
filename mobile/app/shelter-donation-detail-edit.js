import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, 
  Image, ActivityIndicator, Alert, Dimensions 
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import api from '../src/services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

export default function ShelterDonationDetailEdit() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('edit'); // 'edit' atau 'kabar'

  const [form, setForm] = useState({ title: '', target: '', deadline: new Date(), description: '', imageUrl: '' });
  const [showPicker, setShowPicker] = useState(false);
  const [updateForm, setUpdateForm] = useState({ title: '', description: '' });

  useEffect(() => { fetchDetail(); }, [id]);

  const fetchDetail = async () => {
    try {
      const res = await api.get(`/data/campaigns/${id}`);
      const c = res.data;
      setForm({
        title: c.title,
        target: c.targetAmount.toString(),
        deadline: new Date(c.deadline),
        description: c.description,
        imageUrl: c.imageUrl,
        currentAmount: c.currentAmount
      });
    } catch (e) { Alert.alert("Error", "Gagal ambil data"); }
    finally { setLoading(false); }
  };

  const resolveImageUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('http') || path.startsWith('file')) return path;
    const baseUrl = api.defaults.baseURL.replace(/\/api\/?$/, '');
    return `${baseUrl}${path.replace(/\\/g, '/')}`;
  };

  const handleUpdateCampaign = async () => {
    setSaving(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const formData = new FormData();
      formData.append('title', form.title);
      formData.append('targetAmount', form.target);
      formData.append('deadline', form.deadline.toISOString());
      formData.append('description', form.description);
      if (form.imageUrl.startsWith('file')) {
        formData.append('image', { uri: form.imageUrl, name: 'update.jpg', type: 'image/jpeg' });
      }

      await api.put(`/data/campaigns/${id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${token}` }
      });
      Alert.alert("Sukses", "Data campaign diperbarui!");
      router.back();
    } catch (e) { Alert.alert("Error", "Gagal update"); }
    finally { setSaving(false); }
  };

  const handleAddUpdate = async () => {
    if (!updateForm.title || !updateForm.description) return Alert.alert("Peringatan", "Isi semua field kabar.");
    setSaving(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      await api.post(`/data/campaigns/${id}/updates`, updateForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      Alert.alert("Sukses", "Kabar terbaru berhasil dikirim!");
      setUpdateForm({ title: '', description: '' });
      setActiveTab('edit');
    } catch (e) { Alert.alert("Error", "Gagal kirim kabar."); }
    finally { setSaving(false); }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#12464C" /></View>;

  const percent = Math.round((form.currentAmount / parseInt(form.target)) * 100);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Feather name="arrow-left" size={24} color="#333" /></TouchableOpacity>
        <Text style={styles.headerTitle}>Manajemen Campaign</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.tabBar}>
        <TouchableOpacity style={[styles.tab, activeTab === 'edit' && styles.activeTab]} onPress={() => setActiveTab('edit')}>
          <Text style={[styles.tabText, activeTab === 'edit' && styles.activeTabText]}>Edit Data</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'kabar' && styles.activeTab]} onPress={() => setActiveTab('kabar')}>
          <Text style={[styles.tabText, activeTab === 'kabar' && styles.activeTabText]}>Tambah Kabar</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        {activeTab === 'edit' ? (
          <>
            {/* PROGRESS CARD */}
            <View style={styles.mainCard}>
                <Text style={styles.cardHeading}>Progres Dana</Text>
                <View style={styles.progressRow}>
                    <Text style={styles.progressVal}>Rp {form.currentAmount.toLocaleString()}</Text>
                    <Text style={styles.progressTarget}> / Rp {parseInt(form.target).toLocaleString()}</Text>
                </View>
                <View style={styles.barBg}><View style={[styles.barFill, { width: `${percent > 100 ? 100 : percent}%` }]} /></View>
                <Text style={styles.percentText}>{percent}% Terkumpul</Text>
            </View>

            <TouchableOpacity style={styles.imageCard} onPress={async () => {
                let res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [16, 9], quality: 0.7 });
                if (!res.canceled) setForm({ ...form, imageUrl: res.assets[0].uri });
            }}>
              <Image source={{ uri: resolveImageUrl(form.imageUrl) }} style={styles.fullImg} />
              <View style={styles.editImgBadge}><Feather name="camera" size={16} color="#FFF" /></View>
            </TouchableOpacity>

            <View style={styles.mainCard}>
              <Text style={styles.label}>Judul Campaign</Text>
              <TextInput style={styles.input} value={form.title} onChangeText={v => setForm({ ...form, title: v })} />
              
              <Text style={styles.label}>Target Dana (Rp)</Text>
              <TextInput style={styles.input} keyboardType="numeric" value={form.target} onChangeText={v => setForm({ ...form, target: v })} />
              
              <Text style={styles.label}>Deadline</Text>
              <TouchableOpacity style={styles.input} onPress={() => setShowPicker(true)}>
                <Text>{form.deadline.toLocaleDateString('id-ID')}</Text>
              </TouchableOpacity>
              {showPicker && <DateTimePicker value={form.deadline} mode="date" onChange={(e, d) => { setShowPicker(false); if (d) setForm({ ...form, deadline: d }); }} />}
            </View>

            <View style={styles.mainCard}>
              <Text style={styles.label}>Deskripsi Cerita</Text>
              <TextInput style={[styles.input, { height: 150, textAlignVertical: 'top' }]} multiline value={form.description} onChangeText={v => setForm({ ...form, description: v })} />
            </View>
          </>
        ) : (
          <View style={styles.mainCard}>
            <Text style={styles.cardHeading}>Beri Kabar ke Donatur</Text>
            <Text style={styles.helperText}>Laporkan penggunaan dana atau kondisi terbaru kucing di sini.</Text>
            
            <Text style={styles.label}>Judul Kabar</Text>
            <TextInput style={styles.input} placeholder="Contoh: Pembelian Obat & Vitamin" value={updateForm.title} onChangeText={v => setUpdateForm({ ...updateForm, title: v })} />
            
            <Text style={styles.label}>Isi Laporan</Text>
            <TextInput style={[styles.input, { height: 200, textAlignVertical: 'top' }]} multiline placeholder="Tulis progres detail di sini..." value={updateForm.description} onChangeText={v => setUpdateForm({ ...updateForm, description: v })} />
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.btnPrimary} onPress={activeTab === 'edit' ? handleUpdateCampaign : handleAddUpdate} disabled={saving}>
          {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnText}>{activeTab === 'edit' ? 'Simpan Perubahan' : 'Kirim Kabar'}</Text>}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, backgroundColor: '#FFF' },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  tabBar: { flexDirection: 'row', backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#EEE' },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 15 },
  activeTab: { borderBottomWidth: 3, borderBottomColor: '#12464C' },
  tabText: { color: '#999', fontWeight: 'bold' },
  activeTabText: { color: '#12464C' },
  mainCard: { backgroundColor: '#FFF', marginHorizontal: 20, marginTop: 20, padding: 20, borderRadius: 24, elevation: 1 },
  imageCard: { marginHorizontal: 20, marginTop: 20, height: 180, borderRadius: 24, overflow: 'hidden', backgroundColor: '#EEE' },
  fullImg: { width: '100%', height: '100%', resizeMode: 'cover' },
  editImgBadge: { position: 'absolute', bottom: 15, right: 15, backgroundColor: 'rgba(0,0,0,0.6)', padding: 10, borderRadius: 15 },
  cardHeading: { fontSize: 16, fontWeight: 'bold', color: '#12464C', marginBottom: 15 },
  progressRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 10 },
  progressVal: { fontSize: 18, fontWeight: 'bold', color: '#12464C' },
  progressTarget: { fontSize: 13, color: '#999' },
  barBg: { height: 10, backgroundColor: '#F0F0F0', borderRadius: 5, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: '#F4A261', borderRadius: 5 },
  percentText: { fontSize: 12, color: '#F4A261', fontWeight: 'bold', marginTop: 5 },
  label: { fontSize: 13, fontWeight: 'bold', color: '#12464C', marginBottom: 8, marginTop: 15 },
  input: { backgroundColor: '#F9F9F9', borderRadius: 14, padding: 14, fontSize: 15, borderWidth: 1, borderColor: '#F0F0F0', justifyContent: 'center' },
  helperText: { fontSize: 12, color: '#666', marginBottom: 20, lineHeight: 18 },
  footer: { position: 'absolute', bottom: 0, width: '100%', padding: 20, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#EEE' },
  btnPrimary: { backgroundColor: '#12464C', height: 56, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  btnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' }
});