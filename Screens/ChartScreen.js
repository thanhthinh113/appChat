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
import uploadFile from "../helpers/uploadFile.js";
import { useNavigation } from "@react-navigation/native";

const API_URL = "http://localhost:8080";
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
  const [replyToMessage, setReplyToMessage] = useState(null);
  const [showMessageMenu, setShowMessageMenu] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [isScrolling, setIsScrolling] = useState(false);
  const [lastMessageCount, setLastMessageCount] = useState(0);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [friendRequestStatus, setFriendRequestStatus] = useState({
    isFriend: false,
    hasPendingRequest: false,
    requestId: null,
    isReceiver: false,
  });
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [selectedContacts, setSelectedContacts] = useState(new Set());
  const [showForwardModal, setShowForwardModal] = useState(false);

  useEffect(() => {
    if (!currentUser?.token) {
      Alert.alert("Lỗi", "Không tìm thấy token. Vui lòng đăng nhập lại.");
      navigation.replace("Screen01");
      return;
    }

    console.log("Current user:", currentUser);
    console.log("Token:", currentUser.token);
    console.log("Chat with user ID:", userId);

    const socketConnection = io(API_URL, {
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

    // Get conversation ID
    socketConnection.on("conversation-id", (data) => {
      console.log("Received conversation ID:", data);
      setConversationId(data.conversationId);
    });

    // Listen for delete message success
    socketConnection.on("delete-message-success", (data) => {
      console.log("Message deleted successfully:", data.messageId);
      // Cập nhật lại danh sách tin nhắn
      setMessages((prevMessages) =>
        prevMessages.filter((msg) => msg._id !== data.messageId)
      );
      Alert.alert("Thành công", "Đã xóa tin nhắn thành công");
    });

    // Listen for delete message error
    socketConnection.on("delete-message-error", (data) => {
      console.error("Delete message error:", data);
      Alert.alert("Lỗi", data.error || "Không thể xóa tin nhắn");
    });

    // Listen for recall message success
    socketConnection.on("recall-message-success", (data) => {
      console.log("Message recalled successfully:", data);
      console.log("Current user ID:", currentUser._id);
      console.log("Recall user ID:", data.userId);

      // Cập nhật lại danh sách tin nhắn
      setMessages((prevMessages) =>
        prevMessages.map((msg) => {
          if (msg._id === data.messageId) {
            return {
              ...msg,
              isRecalled: true,
              text: "",
              imageUrl: "",
              videoUrl: "",
              fileUrl: "",
              fileName: "",
              updatedAt: new Date().toISOString(),
            };
          }
          return msg;
        })
      );

      // Chỉ hiển thị thông báo khi người dùng hiện tại là người thu hồi
      if (
        data.userId &&
        currentUser._id &&
        data.userId.toString() === currentUser._id.toString()
      ) {
        Alert.alert("Thành công", "Đã thu hồi tin nhắn");
      }
    });

    // Listen for recall message error
    socketConnection.on("recall-message-error", (data) => {
      console.error("Recall message error:", data);
      console.log("Current user ID:", currentUser._id);
      console.log("Recall user ID:", data.userId);

      // Chỉ hiển thị thông báo lỗi khi người dùng hiện tại là người thu hồi
      if (
        data.userId &&
        currentUser._id &&
        data.userId.toString() === currentUser._id.toString()
      ) {
        Alert.alert("Lỗi", data.error || "Không thể thu hồi tin nhắn");
      }
    });

    // Listen for message updates
    socketConnection.on("message-updated", (updatedMessage) => {
      console.log("Message updated:", updatedMessage);
      setMessages((prevMessages) =>
        prevMessages.map((msg) => {
          if (msg._id === updatedMessage._id) {
            return {
              ...msg,
              ...updatedMessage,
              // Giữ nguyên trạng thái thu hồi nếu đã được thu hồi
              isRecalled: msg.isRecalled || updatedMessage.isRecalled,
              text: msg.isRecalled ? "" : updatedMessage.text,
              imageUrl: msg.isRecalled ? "" : updatedMessage.imageUrl,
              videoUrl: msg.isRecalled ? "" : updatedMessage.videoUrl,
              fileUrl: msg.isRecalled ? "" : updatedMessage.fileUrl,
              fileName: msg.isRecalled ? "" : updatedMessage.fileName,
            };
          }
          return msg;
        })
      );
    });

    // Thêm socket listeners cho friend request
    socketConnection.on("new-friend-request", (data) => {
      console.log("Received new friend request:", data);
      setFriendRequestStatus((prev) => ({
        ...prev,
        hasPendingRequest: true,
        requestId: data.requestId,
        isReceiver: true,
      }));
      Alert.alert("Thông báo", "Bạn có lời mời kết bạn mới");
    });

    socketConnection.on("friend-request-accepted", (data) => {
      setFriendRequestStatus((prev) => ({
        ...prev,
        isFriend: true,
        hasPendingRequest: false,
        requestId: null,
      }));
      if (!friendRequestStatus.isReceiver) {
        Alert.alert("Thành công", "Đã trở thành bạn bè");
      }
    });

    socketConnection.on("friend-request-rejected", () => {
      setFriendRequestStatus((prev) => ({
        ...prev,
        hasPendingRequest: false,
        requestId: null,
      }));
      if (!friendRequestStatus.isReceiver) {
        Alert.alert("Thông báo", "Đã từ chối lời mời kết bạn");
      }
    });

    socketConnection.on("friend-request-sent", (data) => {
      if (data.success) {
        setFriendRequestStatus((prev) => ({
          ...prev,
          hasPendingRequest: true,
          requestId: data.requestId,
          isReceiver: false,
        }));
        Alert.alert("Thành công", "Đã gửi lời mời kết bạn");
      }
    });

    socketConnection.on("unfriend-success", (data) => {
      setFriendRequestStatus((prev) => ({
        ...prev,
        isFriend: false,
        hasPendingRequest: false,
        requestId: null,
      }));
      Alert.alert("Thành công", "Đã hủy kết bạn");
    });

    socketConnection.on("unfriend-received", (data) => {
      setFriendRequestStatus((prev) => ({
        ...prev,
        isFriend: false,
        hasPendingRequest: false,
        requestId: null,
      }));
      // Alert.alert("Thông báo", "Đối phương đã hủy kết bạn");
    });

    // Kiểm tra trạng thái kết bạn khi component mount
    const checkFriendRequestStatus = async () => {
      try {
        const response = await axios.post(
          `${API_URL}/api/check-friend-request`,
          {
            currentUserId: currentUser._id,
            targetUserId: userId,
          }
        );

        if (response.data.success) {
          setFriendRequestStatus({
            isFriend: response.data.isFriend,
            hasPendingRequest: response.data.hasPendingRequest,
            requestId: response.data.requestId,
            isReceiver: response.data.isReceiver,
          });
        }
      } catch (error) {
        console.error("Error checking friend request status:", error);
      }
    };

    if (currentUser._id && userId) {
      checkFriendRequestStatus();
    }

    // Add a small delay to ensure messages are loaded
    const timer = setTimeout(() => {
      socketConnection.emit("message-page", userId);
    }, 500);

    // Add socket listener for friends list
    socketConnection.on("friends", (data) => {
      console.log("friends data", data);
      setContacts(data);
    });

    // Get friends list for forwarding
    socketConnection.emit("get-friends");

    return () => {
      console.log("Disconnecting socket");
      clearTimeout(timer);
      socketConnection.disconnect();
      socketConnection.off("new-friend-request");
      socketConnection.off("friend-request-accepted");
      socketConnection.off("friend-request-rejected");
      socketConnection.off("friend-request-sent");
      socketConnection.off("unfriend-success");
      socketConnection.off("unfriend-received");
    };
  }, [userId, currentUser, navigation, friendRequestStatus.isReceiver]);

  useEffect(() => {
    if (flatListRef.current && messages.length > 0 && isNearBottom) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  }, [messages.length, isNearBottom]);

  // Thêm useEffect để xử lý khi mới vào chat
  useEffect(() => {
    if (flatListRef.current && messages.length > 0) {
      flatListRef.current.scrollToEnd({ animated: true });
      setIsNearBottom(true);
    }
  }, [userId]); // Khi userId thay đổi (vào chat mới)

  const handleContentSizeChange = () => {
    if (flatListRef.current && messages.length > 0 && isNearBottom) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  };

  const handleLayout = () => {
    if (flatListRef.current && messages.length > 0 && isNearBottom) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  };

  const handleScroll = (event) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const isCloseToBottom =
      contentSize.height - layoutMeasurement.height - contentOffset.y < 100;

    setIsNearBottom(isCloseToBottom);
    if (isCloseToBottom) {
      setIsScrolling(false);
    } else {
      setIsScrolling(true);
    }
  };

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
      replyTo: replyToMessage?._id,
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
    setReplyToMessage(null);

    // Thêm setTimeout để đảm bảo tin nhắn đã được thêm vào state
    setTimeout(() => {
      if (flatListRef.current) {
        flatListRef.current.scrollToEnd({ animated: true });
      }
    }, 100);
  };

  const handleDeleteMessage = (messageId, isOwnMessage) => {
    Alert.alert(
      "Xóa tin nhắn",
      isOwnMessage
        ? "Bạn có chắc chắn muốn xóa tin nhắn này không?"
        : "Bạn có chắc chắn muốn xóa tin nhắn này chỉ ở phía bạn không?",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xóa",
          style: "destructive",
          onPress: () => {
            if (socket) {
              console.log("Emitting delete-message with:", {
                messageId,
                userId: currentUser._id,
                conversationId: conversationId,
                deleteForEveryone: isOwnMessage,
              });
              socket.emit("delete-message", {
                messageId,
                userId: currentUser._id,
                conversationId: conversationId,
                deleteForEveryone: isOwnMessage,
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

  const handleRecallMessage = (messageId) => {
    Alert.alert(
      "Thu hồi tin nhắn",
      "Bạn có chắc chắn muốn thu hồi tin nhắn này không?",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Thu hồi",
          style: "destructive",
          onPress: () => {
            if (socket) {
              console.log("Emitting recall-message with:", {
                messageId,
                userId: currentUser._id,
                conversationId: conversationId,
              });
              socket.emit("recall-message", {
                messageId,
                userId: currentUser._id,
                conversationId: conversationId,
              });
            } else {
              Alert.alert(
                "Lỗi",
                "Không thể thu hồi tin nhắn. Kết nối server bị gián đoạn."
              );
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const handleUploadImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
      allowsEditing: true,
      aspect: [4, 3],
    });

    if (!result.canceled) {
      const file = {
        uri: result.assets[0].uri,
        type: "image/jpeg",
        name: "image.jpg",
      };

      setLoading(true);
      try {
        const uploadPhoto = await uploadFile(file);
        console.log("Upload result:", uploadPhoto); // Debug log

        if (uploadPhoto && uploadPhoto.url) {
          // Gửi ảnh ngay lập tức
          if (socket) {
            const messageData = {
              sender: currentUser._id,
              receiver: userId,
              text: "",
              imageUrl: uploadPhoto.url,
              videoUrl: "",
              fileUrl: "",
              fileName: "",
              msgByUserId: currentUser._id,
              replyTo: replyToMessage?._id,
            };
            console.log("Sending message:", messageData); // Debug log
            socket.emit("new massage", messageData);

            // Thêm tin nhắn vào local state
            const tempMessage = {
              ...messageData,
              _id: Date.now().toString(),
              createdAt: new Date(),
            };
            setMessages((prevMessages) => [...prevMessages, tempMessage]);
          }

          // Reset state
          setNewMessage({
            text: "",
            imageUrl: "",
            videoUrl: "",
          });
          setReplyToMessage(null);
        } else {
          throw new Error("Upload failed - no URL returned");
        }
      } catch (error) {
        console.error("Upload error:", error);
        Alert.alert("Lỗi", "Không thể tải ảnh lên", [{ text: "OK" }]);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleUploadVideo = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      quality: 1,
      allowsEditing: true,
      videoMaxDuration: 30,
    });

    if (!result.canceled) {
      const file = {
        uri: result.assets[0].uri,
        type: "video/mp4",
        name: "video.mp4",
      };

      setLoading(true);
      try {
        const uploadResult = await uploadFile(file);
        console.log("Upload result:", uploadResult); // Debug log

        if (uploadResult && uploadResult.url) {
          // Gửi video ngay lập tức
          if (socket) {
            const messageData = {
              sender: currentUser._id,
              receiver: userId,
              text: "",
              imageUrl: "",
              videoUrl: uploadResult.url,
              fileUrl: "",
              fileName: "",
              msgByUserId: currentUser._id,
              replyTo: replyToMessage?._id,
            };
            console.log("Sending message:", messageData); // Debug log
            socket.emit("new massage", messageData);

            // Thêm tin nhắn vào local state
            const tempMessage = {
              ...messageData,
              _id: Date.now().toString(),
              createdAt: new Date(),
            };
            setMessages((prevMessages) => [...prevMessages, tempMessage]);
          }

          // Reset state
          setNewMessage({
            text: "",
            imageUrl: "",
            videoUrl: "",
          });
          setReplyToMessage(null);
        } else {
          throw new Error("Upload failed - no URL returned");
        }
      } catch (error) {
        console.error("Upload error:", error);
        Alert.alert("Lỗi", "Không thể tải video lên", [{ text: "OK" }]);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleUploadFile = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      quality: 1,
    });

    if (!result.canceled) {
      const file = {
        uri: result.assets[0].uri,
        type: result.assets[0].mimeType,
        name: result.assets[0].fileName || "file",
      };

      setLoading(true);
      try {
        const uploadResult = await uploadFile(file);
        console.log("Upload result:", uploadResult); // Debug log

        if (uploadResult && uploadResult.url) {
          // Gửi file ngay lập tức
          if (socket) {
            const messageData = {
              sender: currentUser._id,
              receiver: userId,
              text: "",
              imageUrl: "",
              videoUrl: "",
              fileUrl: uploadResult.url,
              fileName: file.name,
              msgByUserId: currentUser._id,
              replyTo: replyToMessage?._id,
            };
            console.log("Sending message:", messageData); // Debug log
            socket.emit("new massage", messageData);

            // Thêm tin nhắn vào local state
            const tempMessage = {
              ...messageData,
              _id: Date.now().toString(),
              createdAt: new Date(),
            };
            setMessages((prevMessages) => [...prevMessages, tempMessage]);
          }

          // Reset state
          setNewMessage({
            text: "",
            imageUrl: "",
            videoUrl: "",
          });
          setReplyToMessage(null);
        } else {
          throw new Error("Upload failed - no URL returned");
        }
      } catch (error) {
        console.error("Upload error:", error);
        Alert.alert("Lỗi", "Không thể tải file lên", [{ text: "OK" }]);
      } finally {
        setLoading(false);
      }
    }
  };

  // Cập nhật lại hàm handlePickMedia để sử dụng các hàm mới
  const handlePickMedia = (type) => {
    if (type === "image") {
      handleUploadImage();
    } else if (type === "video") {
      handleUploadVideo();
    } else {
      handleUploadFile();
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

  // Thêm socket listener cho recall message
  useEffect(() => {
    if (!socket) return;

    socket.on("recall-message-success", (data) => {
      console.log("Message recalled successfully:", data);
      // Cập nhật lại danh sách tin nhắn
      setMessages((prevMessages) =>
        prevMessages.map((msg) => {
          if (msg._id === data.messageId) {
            return {
              ...msg,
              isRecalled: true,
            };
          }
          return msg;
        })
      );
    });

    socket.on("recall-message-error", (data) => {
      console.error("Recall message error:", data);
      Alert.alert("Lỗi", data.error || "Không thể thu hồi tin nhắn");
    });

    return () => {
      socket.off("recall-message-success");
      socket.off("recall-message-error");
    };
  }, [socket]);

  // Xử lý gửi lời mời kết bạn
  const handleSendFriendRequest = async () => {
    try {
      setLoading(true);
      const response = await axios.post(`${API_URL}/api/send-friend-request`, {
        currentUserId: currentUser._id,
        targetUserId: userId,
      });

      if (response.data.success) {
        socket.emit("send-friend-request", {
          targetUserId: userId,
        });

        setFriendRequestStatus((prev) => ({
          ...prev,
          hasPendingRequest: true,
        }));
      }
    } catch (error) {
      console.error("Error sending friend request:", error);
      Alert.alert("Lỗi", error?.response?.data?.message || "Có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  };

  // Xử lý phản hồi lời mời kết bạn
  const handleFriendRequestResponse = async (action) => {
    try {
      const response = await axios.post(
        `${API_URL}/api/handle-friend-request`,
        {
          currentUserId: currentUser._id,
          requestId: friendRequestStatus.requestId,
          action,
        }
      );

      if (response.data.success) {
        socket.emit("friend-request-response", {
          requestId: friendRequestStatus.requestId,
          action,
        });

        setFriendRequestStatus((prev) => ({
          ...prev,
          hasPendingRequest: false,
          isFriend: action === "accept",
        }));
      }
    } catch (error) {
      console.error("Error handling friend request:", error);
      Alert.alert(
        "Lỗi",
        error?.response?.data?.message ||
          "Có lỗi xảy ra khi xử lý yêu cầu kết bạn"
      );
    }
  };

  // Xử lý hủy kết bạn
  const handleUnfriend = () => {
    Alert.alert("Xác nhận", "Bạn có chắc chắn muốn hủy kết bạn không?", [
      {
        text: "Hủy",
        style: "cancel",
      },
      {
        text: "Đồng ý",
        onPress: () => {
          socket.emit("unfriend", {
            targetUserId: userId,
          });
        },
      },
    ]);
  };

  const handleReplyMessage = (msg) => {
    setReplyToMessage(msg);
    setShowMessageMenu(null);
  };

  const handleReplyClick = (messageId) => {
    const originalMessage = messages.find((msg) => msg._id === messageId);
    if (originalMessage) {
      // Scroll to the original message
      const messageIndex = messages.findIndex((msg) => msg._id === messageId);
      if (messageIndex !== -1 && flatListRef.current) {
        flatListRef.current.scrollToIndex({
          index: messageIndex,
          animated: true,
          viewPosition: 0.5,
        });
      }
    }
  };

  // Thêm hàm để mở modal chuyển tiếp
  const handleOpenForwardModal = (message) => {
    setSelectedMessage(message);
    setShowForwardModal(true);
    // Gọi sự kiện get-friends mỗi khi mở modal
    if (socket) {
      socket.emit("get-friends");
    }
  };

  // Cập nhật lại hàm handleForwardMessage
  const handleForwardMessage = () => {
    if (!socket || !selectedMessage || selectedContacts.size === 0) {
      Alert.alert("Lỗi", "Vui lòng chọn người nhận");
      return;
    }

    try {
      // Gửi tin nhắn đến từng người được chọn
      selectedContacts.forEach((receiverId) => {
        socket.emit("forward message", {
          messageId: selectedMessage._id,
          sender: currentUser._id,
          receiver: receiverId,
          currentChatUserId: userId,
        });
      });

      // Đóng modal và reset state
      setShowForwardModal(false);
      setSelectedContacts(new Set());
      setSelectedMessage(null);

      // Hiển thị thông báo ngắn gọn
      Alert.alert("Đã chuyển tiếp");
    } catch (error) {
      console.error("Error forwarding message:", error);
      Alert.alert("Lỗi", "Không thể chuyển tiếp tin nhắn");
    }
  };

  // Add socket listener for forward message success
  useEffect(() => {
    if (!socket) return;

    socket.on("forward-message-success", (data) => {
      console.log("Message forwarded successfully:", data);
    });

    socket.on("forward-message-error", (data) => {
      console.error("Forward message error:", data);
      Alert.alert("Lỗi", data.error || "Không thể chuyển tiếp tin nhắn");
    });

    return () => {
      socket.off("forward-message-success");
      socket.off("forward-message-error");
    };
  }, [socket]);

  const renderMessage = ({ item }) => {
    const isSent =
      typeof item.msgByUserId === "object"
        ? item.msgByUserId._id === currentUser._id
        : item.msgByUserId === currentUser._id;
    const isRecalled = item.isRecalled;

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
        {/* Reply message header */}
        {item.replyToMessage && !isRecalled && (
          <TouchableOpacity
            onPress={() => handleReplyClick(item.replyToMessage._id)}
            style={[
              styles.replyHeader,
              { left: isSent ? "auto" : 10, right: isSent ? 10 : "auto" },
            ]}
          >
            <Ionicons name="return-up-back" size={14} color="#666" />
            <Text style={styles.replyHeaderText}>Trả lời tin nhắn</Text>
          </TouchableOpacity>
        )}

        {/* Reply message display */}
        {item.replyToMessage && !isRecalled && (
          <TouchableOpacity
            onPress={() => handleReplyClick(item.replyToMessage._id)}
            style={[
              styles.replyContainer,
              {
                position: "absolute",
                top: -8,
                left: isSent ? "auto" : 0,
                right: isSent ? 0 : "auto",
                width: "85%",
              },
            ]}
          >
            <View style={styles.replyContent}>
              <Text style={styles.replyName} numberOfLines={1}>
                {item.replyToMessage.msgByUserId._id === currentUser._id
                  ? "Bạn"
                  : userName}
              </Text>
              <Text style={styles.replyText} numberOfLines={1}>
                {item.replyToMessage.text ||
                  (item.replyToMessage.imageUrl ? "Hình ảnh" : "") ||
                  (item.replyToMessage.videoUrl ? "Video" : "") ||
                  (item.replyToMessage.fileUrl ? "Tệp đính kèm" : "")}
              </Text>
            </View>
          </TouchableOpacity>
        )}

        <View
          style={[
            styles.messageContainer,
            isSent ? styles.sentMessage : styles.receivedMessage,
            { marginTop: item.replyToMessage ? 24 : 0 },
          ]}
        >
          {isRecalled ? (
            <Text style={styles.recalledMessage}>
              {isSent
                ? "Bạn đã thu hồi một tin nhắn"
                : "Tin nhắn đã được thu hồi"}
            </Text>
          ) : (
            <>
              {/* Message content */}
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
                    isSent
                      ? styles.sentMessageText
                      : styles.receivedMessageText,
                  ]}
                >
                  {item.text}
                </Text>
              )}
            </>
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
            {!isRecalled && (
              <TouchableOpacity
                style={styles.menuButton}
                onPress={() => {
                  setSelectedMessageForReaction(item);
                  setShowMessageMenu(!showMessageMenu);
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

        {showMessageMenu && selectedMessageForReaction?._id === item._id && (
          <View style={styles.messageMenu}>
            {isSent && !isRecalled && (
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  handleRecallMessage(item._id);
                  setShowMessageMenu(false);
                }}
              >
                <Ionicons name="trash-outline" size={20} color="#ff3b30" />
                <Text style={[styles.menuItemText, { color: "#ff3b30" }]}>
                  Thu hồi
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                handleDeleteMessage(item._id, isSent);
                setShowMessageMenu(false);
              }}
            >
              <Ionicons name="trash-outline" size={20} color="#ff3b30" />
              <Text style={[styles.menuItemText, { color: "#ff3b30" }]}>
                Xóa tin nhắn
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                handleReplyMessage(item);
                setShowMessageMenu(false);
              }}
            >
              <Ionicons name="arrow-undo" size={20} color="#007AFF" />
              <Text style={[styles.menuItemText, { color: "#007AFF" }]}>
                Trả lời
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                handleOpenForwardModal(item);
                setShowMessageMenu(null);
              }}
            >
              <Ionicons name="arrow-redo" size={20} color="#007AFF" />
              <Text style={[styles.menuItemText, { color: "#007AFF" }]}>
                Chuyển tiếp
              </Text>
            </TouchableOpacity>
          </View>
        )}
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
        <View style={styles.headerActions}>
          {!friendRequestStatus.isFriend &&
            !friendRequestStatus.hasPendingRequest && (
              <TouchableOpacity
                onPress={handleSendFriendRequest}
                disabled={loading}
                style={[styles.actionButton, loading && styles.disabledButton]}
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.actionButtonText}>Kết bạn</Text>
                )}
              </TouchableOpacity>
            )}

          {friendRequestStatus.hasPendingRequest &&
            friendRequestStatus.isReceiver && (
              <View style={styles.requestActions}>
                <TouchableOpacity
                  onPress={() => handleFriendRequestResponse("accept")}
                  style={[styles.actionButton, { backgroundColor: "#22c55e" }]}
                >
                  <Text style={styles.actionButtonText}>Chấp nhận</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleFriendRequestResponse("reject")}
                  style={[styles.actionButton, { backgroundColor: "#ef4444" }]}
                >
                  <Text style={styles.actionButtonText}>Từ chối</Text>
                </TouchableOpacity>
              </View>
            )}

          {friendRequestStatus.hasPendingRequest &&
            !friendRequestStatus.isReceiver && (
              <TouchableOpacity
                disabled
                style={[
                  styles.actionButton,
                  { backgroundColor: "#6b7280", opacity: 0.7 },
                ]}
              >
                <Text style={styles.actionButtonText}>Đã gửi yêu cầu</Text>
              </TouchableOpacity>
            )}

          {friendRequestStatus.isFriend && (
            <TouchableOpacity
              onPress={handleUnfriend}
              style={[styles.actionButton, { backgroundColor: "#ef4444" }]}
            >
              <Text style={styles.actionButtonText}>Hủy kết bạn</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {friendRequestStatus.isFriend ? (
        <>
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item._id}
            contentContainerStyle={styles.messageList}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            onContentSizeChange={handleContentSizeChange}
            onLayout={handleLayout}
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

            {/* Reply Preview */}
            {replyToMessage && (
              <View style={styles.replyPreview}>
                <View style={styles.replyPreviewContent}>
                  <Text style={styles.replyPreviewName}>
                    {replyToMessage.msgByUserId._id === currentUser._id
                      ? "Bạn"
                      : userName}
                  </Text>
                  <Text style={styles.replyPreviewText} numberOfLines={1}>
                    {replyToMessage.text ||
                      (replyToMessage.imageUrl ? "(Hình ảnh)" : "") ||
                      (replyToMessage.videoUrl ? "(Video)" : "") ||
                      (replyToMessage.fileUrl ? "(File)" : "")}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setReplyToMessage(null)}
                  style={styles.closeReply}
                >
                  <Ionicons name="close" size={20} color="#666" />
                </TouchableOpacity>
              </View>
            )}

            <TextInput
              style={styles.input}
              placeholder="Nhập tin nhắn..."
              value={newMessage.text}
              onChangeText={(text) =>
                setNewMessage((prev) => ({ ...prev, text }))
              }
            />
            <TouchableOpacity onPress={handleSendMessage}>
              <Ionicons name="send" size={24} color="#007AFF" />
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <View style={styles.notFriendContainer}>
          <Text style={styles.notFriendText}>
            Bạn cần trở thành bạn bè với {userName} để trò chuyện.
          </Text>
          {!friendRequestStatus.hasPendingRequest && (
            <TouchableOpacity
              onPress={handleSendFriendRequest}
              disabled={loading}
              style={[styles.actionButton, loading && styles.disabledButton]}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.actionButtonText}>Gửi lời mời kết bạn</Text>
              )}
            </TouchableOpacity>
          )}
          {friendRequestStatus.hasPendingRequest &&
            !friendRequestStatus.isReceiver && (
              <Text style={styles.pendingText}>
                Đang chờ {userName} chấp nhận lời mời kết bạn...
              </Text>
            )}
          {friendRequestStatus.hasPendingRequest &&
            friendRequestStatus.isReceiver && (
              <View style={styles.requestActions}>
                <TouchableOpacity
                  onPress={() => handleFriendRequestResponse("accept")}
                  style={[styles.actionButton, { backgroundColor: "#22c55e" }]}
                >
                  <Text style={styles.actionButtonText}>Chấp nhận</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleFriendRequestResponse("reject")}
                  style={[styles.actionButton, { backgroundColor: "#ef4444" }]}
                >
                  <Text style={styles.actionButtonText}>Từ chối</Text>
                </TouchableOpacity>
              </View>
            )}
        </View>
      )}

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

      <Modal
        visible={showForwardModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setShowForwardModal(false);
          setSelectedContacts(new Set());
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.forwardModal}>
            <View style={styles.forwardModalHeader}>
              <Text style={styles.forwardModalTitle}>Chuyển tiếp tin nhắn</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowForwardModal(false);
                  setSelectedContacts(new Set());
                }}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={contacts}
              keyExtractor={(item) => item._id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.contactItem,
                    selectedContacts.has(item._id) && styles.selectedContact,
                  ]}
                  onPress={() => {
                    setSelectedContacts((prev) => {
                      const newSet = new Set(prev);
                      if (newSet.has(item._id)) {
                        newSet.delete(item._id);
                      } else {
                        newSet.add(item._id);
                      }
                      return newSet;
                    });
                  }}
                >
                  <Image
                    source={{
                      uri: item.profile_pic || "https://via.placeholder.com/50",
                    }}
                    style={styles.contactAvatar}
                  />
                  <View style={styles.contactInfo}>
                    <Text style={styles.contactName}>{item.name}</Text>
                    <Text style={styles.contactStatus}>
                      {item.online ? "Online" : "Offline"}
                    </Text>
                  </View>
                  {selectedContacts.has(item._id) && (
                    <View style={styles.checkmark}>
                      <Ionicons name="checkmark" size={16} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
              )}
              style={styles.contactsList}
            />
            <View style={styles.forwardModalFooter}>
              <Text style={styles.selectedCount}>
                Đã chọn: {selectedContacts.size} người
              </Text>
              <View style={styles.forwardModalActions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => {
                    setShowForwardModal(false);
                    setSelectedContacts(new Set());
                  }}
                >
                  <Text style={styles.cancelButtonText}>Đóng</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.forwardButton,
                    selectedContacts.size === 0 && styles.disabledButton,
                  ]}
                  onPress={handleForwardMessage}
                  disabled={selectedContacts.size === 0}
                >
                  <Text style={styles.forwardButtonText}>
                    Chuyển tiếp ({selectedContacts.size})
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
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
    padding: 8,
    borderRadius: 15,
    maxWidth: "100%",
    marginTop: (item) => (item.replyToMessage ? 14 : 0),
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
    backgroundColor: "rgba(0, 0, 0, 0.5)",
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
  recalledMessage: {
    fontStyle: "italic",
    color: "#666",
    fontSize: 14,
  },
  messageMenu: {
    position: "absolute",
    right: 0,
    top: 0,
    backgroundColor: "white",
    borderRadius: 8,
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
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
  },
  menuItemText: {
    marginLeft: 8,
    fontSize: 14,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: "auto",
  },
  actionButton: {
    backgroundColor: "#3b82f6",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 8,
  },
  disabledButton: {
    opacity: 0.7,
  },
  actionButtonText: {
    color: "white",
    fontWeight: "500",
  },
  requestActions: {
    flexDirection: "row",
    gap: 8,
  },
  notFriendContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  notFriendText: {
    fontSize: 18,
    color: "#666",
    textAlign: "center",
    marginBottom: 20,
  },
  pendingText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginTop: 10,
  },
  replyHeader: {
    position: "absolute",
    top: -20,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    zIndex: 1,
  },
  replyHeaderText: {
    fontSize: 12,
    color: "#666",
    marginLeft: 4,
  },
  replyContainer: {
    backgroundColor: "rgba(0, 0, 0, 0.05)",
    borderLeftWidth: 3,
    borderLeftColor: "#0084ff",
    borderRadius: 4,
    padding: 6,
    marginBottom: 4,
    maxWidth: "100%",
    marginTop: -2,
  },
  replyContent: {
    flexDirection: "column",
  },
  replyName: {
    fontSize: 12,
    fontWeight: "500",
    color: "#0084ff",
    marginBottom: 1,
  },
  replyText: {
    fontSize: 11,
    color: "#666666",
    opacity: 0.9,
  },
  replyPreview: {
    position: "absolute",
    top: -50,
    left: 0,
    right: 0,
    backgroundColor: "#f8f9fa",
    borderLeftWidth: 4,
    borderLeftColor: "#0084ff",
    padding: 8,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 4,
    marginHorizontal: 10,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.18,
    shadowRadius: 1.0,
    elevation: 1,
  },
  replyPreviewContent: {
    flex: 1,
  },
  replyPreviewName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0084ff",
  },
  replyPreviewText: {
    fontSize: 12,
    color: "#666666",
    opacity: 0.8,
  },
  closeReply: {
    padding: 4,
  },
  forwardModal: {
    width: "90%",
    maxHeight: "80%",
    backgroundColor: "white",
    borderRadius: 12,
    overflow: "hidden",
  },
  forwardModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  forwardModalTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  contactsList: {
    maxHeight: "70%",
  },
  contactItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  selectedContact: {
    backgroundColor: "#e3f2fd",
  },
  contactAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  contactInfo: {
    marginLeft: 12,
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: "500",
  },
  contactStatus: {
    fontSize: 14,
    color: "#666",
  },
  checkmark: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#007AFF",
    justifyContent: "center",
    alignItems: "center",
  },
  forwardModalFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  selectedCount: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
  },
  forwardModalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#f0f0f0",
  },
  cancelButtonText: {
    color: "#666",
    fontSize: 16,
  },
  forwardButton: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  forwardButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "500",
  },
});

export default ChatScreen;
