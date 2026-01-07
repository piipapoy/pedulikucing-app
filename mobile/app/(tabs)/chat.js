import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import api from '../../src/services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';

export default function ChatListScreen() {
  const router = useRouter();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [myId, setMyId] = useState(null);

  // Gunakan useFocusEffect supaya setiap kali tab Chat dibuka, data di-refresh
  useFocusEffect(
    useCallback(() => {
      fetchRooms();
    }, [])
  );

  const fetchRooms = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const userStr = await AsyncStorage.getItem('userData');
      const userData = JSON.parse(userStr);
      setMyId(userData.id);

      const res = await api.get('/chat/rooms', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRooms(res.data);
    } catch (e) {
      console.log("Fetch Rooms Error:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchRooms();
  };

const renderRoom = ({ item }) => {
  const isUserOneMe = item.userOneId === myId;
  const recipient = isUserOneMe ? item.userTwo : item.userOne;

  let contextLabel = "Pesan Pribadi";
  let contextColor = "#999";
  if (item.adoptionId) { contextLabel = "🐾 Adopsi"; contextColor = "#12464C"; }
  if (item.reportId) { contextLabel = "🚨 Laporan"; contextColor = "#C2185B"; }

  const getAvatar = (user) => {
    if (user?.photoProfile) {
      return { uri: `http://localhost:5000${user.photoProfile}` }; 
    }
    return { uri: `https://ui-avatars.com/api/?name=${user?.name || 'User'}&backgroundColor=12464C&color=fff` }; 
  };

  return (
    <TouchableOpacity 
      style={styles.roomCard}
      onPress={() => router.push({ 
        pathname: '/chat-room', 
        params: { 
          roomId: item.id, 
          name: recipient.name,
          avatar: recipient.photoProfile // Dikirim ke detail chat
        } 
      })}
    >
      <Image 
        source={getAvatar(recipient)} 
        style={styles.avatar} 
      />
      
      <View style={styles.roomInfo}>
        <View style={styles.roomHeader}>
          <Text style={styles.name} numberOfLines={1}>{recipient.name}</Text>
          <Text style={styles.time}>
            {new Date(item.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
        
        <Text style={[styles.contextBadge, { color: contextColor }]}>{contextLabel}</Text>
        
        <View style={styles.lastMsgRow}>
          <Text style={styles.lastMsg} numberOfLines={1}>
            {item.lastMessage || 'Mulai percakapan baru...'}
          </Text>
          {item.unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>{item.unreadCount}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Pesan</Text>
        <TouchableOpacity style={styles.searchBtn}>
          <Feather name="search" size={20} color="#12464C" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#12464C" /></View>
      ) : (
        <FlatList
          data={rooms}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderRoom}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Feather name="message-square" size={50} color="#DDD" />
              <Text style={styles.emptyText}>Belum ada percakapan</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 20, 
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0'
  },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#12464C' },
  searchBtn: { backgroundColor: '#F5F5F5', padding: 8, borderRadius: 10 },
  list: { paddingBottom: 20 },
  roomCard: { 
    flexDirection: 'row', 
    paddingHorizontal: 20, 
    paddingVertical: 15, 
    alignItems: 'center',
    borderBottomWidth: 0.5,
    borderBottomColor: '#F0F0F0'
  },
  avatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#F0F0F0' },
  roomInfo: { flex: 1, marginLeft: 15 },
  roomHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  name: { fontSize: 17, fontWeight: 'bold', color: '#333', flex: 1 },
  time: { fontSize: 12, color: '#AAA' },
  contextBadge: { fontSize: 11, fontWeight: 'bold', marginBottom: 4 },
  lastMsgRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  lastMsg: { fontSize: 14, color: '#777', flex: 1, marginRight: 10 },
  unreadBadge: { backgroundColor: '#12464C', borderRadius: 10, minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6 },
  unreadText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { alignItems: 'center', marginTop: 100 },
  emptyText: { marginTop: 10, color: '#AAA', fontSize: 16 }
});