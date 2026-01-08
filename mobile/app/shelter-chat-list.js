import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, Text, StyleSheet, FlatList, TouchableOpacity, 
  Image, ActivityIndicator, RefreshControl 
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import api from '../src/services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ShelterChatList() {
  const router = useRouter();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [myId, setMyId] = useState(null);

  const fetchRooms = async () => {
    try {
      const storedId = await AsyncStorage.getItem('userId');
      setMyId(parseInt(storedId));
      
      const token = await AsyncStorage.getItem('userToken');
      const res = await api.get('/chat/rooms', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRooms(res.data);
    } catch (error) {
      console.log("Error fetch rooms:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchRooms(); }, []));

  const onRefresh = () => {
    setRefreshing(true);
    fetchRooms();
  };

  const resolveImageUrl = (rawPath) => {
    if (!rawPath) return 'https://ui-avatars.com/api/?name=User';
    if (rawPath.startsWith('http')) return rawPath;
    const baseUrl = api.defaults.baseURL.replace(/\/api\/?$/, '');
    return `${baseUrl}${rawPath.replace(/\\/g, '/')}`;
  };

  const renderRoom = ({ item }) => {
    // Cari data lawan bicara
    const opponent = item.userOneId === myId ? item.userTwo : item.userOne;
    const lastMsg = item.messages[0];

    return (
      <TouchableOpacity 
        style={styles.roomCard}
        onPress={() => router.push({
          pathname: '/chat-room',
          params: { roomId: item.id, name: opponent.name, avatar: opponent.photoProfile }
        })}
      >
        <Image source={{ uri: resolveImageUrl(opponent.photoProfile) }} style={styles.avatar} />
        <View style={styles.roomInfo}>
          <View style={styles.roomHeader}>
            <Text style={styles.userName} numberOfLines={1}>{opponent.name}</Text>
            <Text style={styles.timeText}>
              {lastMsg ? new Date(lastMsg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
            </Text>
          </View>
          <View style={styles.msgRow}>
            <Text style={styles.lastMsg} numberOfLines={1}>
              {lastMsg ? lastMsg.content : 'Belum ada pesan'}
            </Text>
            {lastMsg && !lastMsg.isRead && lastMsg.senderId !== myId && (
              <View style={styles.unreadDot} />
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pesan Masuk</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#12464C" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={rooms}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderRoom}
          contentContainerStyle={styles.listContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="message-off-outline" size={60} color="#DDD" />
              <Text style={styles.emptyText}>Belum ada percakapan aktif.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: { 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', 
    padding: 20, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#EEE' 
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1A1A1A' },
  backBtn: { width: 40 },
  listContainer: { paddingVertical: 10 },
  roomCard: { 
    flexDirection: 'row', padding: 15, backgroundColor: '#FFF', 
    marginHorizontal: 15, marginBottom: 10, borderRadius: 16,
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5
  },
  avatar: { width: 55, height: 55, borderRadius: 27.5, backgroundColor: '#EEE' },
  roomInfo: { flex: 1, marginLeft: 15, justifyContent: 'center' },
  roomHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  userName: { fontSize: 16, fontWeight: 'bold', color: '#333', flex: 1, marginRight: 10 },
  timeText: { fontSize: 11, color: '#999' },
  msgRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  lastMsg: { fontSize: 13, color: '#666', flex: 1 },
  unreadDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#C2185B', marginLeft: 10 },
  emptyContainer: { alignItems: 'center', marginTop: 100 },
  emptyText: { marginTop: 15, color: '#999', fontSize: 14 }
});