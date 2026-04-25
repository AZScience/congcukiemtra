import { FirebaseOptions } from 'firebase/app';

// =================================================================
//  HƯỚNG DẪN CẤU HÌNH FIREBASE
// =================================================================
// 1. Truy cập Project Settings trong Firebase Console.
// 2. Trong tab "General", tìm mục "Your apps" và chọn ứng dụng web.
// 3. Trong "Firebase SDK snippet", chọn "Config" và sao chép các giá trị.
// 4. Đảm bảo đã bật phương thức đăng nhập "Email/Password".
// =================================================================

export const firebaseConfig: FirebaseOptions = {
  apiKey: "AIzaSyBXjBBAnT-qIchTelWU6YWAvzXmkEgMBBw",
  authDomain: "kiemtranoibo-ccks.firebaseapp.com",
  projectId: "kiemtranoibo-ccks",
  storageBucket: "kiemtranoibo-ccks.appspot.com",
  messagingSenderId: "860631528951",
  appId: "1:860631528951:web:88b80d83f147a58d8b6af2",
  measurementId: "G-F7N2SW7HGG"
};
