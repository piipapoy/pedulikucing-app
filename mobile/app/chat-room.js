import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, StyleSheet, FlatList, TextInput, 
  TouchableOpacity, Image, KeyboardAvoidingView, 
  Platform, ActivityIndicator, Alert 
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import api from '../src/services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ChatRoom() {
  const { roomId, name, avatar } = useLocalSearchParams();
  const router = useRouter();
  const flatListRef = useRef();
  
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [myId, setMyId] = useState(null);
  const [contexts, setContexts] = useState([]);
  const [showContext, setShowContext] = useState(false); // 🔥 Toggle Dropdown

  useEffect(() => {
    const init = async () => {
      const storedId = await AsyncStorage.getItem('userId');
      if (storedId) setMyId(Number(storedId));
      await Promise.all([fetchMessages(), fetchChatContext()]);
      setLoading(false);
    };
    init();
    const interval = setInterval(fetchMessages, 3000); 
    return () => clearInterval(interval);
  }, []);

  const fetchMessages = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const res = await api.get(`/chat/messages/${roomId}`, { headers: { Authorization: `Bearer ${token}` } });
      setMessages(res.data);
    } catch (e) { console.log("Msg Error"); }
  };

  const fetchChatContext = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const res = await api.get(`/chat/context/${roomId}`, { headers: { Authorization: `Bearer ${token}` } });
      setContexts(res.data || []);
    } catch (e) { console.log("Ctx Error"); }
  };

  const sendMessage = async () => {
    if (inputText.trim() === '') return;
    const content = inputText;
    setInputText('');
    try {
      const token = await AsyncStorage.getItem('userToken');
      const res = await api.post('/chat/message', { roomId, content }, { headers: { Authorization: `Bearer ${token}` } });
      setMessages(prev => [...prev, res.data]);
    } catch (e) { Alert.alert("Error", "Gagal kirim"); }
  };

  const handleUpdateStatus = (item) => {
    const finalStatus = item.type === 'adoption' ? 'APPROVED' : 'RESCUED';
    Alert.alert("Selesaikan?", `Urusan "${item.title}" sudah selesai?`, [
      { text: "Batal", style: "cancel" },
      { text: "Ya", onPress: async () => {
          try {
            const token = await AsyncStorage.getItem('userToken');
            await api.patch('/chat/context/update-status', { id: item.id, type: item.type, newStatus: finalStatus }, { headers: { Authorization: `Bearer ${token}` } });
            fetchChatContext();
          } catch (e) { Alert.alert("Error", "Gagal"); }
      }}
    ]);
  };

  const renderMessage = ({ item }) => {
    if (!myId) return null;
    const isMe = Number(item.senderId) === Number(myId);
    return (
      <View style={[styles.msgWrapper, isMe ? styles.myMsgWrapper : styles.theirMsgWrapper]}>
        <View style={[styles.msgBubble, isMe ? styles.myBubble : styles.theirBubble]}>
          <Text style={[styles.msgText, isMe ? styles.myMsgText : styles.theirMsgText]}>{item.content}</Text>
          <View style={styles.msgFooter}>
            <Text style={[styles.msgTime, isMe ? styles.myTimeText : styles.theirTimeText]}>
                {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
            {isMe && <Ionicons name={item.isRead ? "checkmark-done" : "checkmark"} size={14} color={item.isRead ? "#4FC3F7" : "rgba(255,255,255,0.5)"} style={{marginLeft: 4}} />}
          </View>
        </View>
      </View>
    );
  };

  const resolveImageUrl = (rawPath) => {
    if (!rawPath) return 'https://ui-avatars.com/api/?name=' + name;
    if (rawPath.startsWith('http')) return rawPath;
    const baseUrl = api.defaults.baseURL.replace(/\/api\/?$/, '');
    return `${baseUrl}${rawPath.replace(/\\/g, '/')}`;
  };

  if (loading || !myId) return <View style={styles.center}><ActivityIndicator size="large" color="#12464C" /></View>;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><Feather name="chevron-left" size={28} color="#333" /></TouchableOpacity>
        <Image source={{ uri: resolveImageUrl(avatar) }} style={styles.avatar} />
        <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.headerName}>{name}</Text>
            <Text style={styles.onlineStatus}>Terhubung</Text>
        </View>
        
        {/* 🔥 Tombol Dropdown Info Urusan */}
        {contexts.length > 0 && (
            <TouchableOpacity 
                style={[styles.contextToggle, showContext && styles.contextToggleActive]} 
                onPress={() => setShowContext(!showContext)}
            >
                <MaterialCommunityIcons name="briefcase-outline" size={20} color={showContext ? "#FFF" : "#12464C"} />
                {contexts.length > 0 && <View style={styles.badgeCount}><Text style={styles.badgeText}>{contexts.length}</Text></View>}
            </TouchableOpacity>
        )}
      </View>

      {/* 🔥 Area Dropdown Context */}
      {showContext && contexts.length > 0 && (
          <View style={styles.dropdownContainer}>
              {contexts.map((item, index) => (
                  <View key={`ctx-${index}`} style={styles.contextItem}>
                      <View style={styles.contextInfo}>
                        <MaterialCommunityIcons name={item.type === 'adoption' ? "paw" : "alert-decagram"} size={16} color="#12464C" />
                        <View style={{marginLeft: 8, flex: 1}}>
                            <Text style={styles.contextTitle} numberOfLines={1}>{item.title}</Text>
                            <Text style={styles.contextSub}>Status: {item.status}</Text>
                        </View>
                      </View>
                      {/* MODIFIKASI: Tombol selesaikan hanya untuk report, adopsi hanya indikator status */}
                      {item.type === 'report' && item.canManage ? (
                        <TouchableOpacity style={styles.doneBtn} onPress={() => handleUpdateStatus(item)}>
                            <Text style={styles.doneBtnText}>Selesaikan</Text>
                        </TouchableOpacity>
                      ) : (
                        <View style={styles.statusBadgeSmall}>
                            <Text style={styles.statusBadgeTextSmall}>{item.status}</Text>
                        </View>
                      )}
                  </View>
              ))}
          </View>
      )}

      <FlatList
        ref={flatListRef}
        data={messages}
        extraData={myId}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderMessage}
        contentContainerStyle={styles.listContent}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
        <View style={styles.inputContainer}>
          <TextInput style={styles.input} placeholder="Tulis pesan..." value={inputText} onChangeText={setInputText} multiline />
          <TouchableOpacity style={styles.sendBtn} onPress={sendMessage} disabled={!inputText.trim()}><Ionicons name="send" size={20} color="#FFF" /></TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F2F5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 15, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#EEE', elevation: 2, zIndex: 10 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#EEE' },
  headerName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  onlineStatus: { fontSize: 11, color: '#4CAF50' },
  
  // DROPDOWN STYLES
  contextToggle: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#E3F2FD', justifyContent: 'center', alignItems: 'center' },
  contextToggleActive: { backgroundColor: '#12464C' },
  badgeCount: { position: 'absolute', top: -2, right: -2, backgroundColor: '#C2185B', width: 16, height: 16, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  badgeText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
  dropdownContainer: { position: 'absolute', top: 70, left: 15, right: 15, backgroundColor: '#FFF', borderRadius: 15, padding: 10, elevation: 5, zIndex: 100, borderWidth: 1, borderColor: '#EEE' },
  contextItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  contextInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  contextTitle: { fontSize: 13, fontWeight: 'bold', color: '#333' },
  contextSub: { fontSize: 10, color: '#888' },
  doneBtn: { backgroundColor: '#12464C', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  doneBtnText: { color: '#FFF', fontSize: 11, fontWeight: 'bold' },
  statusBadgeSmall: { backgroundColor: '#E0F2F1', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusBadgeTextSmall: { fontSize: 10, color: '#12464C', fontWeight: '800' },

  listContent: { padding: 15 },
  msgWrapper: { marginBottom: 10, flexDirection: 'row', width: '100%' },
  myMsgWrapper: { justifyContent: 'flex-end' },
  theirMsgWrapper: { justifyContent: 'flex-start' },
  msgBubble: { maxWidth: '80%', padding: 10, borderRadius: 15, elevation: 1 },
  myBubble: { backgroundColor: '#12464C', borderBottomRightRadius: 2 },
  theirBubble: { backgroundColor: '#FFF', borderBottomLeftRadius: 2 },
  msgText: { fontSize: 15 },
  myMsgText: { color: '#FFF' },
  theirMsgText: { color: '#333' },
  msgFooter: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end', marginTop: 2 },
  msgTime: { fontSize: 9 },
  myTimeText: { color: 'rgba(255,255,255,0.7)' },
  theirTimeText: { color: '#999' },
  inputContainer: { flexDirection: 'row', alignItems: 'center', padding: 10, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#EEE' },
  input: { flex: 1, backgroundColor: '#F0F2F5', borderRadius: 24, paddingHorizontal: 15, paddingVertical: 10, marginHorizontal: 8 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#12464C', justifyContent: 'center', alignItems: 'center' }
});