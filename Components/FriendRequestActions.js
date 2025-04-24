import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import axios from "axios";
import { API_URL } from "../config";

const FriendRequestActions = ({ targetUser, socketConnection }) => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [friendRequestStatus, setFriendRequestStatus] = useState({
    isFriend: false,
    hasPendingRequest: false,
    requestId: null,
    isReceiver: false,
  });

  // Kiểm tra trạng thái kết bạn khi component mount
  React.useEffect(() => {
    const checkFriendRequestStatus = async () => {
      try {
        const response = await axios.post(
          `${API_URL}/api/check-friend-request`,
          {
            currentUserId: currentUser._id,
            targetUserId: targetUser._id,
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

    if (currentUser._id && targetUser._id) {
      checkFriendRequestStatus();
    }
  }, [currentUser._id, targetUser._id]);

  // Xử lý gửi lời mời kết bạn
  const handleSendFriendRequest = async () => {
    try {
      setLoading(true);
      const response = await axios.post(`${API_URL}/api/send-friend-request`, {
        currentUserId: currentUser._id,
        targetUserId: targetUser._id,
      });

      if (response.data.success) {
        // Gửi socket event để thông báo cho người nhận
        socketConnection.emit("send-friend-request", {
          targetUserId: targetUser._id,
        });

        setFriendRequestStatus((prev) => ({
          ...prev,
          hasPendingRequest: true,
        }));

        Alert.alert("Thành công", "Đã gửi lời mời kết bạn");
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
        // Gửi socket event để thông báo cho người gửi
        socketConnection.emit("friend-request-response", {
          requestId: friendRequestStatus.requestId,
          action,
        });

        // Cập nhật trạng thái local
        setFriendRequestStatus((prev) => ({
          ...prev,
          hasPendingRequest: false,
          isFriend: action === "accept",
        }));

        Alert.alert(
          "Thành công",
          action === "accept"
            ? "Đã chấp nhận lời mời kết bạn"
            : "Đã từ chối lời mời kết bạn"
        );
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
          socketConnection.emit("unfriend", {
            targetUserId: targetUser._id,
          });
        },
      },
    ]);
  };

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      {!friendRequestStatus.isFriend &&
        !friendRequestStatus.hasPendingRequest && (
          <TouchableOpacity
            onPress={handleSendFriendRequest}
            disabled={loading}
            style={{
              backgroundColor: "#3b82f6",
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 8,
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={{ color: "white", fontWeight: "500" }}>Kết bạn</Text>
            )}
          </TouchableOpacity>
        )}

      {friendRequestStatus.hasPendingRequest &&
        friendRequestStatus.isReceiver && (
          <View style={{ flexDirection: "row", gap: 8 }}>
            <TouchableOpacity
              onPress={() => handleFriendRequestResponse("accept")}
              style={{
                backgroundColor: "#22c55e",
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 8,
              }}
            >
              <Text style={{ color: "white", fontWeight: "500" }}>
                Chấp nhận
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleFriendRequestResponse("reject")}
              style={{
                backgroundColor: "#ef4444",
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 8,
              }}
            >
              <Text style={{ color: "white", fontWeight: "500" }}>Từ chối</Text>
            </TouchableOpacity>
          </View>
        )}

      {friendRequestStatus.hasPendingRequest &&
        !friendRequestStatus.isReceiver && (
          <TouchableOpacity
            disabled
            style={{
              backgroundColor: "#6b7280",
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 8,
              opacity: 0.7,
            }}
          >
            <Text style={{ color: "white", fontWeight: "500" }}>
              Đã gửi yêu cầu
            </Text>
          </TouchableOpacity>
        )}

      {friendRequestStatus.isFriend && (
        <TouchableOpacity
          onPress={handleUnfriend}
          style={{
            backgroundColor: "#ef4444",
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 8,
          }}
        >
          <Text style={{ color: "white", fontWeight: "500" }}>Hủy kết bạn</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

export default FriendRequestActions;
