import { Platform } from 'react-native';

// Khi chạy máy ảo Android: 10.0.2.2 trỏ về localhost máy tính
// Khi chạy Web / iOS simulator: localhost trỏ về máy tính
const getLocalApiBaseUrl = () => {
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:5023';
  }
  return 'http://localhost:5023';
};

export const config = {
  // Thay đổi IP này nếu bạn test qua điện thoại thật nối cùng mạng Wi-Fi
  apiBaseUrl: getLocalApiBaseUrl(),
  appName: 'TaxKeep VN',
  storageKeys: {
    accessToken: 'taxkeep_access_token',
    refreshToken: 'taxkeep_refresh_token',
    userData: 'taxkeep_user_data',
  },
};
