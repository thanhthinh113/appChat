import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
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
  Modal,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AuthContext } from "../AuthContext.js";
import * as ImagePicker from "expo-image-picker";
import io from "socket.io-client";
import axios from "axios";
import moment from "moment";
import { Video } from "expo-av";
import MessageReactions from "../Components/MessageReactions";

const REACTIONS = ["❤️", "😂", "😮", "😢", "👍", "👎"];

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
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [selectedMessageForReaction, setSelectedMessageForReaction] =
    useState(null);
  const [reactionPosition, setReactionPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!currentUser?.token) {
      Alert.alert("Lỗi", "Không tìm thấy token. Vui lòng đăng nhập lại.");
      navigation.replace("Screen01");
      return;
    }

    console.log("Current user:", currentUser);
    console.log("Token:", currentUser.token);
    console.log("Chat with user ID:", userId);

    const socketConnection = io("http://localhost:8080", {
      auth: { token: currentUser.token },
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
    setSocket(socketConnection);

    socketConnection.on("connect", () => {
      console.log(
        "Socket connected, emitting message-page for user ID:",
        userId
      );
      socketConnection.emit("message-page", userId);
      socketConnection.emit("seen", userId);
    });

    socketConnection.on("connect_error", (error) => {
      console.error("Socket connection error:", error.message);
      Alert.alert("Lỗi", "Không thể kết nối đến server: " + error.message);
    });

    socketConnection.on("message", (data) => {
      console.log("Received messages:", data);
      if (Array.isArray(data)) {
        setMessages(data);
      } else if (data._id) {
        setMessages((prevMessages) => [...prevMessages, data]);
      }
    });

    socketConnection.on("message-page", (data) => {
      console.log("Received message history:", data);
      if (Array.isArray(data)) {
        setMessages(data);
      }
    });

    socketConnection.on("reaction-updated", (data) => {
      console.log("Received reaction-updated event from server:", data);
      if (data && data.messageId) {
        setMessages((prevMessages) =>
          prevMessages.map((msg) => {
            if (msg._id === data.messageId) {
              return {
                ...msg,
                reactions: data.reactions || [],
              };
            }
            return msg;
          })
        );
      }
    });

    socketConnection.on("reaction-error", (error) => {
      console.error("Reaction error from server:", error);
      Alert.alert("Lỗi", "Không thể cập nhật reaction. Vui lòng thử lại.");
    });

    socketConnection.on("new-reaction", (reactionData) => {
      console.log("Received new-reaction event from web:", reactionData);
      if (reactionData && reactionData.messageId) {
        setMessages((prevMessages) =>
          prevMessages.map((msg) => {
            if (msg._id === reactionData.messageId) {
              const existingReaction = msg.reactions?.find(
                (r) => r.userId.toString() === reactionData.userId.toString()
              );

              if (existingReaction) {
                if (existingReaction.emoji === reactionData.emoji) {
                  return {
                    ...msg,
                    reactions: msg.reactions.filter(
                      (r) =>
                        r.userId.toString() !== reactionData.userId.toString()
                    ),
                  };
                } else {
                  return {
                    ...msg,
                    reactions: msg.reactions.map((r) =>
                      r.userId.toString() === reactionData.userId.toString()
                        ? {
                            ...r,
                            emoji: reactionData.emoji,
                            createdAt: reactionData.createdAt,
                          }
                        : r
                    ),
                  };
                }
              } else {
                return {
                  ...msg,
                  reactions: [
                    ...(msg.reactions || []),
                    {
                      userId: reactionData.userId.toString(),
                      emoji: reactionData.emoji,
                      createdAt: reactionData.createdAt,
                      type: "reaction",
                    },
                  ],
                };
              }
            }
            return msg;
          })
        );
      }
    });

    socketConnection.on("new-message", (newMessage) => {
      console.log("Received new message:", newMessage);
      console.log("Current user ID:", currentUser._id);
      console.log("Message sender ID:", newMessage.msgByUserId);
      setMessages((prevMessages) => {
        const updatedMessages = [...prevMessages, newMessage];
        // Sort messages by createdAt
        return updatedMessages.sort(
          (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
        );
      });
    });

    socketConnection.on("error", (error) => {
      console.error("Server error:", error.message);
      Alert.alert("Lỗi", error.message);
    });

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
    socket.emit("new massage", messageData);

    // Add the message to local state immediately
    const tempMessage = {
      ...messageData,
      _id: Date.now().toString(),
      createdAt: new Date(),
    };
    console.log("Adding temporary message:", tempMessage);
    setMessages((prevMessages) => {
      const updatedMessages = [...prevMessages, tempMessage];
      return updatedMessages.sort(
        (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
      );
    });
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

  const handleReaction = (messageId, emoji) => {
    if (!socket || !currentUser?._id) return;

    socket.emit("react_to_message", {
      messageId,
      emoji,
      userId: currentUser._id,
    });

    // Tự động tắt reaction picker sau khi chọn
    setShowReactionPicker(false);
  };

  // Thêm socket event listener cho reaction
  useEffect(() => {
    if (!socket) return;

    socket.on("reaction-updated", (data) => {
      console.log("Received reaction-updated event from server:", data);
      if (data && data.messageId) {
        setMessages((prevMessages) =>
          prevMessages.map((msg) => {
            if (msg._id === data.messageId) {
              return {
                ...msg,
                reactions: data.reactions || [],
              };
            }
            return msg;
          })
        );
      }
    });

    return () => {
      socket.off("reaction-updated");
    };
  }, [socket]);

  const renderMessage = ({ item }) => {
    const isSent =
      typeof item.msgByUserId === "object"
        ? item.msgByUserId._id === currentUser._id
        : item.msgByUserId === currentUser._id;

    console.log("Rendering message:", {
      messageId: item._id,
      msgByUserId:
        typeof item.msgByUserId === "object"
          ? item.msgByUserId._id
          : item.msgByUserId,
      currentUserId: currentUser._id,
      isSent: isSent,
    });

    return (
      <View
        style={[
          styles.messageWrapper,
          isSent ? styles.sentMessageWrapper : styles.receivedMessageWrapper,
        ]}
      >
        <View
          style={[
            styles.messageContainer,
            isSent ? styles.sentMessage : styles.receivedMessage,
          ]}
        >
          {item.imageUrl && (
            <Image
              source={{ uri: item.imageUrl }}
              style={styles.messageImage}
            />
          )}
          {item.videoUrl && (
            <Video
              source={{ uri: item.videoUrl }}
              style={styles.messageVideo}
              useNativeControls
              resizeMode="contain"
            />
          )}
          {item.text && (
            <Text
              style={[
                styles.messageText,
                isSent ? styles.sentMessageText : styles.receivedMessageText,
              ]}
            >
              {item.text}
            </Text>
          )}
          <View style={styles.messageFooter}>
            <Text
              style={[
                styles.messageTime,
                isSent ? styles.sentMessageTime : styles.receivedMessageTime,
              ]}
            >
              {moment(item.createdAt).format("HH:mm")}
            </Text>
            {isSent && (
              <TouchableOpacity
                style={styles.menuButton}
                onPress={() => {
                  setSelectedMessageForReaction(item);
                  setReactionPosition({
                    x: event.nativeEvent.pageX,
                    y: event.nativeEvent.pageY,
                  });
                  setShowReactionPicker(true);
                }}
              >
                <Ionicons name="ellipsis-vertical" size={20} color="#666" />
              </TouchableOpacity>
            )}
            <MessageReactions
              reactions={item.reactions}
              onReactionPress={(emoji) => handleReaction(item._id, emoji)}
            />
          </View>
        </View>
        <TouchableOpacity
          style={[
            styles.reactionButton,
            isSent
              ? styles.sentMessageReactionButton
              : styles.receivedMessageReactionButton,
          ]}
          onPress={(event) => {
            setSelectedMessageForReaction(item);
            setReactionPosition({
              x: event.nativeEvent.pageX,
              y: event.nativeEvent.pageY,
            });
            setShowReactionPicker(true);
          }}
        >
          <Ionicons name="happy-outline" size={18} color="#666" />
        </TouchableOpacity>
      </View>
    );
  };

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
        onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
        onLayout={() => flatListRef.current?.scrollToEnd()}
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

      <Modal
        visible={showReactionPicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowReactionPicker(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowReactionPicker(false)}
        >
          <View
            style={[
              styles.reactionPicker,
              {
                top: reactionPosition.y - 45,
                left: Math.max(
                  10,
                  Math.min(
                    reactionPosition.x - 80,
                    Dimensions.get("window").width - 180
                  )
                ),
              },
            ]}
          >
            {REACTIONS.map((emoji) => (
              <TouchableOpacity
                key={emoji}
                style={styles.reactionOption}
                onPress={() => {
                  handleReaction(selectedMessageForReaction._id, emoji);
                  setShowReactionPicker(false);
                }}
              >
                <Text style={styles.reactionEmoji}>{emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0084ff",
    padding: 15,
    paddingTop: 50,
  },
  headerUser: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 10,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  headerName: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  messageList: {
    padding: 10,
    paddingBottom: 20,
  },
  messageWrapper: {
    marginVertical: 5,
    maxWidth: "80%",
    flexDirection: "row",
    alignItems: "flex-end",
  },
  sentMessageWrapper: {
    alignSelf: "flex-end",
    flexDirection: "row-reverse",
  },
  receivedMessageWrapper: {
    alignSelf: "flex-start",
  },
  messageContainer: {
    padding: 10,
    borderRadius: 15,
    maxWidth: "100%",
  },
  sentMessage: {
    backgroundColor: "#0084ff",
    borderTopRightRadius: 0,
  },
  receivedMessage: {
    backgroundColor: "#e9ecef",
    borderTopLeftRadius: 0,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  sentMessageText: {
    color: "#fff",
  },
  receivedMessageText: {
    color: "#000",
  },
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: 10,
    marginBottom: 5,
  },
  messageVideo: {
    width: 200,
    height: 200,
    borderRadius: 10,
    marginBottom: 5,
  },
  messageFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: 4,
    borderTopWidth: 0.5,
    borderTopColor: "rgba(0,0,0,0.1)",
    paddingTop: 4,
  },
  messageTime: {
    fontSize: 12,
    marginRight: 5,
  },
  sentMessageTime: {
    color: "rgba(255, 255, 255, 0.7)",
  },
  receivedMessageTime: {
    color: "rgba(0, 0, 0, 0.5)",
  },
  menuButton: {
    padding: 5,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderColor: "#eee",
  },
  input: {
    flex: 1,
    padding: 10,
    fontSize: 16,
    marginHorizontal: 10,
    backgroundColor: "#f0f0f0",
    borderRadius: 20,
  },
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
  reactionButton: {
    padding: 6,
    marginHorizontal: 4,
    borderRadius: 15,
    backgroundColor: "rgba(255,255,255,0.9)",
    alignSelf: "flex-end",
  },
  reactionsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 4,
    marginBottom: 4,
    maxWidth: "100%",
  },
  reactionBubble: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 3,
    marginRight: 4,
    marginBottom: 2,
  },
  reactionEmoji: {
    fontSize: 14,
  },
  reactionCount: {
    fontSize: 12,
    marginLeft: 2,
    color: "#666",
  },
  sentMessageReactionButton: {
    marginRight: 4,
  },
  receivedMessageReactionButton: {
    marginLeft: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  reactionPicker: {
    position: "absolute",
    flexDirection: "row",
    backgroundColor: "white",
    borderRadius: 20,
    padding: 8,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 1000,
    maxWidth: "90%",
    left: "5%",
    transform: [{ translateX: -50 }],
  },
  reactionOption: {
    padding: 8,
    marginHorizontal: 2,
    borderRadius: 15,
    backgroundColor: "#f0f2f5",
  },
  reactionEmoji: {
    fontSize: 18,
  },
});

export default ChatScreen;
