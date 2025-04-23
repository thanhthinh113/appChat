import React, { useState, useContext, useEffect } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import axios from "axios";
import { useNavigation } from "@react-navigation/native";
import { AuthContext } from "../AuthContext.js";

const UserSearchCard = ({ user, socketConnection }) => {
  const [isFriend, setIsFriend] = useState(user.isFriend);
  const [isLoading, setIsLoading] = useState(false);
  const [hasPendingRequest, setHasPendingRequest] = useState(false);
  const { currentUser } = useContext(AuthContext);
  const navigation = useNavigation();

  const handleSendFriendRequest = async () => {
    if (!currentUser?._id || !user?._id) {
      Alert.alert("Lỗi", "Không thể xác định thông tin người dùng");
      return;
    }

    try {
      setIsLoading(true);

      if (isFriend) {
        Alert.alert("Thông báo", "Các bạn đã là bạn bè");
        return;
      }

      const response = await axios.post(
        "http://localhost:8080/api/send-friend-request",
        {
          currentUserId: currentUser._id,
          targetUserId: user._id,
        },
        {
          headers: {
            Authorization: `Bearer ${currentUser.token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.data.success) {
        if (socketConnection) {
          socketConnection.emit("send-friend-request", {
            targetUserId: user._id,
          });
        }
        setHasPendingRequest(true);
        Alert.alert("Thành công", "Đã gửi lời mời kết bạn");
      }
    } catch (error) {
      console.error("Lỗi gửi lời mời:", error);
      if (error.response?.data?.message === "Friend request already exists") {
        setHasPendingRequest(true);
        Alert.alert("Thông báo", "Lời mời kết bạn đã được gửi trước đó");
      } else if (
        error.response?.data?.message === "Users are already friends"
      ) {
        setIsFriend(true);
        Alert.alert("Thông báo", "Các bạn đã là bạn bè");
      } else {
        Alert.alert("Lỗi", error.response?.data?.message || "Có lỗi xảy ra");
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!socketConnection) return;

    // Lắng nghe khi lời mời kết bạn được gửi thành công
    const handleFriendRequestSent = (data) => {
      if (data.success && data.requestId) {
        setHasPendingRequest(true);
      }
    };

    // Lắng nghe khi lời mời kết bạn được chấp nhận
    const handleFriendRequestAccepted = (data) => {
      if (data.friend && data.friend._id === user._id) {
        setIsFriend(true);
        setHasPendingRequest(false);
      }
    };

    // Lắng nghe khi lời mời kết bạn bị từ chối
    const handleFriendRequestRejected = (data) => {
      if (data.requestId) {
        setHasPendingRequest(false);
      }
    };

    // Lắng nghe khi có lỗi
    const handleError = (error) => {
      Alert.alert("Lỗi", error);
    };

    socketConnection.on("friend-request-sent", handleFriendRequestSent);
    socketConnection.on("friend-request-accepted", handleFriendRequestAccepted);
    socketConnection.on("friend-request-rejected", handleFriendRequestRejected);
    socketConnection.on("error", handleError);

    return () => {
      socketConnection.off("friend-request-sent", handleFriendRequestSent);
      socketConnection.off(
        "friend-request-accepted",
        handleFriendRequestAccepted
      );
      socketConnection.off(
        "friend-request-rejected",
        handleFriendRequestRejected
      );
      socketConnection.off("error", handleError);
    };
  }, [socketConnection, user._id]);

  const renderButton = () => {
    if (isFriend) {
      return <Text style={styles.friendText}>Bạn bè</Text>;
    }
    if (hasPendingRequest) {
      return <Text style={styles.pendingText}>Đã gửi lời mời</Text>;
    }
    return (
      <TouchableOpacity
        style={[styles.addFriendButton, isLoading && styles.disabledButton]}
        onPress={handleSendFriendRequest}
        disabled={isLoading}
      >
        <Text style={styles.addFriendText}>
          {isLoading ? "Đang xử lý..." : "Kết bạn"}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <TouchableOpacity
      style={styles.userItem}
      onPress={() => {
        navigation.navigate("ChatScreen", {
          userId: user._id,
          userName: user.name,
          userProfilePic: user.profile_pic,
        });
      }}
    >
      <Image
        source={{
          uri: user.profile_pic || "https://via.placeholder.com/50",
        }}
        style={styles.avatar}
      />
      <View style={styles.userInfo}>
        <Text style={styles.userName} numberOfLines={1}>
          {user.name}
        </Text>
        <Text style={styles.userPhone} numberOfLines={1}>
          {user.phone}
        </Text>
      </View>
      <View>{renderButton()}</View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  userItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#f0f0f0",
  },
  userInfo: {
    flex: 1,
    paddingHorizontal: 15,
  },
  userName: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
    marginBottom: 4,
  },
  userPhone: {
    fontSize: 14,
    color: "#777",
  },
  addFriendButton: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  disabledButton: {
    opacity: 0.5,
  },
  addFriendText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
  },
  friendText: {
    color: "#34C759",
    fontSize: 14,
    fontWeight: "500",
  },
  pendingText: {
    color: "#FF9500",
    fontSize: 14,
    fontWeight: "500",
  },
});

export default UserSearchCard;
