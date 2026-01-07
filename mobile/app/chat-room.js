import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, StyleSheet, FlatList, TextInput, 
  TouchableOpacity, KeyboardAvoidingView, Platform, Image, ActivityIndicator, ScrollView
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import api from '../src/services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ChatRoomScreen() {
  const { roomId, name, avatar } = useLocalSearchParams();
  const router = useRouter();
  const flatListRef = useRef();
  
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [myId, setMyId] = useState(null);
  const [activeTasks, setActiveTasks] = useState([]); // State untuk nampung urusan aktif

  useEffect(() => {
    loadData();
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const userStr = await AsyncStorage.getItem('userData');
      const token = await AsyncStorage.getItem('userToken');
      const parsedUser = JSON.parse(userStr);
      setMyId(parsedUser.id);

      // Ambil urusan aktif (Adopsi & Laporan) antara saya dan lawan bicara
      // Endpoint ini akan mengembalikan semua urusan yang melibatkan kedua user di room ini
      const resContext = await api.get(`/chat/context/${roomId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setActiveTasks(resContext.data);

      await fetchMessages();
    } catch (e) {
      console.log("Load Data Error:", e);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const res = await api.get(`/chat/messages/${roomId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessages(res.data);
    } catch (e) { 
      console.log("Fetch Messages Error:", e); 
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim()) return;
    const content = inputText;
    setInputText('');

    try {
      const token = await AsyncStorage.getItem('userToken');
      const res = await api.post('/chat/message', 
        { roomId, content },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessages(prev => [...prev, { ...res.data, senderId: myId }]);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (e) { 
      console.log("Send Message Error:", e); 
    }
  };

  const renderBubble = ({ item }) => {
    const isMine = item.senderId === myId;
    return (
      <View style={[styles.bubble, isMine ? styles.myBubble : styles.theirBubble]}>
        <Text style={[styles.msgText, isMine ? styles.myMsgText : styles.theirMsgText]}>
          {item.content}
        </Text>
        <Text style={styles.timeText}>
          {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    );
  };

  // --- RENDER AREA URUSAN AKTIF (Context Switcher) ---
const renderContextArea = () => {
  // Hanya tampilkan jika status bukan PENDING (untuk laporan)
  const filteredTasks = activeTasks.filter(task => {
    if (task.type === 'adoption') return true;
    return task.status !== 'PENDING';
  });

  if (filteredTasks.length === 0) return null;

  return (
    <View style={styles.contextManager}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{paddingHorizontal: 15}}>
        {filteredTasks.map((task, idx) => (
          <TouchableOpacity 
            key={idx} 
            style={[styles.taskCard, task.type === 'report' ? styles.taskLapor : styles.taskAdopsi]}
            activeOpacity={0.8}
          >
            <View style={[styles.taskIconCircle, { backgroundColor: task.type === 'report' ? '#C2185B' : '#12464C' }]}>
              <Ionicons name={task.type === 'report' ? "alert-circle" : "paw"} size={14} color="#FFF" />
            </View>
            <View>
              {/* PERBAIKAN: Gunakan label yang dinamis sesuai type */}
              <Text style={styles.taskLabelSmall}>
                {task.type === 'report' ? 'Laporan Darurat' : 'Adopsi Kucing'}
              </Text>
              <Text style={styles.taskTitle} numberOfLines={1}>
                {task.title}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF' }}>
        <ActivityIndicator size="large" color="#12464C" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="chevron-left" size={28} color="#12464C" />
        </TouchableOpacity>
        
        <View style={styles.headerCenterRow}>
          <Image 
            source={{ 
              uri: avatar 
                ? `http://localhost:5000${avatar}` 
                : `https://ui-avatars.com/api/?name=${name}&backgroundColor=12464C&color=fff` 
            }} 
            style={styles.headerAvatar} 
          />
          <View style={{ marginLeft: 10 }}>
            <Text style={styles.headerTitleText}>{name}</Text>
            <Text style={styles.onlineStatus}>Online</Text>
          </View>
        </View>
        
        <TouchableOpacity>
          <Feather name="more-vertical" size={22} color="#12464C" />
        </TouchableOpacity>
      </View>

      {/* RENDER CONTEXT MANAGER */}
      {renderContextArea()}

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderBubble}
          contentContainerStyle={{ padding: 20, paddingBottom: 30 }}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />

        <View style={styles.inputContainer}>
          <TouchableOpacity style={styles.attachBtn}>
            <Feather name="plus" size={22} color="#12464C" />
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            placeholder="Ketik pesan..."
            value={inputText}
            onChangeText={setInputText}
            multiline
          />
          <TouchableOpacity 
            style={[styles.sendBtn, !inputText.trim() && { backgroundColor: '#CCC' }]} 
            onPress={sendMessage}
            disabled={!inputText.trim()}
          >
            <Ionicons name="send" size={18} color="#FFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7F8' },
  header: { 
    height: 65, 
    backgroundColor: '#FFF', 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 15,
    borderBottomWidth: 1, 
    borderBottomColor: '#EEE',
    elevation: 2
  },
  headerCenterRow: { 
    flexDirection: 'row', 
    alignItems: 'center',
    flex: 1,
    marginLeft: 10
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EEE'
  },
  headerTitleText: { fontSize: 16, fontWeight: 'bold', color: '#12464C' },
  onlineStatus: { fontSize: 11, color: '#4CAF50', fontWeight: '600' },
  
  // STYLING CONTEXT MANAGER (Drop down replacement)
  contextManager: {
    backgroundColor: '#FFF',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 15,
    marginRight: 12,
    minWidth: 160,
    borderWidth: 1,
  },
  taskAdopsi: { backgroundColor: '#F0F7F7', borderColor: '#B2DFDB' },
  taskLapor: { backgroundColor: '#FFF5F5', borderColor: '#FFCDD2' },
  taskIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10
  },
  taskTitle: { fontSize: 12, fontWeight: 'bold', color: '#333', maxWidth: 110 },
  taskStatus: { fontSize: 10, color: '#666', marginTop: 1 },

  bubble: { 
    maxWidth: '80%', 
    padding: 12, 
    borderRadius: 18, 
    marginBottom: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 2
  },
  myBubble: { 
    alignSelf: 'flex-end', 
    backgroundColor: '#12464C', 
    borderBottomRightRadius: 2 
  },
  theirBubble: { 
    alignSelf: 'flex-start', 
    backgroundColor: '#FFF', 
    borderBottomLeftRadius: 2 
  },
  msgText: { fontSize: 15, lineHeight: 22 },
  myMsgText: { color: '#FFF' },
  theirMsgText: { color: '#333' },
  timeText: { fontSize: 9, color: '#999', marginTop: 4, alignSelf: 'flex-end' },
  
  inputContainer: { 
    flexDirection: 'row', 
    padding: 12, 
    backgroundColor: '#FFF', 
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#EEE'
  },
  attachBtn: { marginRight: 10 },
  input: { 
    flex: 1, 
    backgroundColor: '#F0F2F5', 
    borderRadius: 22, 
    paddingHorizontal: 15, 
    paddingVertical: 8, 
    maxHeight: 100, 
    fontSize: 15,
    color: '#333'
  },
  sendBtn: { 
    width: 42, 
    height: 42, 
    borderRadius: 21, 
    backgroundColor: '#12464C', 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginLeft: 10 
  },
  taskLabelSmall: {
    fontSize: 9,
    color: '#666',
    textTransform: 'uppercase',
    fontWeight: 'bold'
  }
});