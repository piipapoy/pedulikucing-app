import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons'; // Library Icon bawaan Expo
import { View } from 'react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false, // Hilangkan header default (kita bikin custom nanti)
        tabBarStyle: {
          backgroundColor: '#FFF',
          borderTopWidth: 0,
          elevation: 5, // Shadow di Android
          height: 60,
          paddingBottom: 10,
          paddingTop: 10,
        },
        tabBarActiveTintColor: '#2A9D8F', // Warna Icon saat Aktif (Teal)
        tabBarInactiveTintColor: '#C0C0C0', // Warna Icon saat Mati (Abu)
        tabBarShowLabel: true, // Tampilkan tulisan di bawah icon
      }}
    >
      {/* Tab 1: Home */}
      <Tabs.Screen
        name="home"
        options={{
          title: 'Beranda',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />

      {/* Tab 2: Adopsi (Katalog) */}
      <Tabs.Screen
        name="adopsi"
        options={{
          title: 'Adopsi',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="paw" size={size} color={color} />
          ),
        }}
      />

      {/* Tab 3: Lapor (Tengah Besar - Opsional) */}
      <Tabs.Screen
        name="lapor"
        options={{
          title: 'Lapor',
          tabBarIcon: ({ color, size }) => (
            <View style={{
              backgroundColor: '#E76F51', // Merah Bata
              width: 50,
              height: 50,
              borderRadius: 25,
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: 20, // Biar agak naik ke atas
              elevation: 5
            }}>
              <Ionicons name="alert-circle" size={30} color="#FFF" />
            </View>
          ),
          tabBarLabelStyle: { display: 'none' } // Hilangkan tulisan Lapor biar rapi
        }}
      />

      {/* Tab 4: Profil */}
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Akun',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}