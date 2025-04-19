import React, { useState, useContext, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  TextInput,
  Alert,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { AuthContext } from "../AuthContext.js";
import { Ionicons } from "@expo/vector-icons";
import uploadFile from "../helpers/uploadFile.js";

const EditProfile = ({ navigation }) => {
  const { currentUser, updateUser } = useContext(AuthContext);
  const [data, setData] = useState({
    name: "",
    profile_pic: null,
  });

  useEffect(() => {
    if (currentUser) {
      setData({
        name: currentUser.name || "",
        profile_pic: currentUser.profile_pic || null,
      });
    }
  }, [currentUser]);

  const handleOnChange = (text) => {
    setData((prev) => ({
      ...prev,
      name: text,
    }));
  };

  const handleUploadPhoto = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });

      if (!result.canceled) {
        const asset = result.assets[0];
        const { uri } = asset;
        const fileName = uri.split("/").pop();
        const fileType = asset.type || "image/jpeg";

        const uploaded = await uploadFile({
          uri,
          name: fileName,
          type: fileType,
        });

        if (uploaded?.secure_url) {
          setData((prev) => ({
            ...prev,
            profile_pic: uploaded.secure_url,
          }));
        } else {
          throw new Error("Upload failed");
        }
      }
    } catch (error) {
      console.error("Upload Error:", error);
      Alert.alert("Lỗi", "Không thể tải ảnh lên");
    }
  };

  const handleSubmit = async () => {
    try {
      await updateUser({
        name: data.name,
        profile_pic: data.profile_pic,
      });
      Alert.alert("Thành công", "Cập nhật hồ sơ thành công", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      console.error("Update Error:", error);
      Alert.alert("Lỗi", error.message || "Cập nhật hồ sơ thất bại");
    }
  };

  const handleCancel = () => {
    navigation.goBack();
  };

  if (!currentUser) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleCancel}>
          <Text style={styles.cancelText}>Hủy</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Sửa hồ sơ</Text>
        <TouchableOpacity onPress={handleSubmit}>
          <Text style={styles.saveText}>Lưu</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionTitle}>Hồ sơ</Text>
        <Text style={styles.sectionSubtitle}>
          Chỉnh sửa thông tin người dùng
        </Text>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Tên:</Text>
          <TextInput
            style={styles.input}
            value={data.name}
            onChangeText={handleOnChange}
            placeholder="Nhập tên của bạn"
          />
        </View>

        <View style={styles.photoContainer}>
          <Text style={styles.label}>Ảnh:</Text>
          <View style={styles.photoRow}>
            {data.profile_pic ? (
              <Image source={{ uri: data.profile_pic }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.placeholderText}>
                  {data.name?.[0]?.toUpperCase() || "?"}
                </Text>
              </View>
            )}
            <TouchableOpacity
              onPress={handleUploadPhoto}
              style={styles.changePhotoButton}
            >
              <Text style={styles.changePhotoText}>Thay đổi ảnh</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    marginTop: 40,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  cancelText: {
    fontSize: 16,
    color: "#FF3B30",
  },
  saveText: {
    fontSize: 16,
    color: "#007AFF",
    fontWeight: "600",
  },
  content: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#333",
    marginBottom: 5,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    color: "#333",
    marginBottom: 8,
  },
  input: {
    height: 45,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 16,
    backgroundColor: "#f9f9f9",
  },
  photoContainer: {
    marginBottom: 20,
  },
  photoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 15,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#e1e1e1",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  placeholderText: {
    fontSize: 20,
    color: "#666",
  },
  changePhotoButton: {
    paddingVertical: 5,
  },
  changePhotoText: {
    fontSize: 16,
    color: "#007AFF",
    fontWeight: "500",
  },
});

export default EditProfile;
