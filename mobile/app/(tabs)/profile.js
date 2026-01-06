import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function Profile() {
  const router = useRouter();
  const handleLogout = async () => {
    await AsyncStorage.removeItem('userToken');
    await AsyncStorage.removeItem('userData');
    router.replace('/'); // Kembali ke Login
  };
  return (
    <View style={{flex:1, justifyContent:'center', alignItems:'center'}}>
      <Text>Halaman Profil</Text>
      <TouchableOpacity onPress={handleLogout} style={{marginTop: 20, padding: 10, backgroundColor: 'red', borderRadius: 8}}>
        <Text style={{color:'white'}}>Keluar (Logout)</Text>
      </TouchableOpacity>
    </View>
  );
}