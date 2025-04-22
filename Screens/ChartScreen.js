import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AuthContext } from "../AuthContext.js";
import * as ImagePicker from "expo-image-picker";
import io from "socket.io-client";
import axios from "axios";
import moment from "moment";
import { Video } from "expo-av";

const ChatScreen = ({ route, navigation }) => {
  const { currentUser } = React.useContext(AuthContext);
  const { userId, userName, userProfilePic } = route.params;
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState({
    text: "",
    imageUrl: "",
    videoUrl: "",
  });
  const [loading, setLoading] = useState(false);
  const [socket, setSocket] = useState(null);
  const flatListRef = useRef(null);

  useEffect(() => {
    if (!currentUser?.token) {
      Alert.alert("Lỗi", "Không tìm thấy token. Vui lòng đăng nhập lại.");
      navigation.replace("Screen01");
      return;
    }

    console.log("Current user:", currentUser);
    console.log("Token:", currentUser.token);
    console.log("Chat with user ID:", userId);

    // Replace localhost with your server IP if testing on a real device
    const socketConnection = io("http://localhost:8080", {
      auth: { token: currentUser.token },
    });
    setSocket(socketConnection);

    socketConnection.on("connect", () => {
      console.log(
        "Socket connected, emitting message-page for user ID:",
        userId
      );
      // Emit message-page immediately to get chat history
      socketConnection.emit("message-page", userId);
      socketConnection.emit("seen", userId);
    });

    socketConnection.on("connect_error", (error) => {
      console.error("Socket connection error:", error.message);
      Alert.alert("Lỗi", "Không thể kết nối đến server: " + error.message);
    });

    socketConnection.on("message", (data) => {
      console.log("Received messages:", data);
      setMessages(data);
    });

    // Handle errors from the server
    socketConnection.on("error", (error) => {
      console.error("Server error:", error.message);
      Alert.alert("Lỗi", error.message);
    });

    // Add a direct message-page emit after connection is established
    socketConnection.emit("message-page", userId);

    // Add a small delay to ensure messages are loaded
    const timer = setTimeout(() => {
      socketConnection.emit("message-page", userId);
    }, 500);

    return () => {
      console.log("Disconnecting socket");
      clearTimeout(timer);
      socketConnection.disconnect();
    };
  }, [userId, currentUser, navigation]);

  useEffect(() => {
    if (flatListRef.current && messages.length > 0) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  }, [messages]);

  const handleSendMessage = () => {
    if (!newMessage.text && !newMessage.imageUrl && !newMessage.videoUrl) {
      console.log("No message content to send");
      return;
    }

    if (!socket) {
      Alert.alert(
        "Lỗi",
        "Không thể gửi tin nhắn. Kết nối server bị gián đoạn."
      );
      return;
    }

    const messageData = {
      sender: currentUser._id.toString(),
      receiver: userId.toString(),
      text: newMessage.text || "",
      imageUrl: newMessage.imageUrl || "",
      videoUrl: newMessage.videoUrl || "",
      msgByUserId: currentUser._id.toString(),
    };

    console.log("Sending message:", messageData);
    socket.emit("new massage", messageData); // Fixed to match backend
    setNewMessage({ text: "", imageUrl: "", videoUrl: "" });
  };

  // Handle message deletion
  const handleDeleteMessage = (messageId) => {
    Alert.alert(
      "Xóa tin nhắn",
      "Bạn có chắc muốn thu hồi tin nhắn này?",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xóa",
          style: "destructive",
          onPress: () => {
            if (socket) {
              socket.emit("delete-message", {
                messageId,
                senderId: currentUser._id.toString(),
                receiverId: userId.toString(),
              });
            } else {
              Alert.alert(
                "Lỗi",
                "Không thể xóa tin nhắn. Kết nối server bị gián đoạn."
              );
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const handlePickMedia = async (type) => {
    let result;
    if (type === "image") {
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 1,
      });
    } else {
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        quality: 1,
      });
    }

    if (!result.canceled) {
      setLoading(true);
      try {
        const formData = new FormData();
        formData.append("file", {
          uri: result.assets[0].uri,
          type: type === "image" ? "image/jpeg" : "video/mp4",
          name: type === "image" ? "image.jpg" : "video.mp4",
        });

        const response = await axios.post(
          "http://localhost:8080/api/upload",
          formData,
          {
            headers: {
              "Content-Type": "multipart/form-data",
              Authorization: `Bearer ${currentUser.token}`,
            },
          }
        );

        setNewMessage((prev) => ({
          ...prev,
          [type === "image" ? "imageUrl" : "videoUrl"]: response.data.url,
        }));
      } catch (error) {
        console.error("Upload error:", error);
        Alert.alert("Lỗi", "Tải lên thất bại. Vui lòng thử lại.");
      }
      setLoading(false);
    }
  };

  const handleClearMedia = (type) => {
    setNewMessage((prev) => ({
      ...prev,
      [type === "image" ? "imageUrl" : "videoUrl"]: "",
    }));
  };

  const renderMessage = ({ item }) => (
    <View
      style={[
        styles.messageContainer,
        item.msgByUserId === currentUser._id
          ? styles.sentMessage
          : styles.receivedMessage,
      ]}
    >
      <View style={styles.messageContent}>
        {item.imageUrl && (
          <Image source={{ uri: item.imageUrl }} style={styles.messageImage} />
        )}
        {item.videoUrl && (
          <Video
            source={{ uri: item.videoUrl }}
            style={styles.messageVideo}
            useNativeControls
            resizeMode="contain"
          />
        )}
        {item.text && <Text style={styles.messageText}>{item.text}</Text>}
        <Text style={styles.messageTime}>
          {moment(item.createdAt).format("HH:mm")}
        </Text>
      </View>
      {item.msgByUserId === currentUser._id && (
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDeleteMessage(item._id)}
        >
          <Ionicons name="trash" size={20} color="#fff" />
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerUser}>
          <Image
            source={{ uri: userProfilePic || "https://via.placeholder.com/50" }}
            style={styles.headerAvatar}
          />
          <Text style={styles.headerName}>{userName}</Text>
        </View>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.messageList}
      />

      {(newMessage.imageUrl || newMessage.videoUrl) && (
        <View style={styles.mediaPreview}>
          <TouchableOpacity
            style={styles.closeMedia}
            onPress={() =>
              handleClearMedia(newMessage.imageUrl ? "image" : "video")
            }
          >
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
          {newMessage.imageUrl && (
            <Image
              source={{ uri: newMessage.imageUrl }}
              style={styles.previewImage}
            />
          )}
          {newMessage.videoUrl && (
            <Video
              source={{ uri: newMessage.videoUrl }}
              style={styles.previewVideo}
              useNativeControls
              resizeMode="contain"
            />
          )}
        </View>
      )}

      <View style={styles.inputContainer}>
        <TouchableOpacity onPress={() => handlePickMedia("image")}>
          <Ionicons name="image" size={24} color="#007AFF" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handlePickMedia("video")}>
          <Ionicons name="videocam" size={24} color="#007AFF" />
        </TouchableOpacity>
        <TextInput
          style={styles.input}
          placeholder="Nhập tin nhắn..."
          value={newMessage.text}
          onChangeText={(text) => setNewMessage((prev) => ({ ...prev, text }))}
        />
        <TouchableOpacity onPress={handleSendMessage}>
          <Ionicons name="send" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      {loading && (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5", marginTop: 40 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#007AFF",
    padding: 10,
  },
  headerUser: { flexDirection: "row", alignItems: "center", marginLeft: 10 },
  headerAvatar: { width: 40, height: 40, borderRadius: 20, marginRight: 10 },
  headerName: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  messageList: { padding: 10 },
  messageContainer: {
    flexDirection: "row",
    alignItems: "center",
    maxWidth: "80%",
    marginVertical: 5,
    padding: 10,
    borderRadius: 10,
  },
  sentMessage: { backgroundColor: "#007AFF", alignSelf: "flex-end" },
  receivedMessage: { backgroundColor: "#e1e1e1", alignSelf: "flex-start" },
  messageContent: { flex: 1 },
  messageText: { color: "#000", fontSize: 16 },
  messageImage: { width: 200, height: 200, borderRadius: 10, marginBottom: 5 },
  messageVideo: { width: 200, height: 200, borderRadius: 10, marginBottom: 5 },
  messageTime: { fontSize: 12, color: "#666", alignSelf: "flex-end" },
  deleteButton: {
    marginLeft: 10,
    padding: 5,
    backgroundColor: "#ff4d4d",
    borderRadius: 15,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderColor: "#eee",
  },
  input: { flex: 1, padding: 10, fontSize: 16, marginHorizontal: 10 },
  mediaPreview: {
    position: "absolute",
    bottom: 80,
    left: 10,
    right: 10,
    backgroundColor: "rgba(0,0,0,0.7)",
    borderRadius: 10,
    padding: 10,
  },
  closeMedia: { position: "absolute", top: 5, right: 5, zIndex: 1 },
  previewImage: { width: 200, height: 200, borderRadius: 10 },
  previewVideo: { width: 200, height: 200, borderRadius: 10 },
  loading: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.3)",
  },
});

export default ChatScreen;
