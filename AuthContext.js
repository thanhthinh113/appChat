import React, { createContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import axios from "axios";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const baseURL = "http://localhost:8080"; // Đổi thành địa chỉ backend nếu cần

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = await AsyncStorage.getItem("token");
        if (!token) {
          setIsLoading(false);
          return;
        }

        const res = await axios.get(`${baseURL}/api/user-details`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        setCurrentUser({ ...res.data.data, token });
      } catch (error) {
        console.error(
          "Lỗi lấy thông tin user:",
          error.response?.data || error.message
        );
        await AsyncStorage.removeItem("token");
        setCurrentUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUser();
  }, []);

  const register = async (userData) => {
    try {
      const res = await axios.post(`${baseURL}/api/register`, userData, {
        withCredentials: true,
      });
      const { token, user } = res.data;
      if (token) {
        await AsyncStorage.setItem("token", token);
        setCurrentUser({ ...user, token });
      }
      return res.data;
    } catch (error) {
      console.error("Register error:", error.response?.data || error.message);
      throw new Error(error.response?.data?.message || "Đăng ký thất bại");
    }
  };

  const login = async (phone, password) => {
    try {
      const checkPhoneRes = await axios.post(
        `${baseURL}/api/phone`,
        { phone },
        { withCredentials: true }
      );

      const userId = checkPhoneRes.data.data._id;

      const loginRes = await axios.post(
        `${baseURL}/api/password`,
        { password, userId },
        { withCredentials: true }
      );

      const token = loginRes.data.token;
      await AsyncStorage.setItem("token", token);

      // Gọi lại để lấy thông tin user
      const userRes = await axios.get(`${baseURL}/api/user-details`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Gán token vào currentUser
      setCurrentUser({ ...userRes.data.data, token });
      return true;
    } catch (error) {
      console.error("Login error:", error.response?.data || error.message);
      await AsyncStorage.removeItem("token"); // Xóa token nếu đăng nhập thất bại
      throw new Error(error.response?.data?.message || "Đăng nhập thất bại");
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem("token");
      setCurrentUser(null);
      return true;
    } catch (error) {
      console.error("Logout error:", error);
      throw new Error("Đăng xuất thất bại");
    }
  };

  const updateUser = async (newData) => {
    try {
      const token = await AsyncStorage.getItem("token");

      const response = await axios.post(`${baseURL}/api/update-user`, newData, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.data.success) {
        setCurrentUser(response.data.data);
      } else {
        throw new Error("Update failed");
      }
    } catch (err) {
      console.error("Update Error:", err.response?.data || err.message);
      throw err;
    }
  };

  const uploadAvatar = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });

      if (!result.canceled) {
        const uri = result.assets[0].uri;

        // Nếu bạn cần upload thực sự thì dùng FormData và gửi qua backend
        // Đây chỉ là ví dụ gọi update avatar với URI (mock)
        await updateUser({ avatar: uri });
        return uri;
      }

      return null;
    } catch (error) {
      console.error("Upload avatar error:", error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isLoading,
        register,
        login,
        logout,
        updateUser,
        uploadAvatar,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
