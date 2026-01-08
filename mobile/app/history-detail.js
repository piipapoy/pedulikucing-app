import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Linking } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import api from '../src/services/api';
import { useVideoPlayer, VideoView } from 'expo-video';

export default function HistoryDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const item = JSON.parse(params.data); 
  const type = params.type;

  // --- LOGIC GAMBAR CERDAS (Sama dengan history.js) ---
  const resolveImageUrl = (rawPath) => {
    if (!rawPath) return null;
    if (rawPath.startsWith('http')) return rawPath;
    const baseUrl = api.defaults.baseURL.replace(/\/api\/?$/, ''); 
    const cleanPath = rawPath.trim().replace(/\\/g, '/');
    return `${baseUrl}${cleanPath.startsWith('/') ? '' : '/'}${cleanPath}`;
  };

const VideoSection = ({ videoUrl, styles }) => {
  const player = useVideoPlayer(videoUrl, (player) => {
    player.loop = false;
  });

  return (
    <View style={{ marginTop: 10 }}>
      <Text style={styles.sectionTitle}>Video Bukti</Text>
      <VideoView
        style={styles.videoPlayer}
        player={player}
        // GANTI INI: Pakai fullscreenOptions sesuai warning
        fullscreenOptions={{
          allowsVideoFrameSelection: true,
        }}
        allowsPictureInPicture
      />
    </View>
  );
};

  const getStatusStyle = (status) => {
    switch (status) {
      case 'PENDING': return { bg: '#FFF3E0', text: '#EF6C00', label: 'Menunggu' };
      case 'ON_PROCESS': return { bg: '#E3F2FD', text: '#1976D2', label: 'Diproses' };
      case 'RESCUED': return { bg: '#E8F5E9', text: '#2E7D32', label: 'Selesai' };
      case 'APPROVED': return { bg: '#E8F5E9', text: '#2E7D32', label: 'Disetujui' };
      case 'SUCCESS': return { bg: '#E8F5E9', text: '#2E7D32', label: 'Berhasil' };
      default: return { bg: '#F5F5F5', text: '#666', label: status };
    }
  };

  const status = getStatusStyle(item.status);

  // --- PAKAI RESOLVER DISINI ---
  let displayImg = null;
  if (type === 'laporan') {
    const firstImg = item.imageUrl?.split(',')[0]?.trim();
    displayImg = resolveImageUrl(firstImg);
  } else if (type === 'adopsi' && item.cat?.images) {
    displayImg = resolveImageUrl(item.cat.images.split(',')[0]);
  } else if (type === 'donasi' && item.campaign?.imageUrl) {
    displayImg = resolveImageUrl(item.campaign.imageUrl);
  }

  const imageSource = displayImg ? { uri: displayImg } : { uri: 'https://via.placeholder.com/400' };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Feather name="chevron-left" size={28} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Detail Riwayat</Text>
        <TouchableOpacity style={styles.iconBtn}><Feather name="share-2" size={22} color="#333" /></TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        <Image source={imageSource} style={styles.mainImage} />

        <View style={styles.content}>
          <View style={styles.statusRow}>
            <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
              <Text style={[styles.statusText, { color: status.text }]}>{status.label}</Text>
            </View>
            <Text style={styles.dateText}>{new Date(item.createdAt).toLocaleString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</Text>
          </View>

{/* --- BAGIAN TYPE ADOPSI --- */}
{type === 'adopsi' && (
  <View>
    <Text style={styles.mainTitle}>Pengajuan Adopsi: {item.cat?.name}</Text>
    
    <View style={styles.catInfoGrid}>
      <View style={styles.infoCard}><Text style={styles.infoVal}>{item.cat?.gender}</Text><Text style={styles.infoLabel}>Gender</Text></View>
      <View style={styles.infoCard}><Text style={styles.infoVal}>{item.cat?.age} Bln</Text><Text style={styles.infoLabel}>Usia</Text></View>
      <View style={styles.infoCard}><Text style={styles.infoVal}>{item.cat?.breed}</Text><Text style={styles.infoLabel}>Ras</Text></View>
    </View>

    <Text style={styles.sectionTitle}>Detail Shelter</Text>
    <TouchableOpacity 
      style={styles.shelterCardHistory} 
      activeOpacity={0.7}
      onPress={() => {
        if (item.cat?.shelterId) {
          router.push({ 
            pathname: '/shelter-detail', 
            params: { id: item.cat.shelterId } 
          });
        }
      }}
    >
      <Image 
        source={{
          uri: item.cat?.shelter?.photoProfile 
            ? resolveImageUrl(item.cat.shelter.photoProfile) 
            : resolveImageUrl(item.cat?.shelter?.shelterPhotos?.split(',')[0])
        }} 
    style={styles.shelterImgSmall}
      />
      <View style={{ flex: 1, marginLeft: 15 }}>
        <Text style={styles.shelterNameText}>{item.cat?.shelter?.name || 'Shelter Peduli'}</Text>
        <View style={styles.locRowSmall}>
          <Feather name="map-pin" size={10} color="#777" />
          <Text style={styles.shelterSubText} numberOfLines={1}>
            {item.cat?.shelter?.shelterAddress || 'Lokasi Shelter'}
          </Text>
        </View>
      </View>
      <Feather name="chevron-right" size={20} color="#CCC" />
    </TouchableOpacity>

    <Text style={styles.sectionTitle}>Data Pengajuan Anda</Text>
    <View style={styles.dataCard}>
      <View style={styles.dataRow}><Feather name="briefcase" size={16} color="#999" /><Text style={styles.dataText}>Pekerjaan: {item.job}</Text></View>
      <View style={styles.dataRow}><Feather name="home" size={16} color="#999" /><Text style={styles.dataText}>Status Rumah: {item.homeStatus}</Text></View>
      <View style={styles.dataRow}><Feather name="users" size={16} color="#999" /><Text style={styles.dataText}>Tinggal Bersama: {item.stayingWith}</Text></View>
    </View>

    <Text style={styles.sectionTitle}>Alasan Anda</Text>
    <View style={styles.messageCardContainer}>
      <View style={styles.quoteDecoration}>
        <FontAwesome5 name="quote-left" size={14} color="#417D7A" />
      </View>
      <Text style={styles.premiumQuoteText}>"{item.reason}"</Text>
      <View style={[styles.quoteDecoration, { alignSelf: 'flex-end' }]}>
        <FontAwesome5 name="quote-right" size={14} color="#417D7A" />
      </View>
    </View>

    <Text style={styles.sectionTitle}>Rencana Jika Pindah</Text>
    <Text style={styles.description}>{item.movingPlan}</Text>

    <Text style={styles.sectionTitle}>Proses Selanjutnya</Text>
    <View style={styles.progressBox}>
      <View style={styles.stepRow}><View style={styles.stepNumBox}><Text style={styles.stepNumTxt}>1</Text></View><View style={styles.stepContent}><Text style={styles.stepTitle}>Review Pengajuan</Text><Text style={styles.stepDesc}>Tim shelter meninjau profil Anda.</Text></View></View>
      <View style={styles.stepRow}><View style={styles.stepNumBox}><Text style={styles.stepNumTxt}>2</Text></View><View style={styles.stepContent}><Text style={styles.stepTitle}>Wawancara</Text><Text style={styles.stepDesc}>Sesi tanya jawab via video call.</Text></View></View>
    </View>
  </View>
)}

{type === 'laporan' && (
  <View>
    <Text style={styles.mainTitle}>{item.conditionTags}</Text>
    
    <Text style={styles.sectionTitle}>Foto Kondisi TKP</Text>
<ScrollView 
  horizontal 
  showsHorizontalScrollIndicator={false} 
  style={{ marginVertical: 10 }}
  contentContainerStyle={{ paddingLeft: 5 }} // Tambahan padding
>
  {item.imageUrl?.split(',')
    .map(img => img.trim()) 
    .filter(img => img.length > 10) 
    .map((img, idx) => (
      <Image 
        key={idx} 
        source={{ uri: resolveImageUrl(img) }} 
        style={{ width: 280, height: 180, borderRadius: 20, marginRight: 15, backgroundColor: '#EEE' }} 
      />
  ))}
</ScrollView>

    {/* VIDEO PREVIEW (Pakai expo-video) */}
    {item.videoUrl && (
      <VideoSection videoUrl={resolveImageUrl(item.videoUrl)} styles={styles} />
    )}

    <View style={[styles.infoBox, { marginTop: 20 }]}>
      <Feather name="map-pin" size={16} color="#12464C" />
      <Text style={styles.infoText}>{item.address}</Text>
    </View>

    <View style={styles.coordRowSmall}>
       <Text style={styles.coordTextSmall}>GPS: {item.latitude}, {item.longitude}</Text>
    </View>

    <Text style={styles.sectionTitle}>Deskripsi Kondisi</Text>
    <Text style={styles.description}>{item.description || 'Tidak ada deskripsi tambahan.'}</Text>
  </View>
)}

          {type === 'donasi' && (
  <View>
    <Text style={styles.title}>Donasi Berhasil</Text>
    
    <View style={styles.donationAmountBox}>
      <Text style={styles.amountLabel}>Jumlah Donasi</Text>
      <Text style={styles.amountValue}>Rp {parseInt(item.amount).toLocaleString('id-ID')}</Text>
    </View>

    <Text style={styles.sectionTitle}>Pesan & Doa Anda</Text>
    <View style={styles.messageCardContainer}>
      <View style={styles.quoteDecoration}>
        <FontAwesome5 name="quote-left" size={14} color="#417D7A" />
      </View>
      <Text style={styles.premiumQuoteText}>
        {item.message ? item.message : "Semoga bantuan ini bermanfaat bagi anabul yang membutuhkan dan menjadi berkah untuk kita semua."}
      </Text>
      <View style={[styles.quoteDecoration, { alignSelf: 'flex-end' }]}>
        <FontAwesome5 name="quote-right" size={14} color="#417D7A" />
      </View>
    </View>

    <Text style={styles.sectionTitle}>Detail Campaign</Text>
    <Text style={styles.description}>{item.campaign?.title}</Text>

    <Text style={styles.sectionTitle}>Disalurkan Ke</Text>
    {/* Card Shelter Donasi: Sekarang ambil dari item.campaign.shelter */}
    <TouchableOpacity 
      style={styles.shelterCardHistory} 
      activeOpacity={0.7}
      onPress={() => {
        if (item.campaign?.shelterId) {
          router.push({ 
            pathname: '/shelter-detail', 
            params: { id: item.campaign.shelterId } 
          });
        }
      }}
    >
      <Image 
        source={{ 
          uri: item.campaign?.shelter?.shelterPhotos 
            ? resolveImageUrl(item.campaign.shelter.shelterPhotos.split(',')[0]) 
            : `https://ui-avatars.com/api/?name=${item.campaign?.shelter?.name || 'S'}&background=1A3C40&color=fff`
        }} 
        style={styles.shelterImgSmall} 
      />
      <View style={{ flex: 1, marginLeft: 15 }}>
        <Text style={styles.shelterNameText}>{item.campaign?.shelter?.name || 'Shelter Peduli'}</Text>
        <View style={styles.locRowSmall}>
          <Feather name="map-pin" size={10} color="#777" />
          <Text style={styles.shelterSubText} numberOfLines={1}>
            {item.campaign?.shelter?.shelterAddress || 'Lokasi Shelter'}
          </Text>
        </View>
      </View>
      <Feather name="chevron-right" size={20} color="#CCC" />
    </TouchableOpacity>
  </View>
)}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FBFBFB' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 15, height: 60, backgroundColor: '#FFF' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  iconBtn: { width: 45, height: 45, justifyContent: 'center', alignItems: 'center' },
  mainImage: { width: '100%', height: 300, resizeMode: 'cover' },
  content: { padding: 25, marginTop: -30, backgroundColor: '#FBFBFB', borderTopLeftRadius: 30, borderTopRightRadius: 30 },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  statusText: { fontSize: 12, fontWeight: 'bold' },
  dateText: { fontSize: 12, color: '#999' },
  mainTitle: { fontSize: 24, fontWeight: '800', color: '#12464C', marginBottom: 15 },
  catInfoGrid: { flexDirection: 'row', gap: 10, marginBottom: 25 },
  infoCard: { flex: 1, backgroundColor: '#FFF', padding: 15, borderRadius: 16, alignItems: 'center', elevation: 2 },
  infoVal: { fontSize: 14, fontWeight: 'bold', color: '#12464C' },
  infoLabel: { fontSize: 10, color: '#999', marginTop: 4 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginTop: 25, marginBottom: 12 },
  shelterBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 15, borderRadius: 16, elevation: 2 },
  shelterIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F0F7F7', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  shelterName: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  shelterAddr: { fontSize: 12, color: '#777', marginTop: 2 },
  dataCard: { backgroundColor: '#FFF', padding: 20, borderRadius: 20, elevation: 2 },
  dataRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  dataText: { fontSize: 14, color: '#555' },
  quoteCard: { backgroundColor: '#F0F7F7', padding: 20, borderRadius: 16, borderLeftWidth: 5, borderLeftColor: '#12464C' },
  quoteText: { fontStyle: 'italic', color: '#12464C', lineHeight: 22 },
  description: { fontSize: 14, color: '#666', lineHeight: 22 },
  progressBox: { backgroundColor: '#E0F2F1', padding: 20, borderRadius: 20 },
  stepRow: { flexDirection: 'row', gap: 15, marginBottom: 15 },
  stepNumBox: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#12464C', justifyContent: 'center', alignItems: 'center' },
  stepNumTxt: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
  stepTitle: { fontSize: 14, fontWeight: 'bold', color: '#12464C' },
  stepDesc: { fontSize: 12, color: '#417D7A', marginTop: 2 },
  footer: { padding: 20, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#F0F0F0' },
  contactBtn: { backgroundColor: '#12464C', height: 55, borderRadius: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
  contactBtnText: { color: '#FFF', fontWeight: 'bold' },
  title: { fontSize: 22, fontWeight: 'bold', color: '#12464C', marginBottom: 10 },
  donationAmountBox: { backgroundColor: '#12464C', padding: 20, borderRadius: 15, alignItems: 'center', marginVertical: 10 },
  amountLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginBottom: 4 },
  amountValue: { color: '#FFF', fontSize: 24, fontWeight: 'bold' },
  infoBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0F7F7', padding: 12, borderRadius: 10, marginBottom: 20 },
  infoText: { marginLeft: 8, color: '#12464C', fontSize: 14, flex: 1 },
  messageCardContainer: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E0F2F1',
    shadowColor: '#417D7A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    marginVertical: 5
  },
  premiumQuoteText: {
    fontSize: 15,
    color: '#1A3C40',
    lineHeight: 24,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingHorizontal: 10,
    fontWeight: '500'
  },
  quoteDecoration: {
    opacity: 0.3,
    marginBottom: -5
  },

  // MODIFIKASI CARD SHELTER (Consistency with App Style)
  shelterCardHistory: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 15,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    marginBottom: 10
  },
  shelterImgSmall: {
    width: 50,
    height: 50,
    borderRadius: 15,
    backgroundColor: '#EEE'
  },
  shelterNameText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1A1A1A'
  },
  shelterSubText: {
    fontSize: 12,
    color: '#777',
    marginLeft: 4
  },
  locRowSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4
  },
  videoPlayer: {
    width: '100%',
    height: 200,
    borderRadius: 20,
    backgroundColor: '#000',
    marginTop: 10
  }
});