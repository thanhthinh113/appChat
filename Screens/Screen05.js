import React, { useState, useEffect, useContext } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  FlatList,
  Image,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { AuthContext } from "../AuthContext.js";
import io from "socket.io-client";

const Screen05 = () => {
  const navigation = useNavigation();
  const { currentUser } = useContext(AuthContext);
  const [contacts, setContacts] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [activeTab, setActiveTab] = useState("messages");
  const [socket, setSocket] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser?.token) {
      Alert.alert("Lỗi", "Vui lòng đăng nhập lại");
      navigation.replace("Screen01");
      return;
    }

    console.log("Current user:", currentUser);
    console.log("Token:", currentUser.token);

    const socketConnection = io("http://localhost:8080", {
      auth: { token: currentUser.token },
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    setSocket(socketConnection);

    socketConnection.on("connect", () => {
      console.log("Socket connected successfully");
      setLoading(true);
      socketConnection.emit("sidebar", currentUser._id);
    });

    socketConnection.on("connect_error", (error) => {
      console.error("Socket connection error:", error.message);
      setLoading(false);
      Alert.alert(
        "Lỗi kết nối",
        "Không thể kết nối đến server. Vui lòng thử lại sau."
      );
    });

    socketConnection.on("conversation", (data) => {
      console.log("Received conversations:", data);
      setLoading(false);

      if (!data || !Array.isArray(data)) {
        console.error("Invalid conversation data received");
        return;
      }

      const conversationUserData = data
        .map((conversationUser) => {
          if (!conversationUser) return null;

          if (
            conversationUser?.sender?._id === conversationUser?.receiver?._id
          ) {
            return {
              ...conversationUser,
              userDetails: conversationUser?.sender,
            };
          } else if (conversationUser?.receiver?._id !== currentUser?._id) {
            return {
              ...conversationUser,
              userDetails: conversationUser.receiver,
            };
          } else {
            return {
              ...conversationUser,
              userDetails: conversationUser.sender,
            };
          }
        })
        .filter(Boolean);

      setContacts(conversationUserData);
    });

    socketConnection.on("user-updated", (data) => {
      setContacts((prevContacts) =>
        prevContacts.map((contact) => {
          if (contact.userDetails._id === data.userId) {
            return {
              ...contact,
              userDetails: {
                ...contact.userDetails,
                ...data.updates,
              },
            };
          }
          return contact;
        })
      );
    });

    socketConnection.on("error", (error) => {
      console.error("Server error:", error.message);
      setLoading(false);
      Alert.alert("Lỗi", error.message || "Không thể tải danh sách chat");
    });

    // Add a timer to re-emit sidebar event after connection
    const timer = setTimeout(() => {
      if (socketConnection.connected) {
        socketConnection.emit("sidebar", currentUser._id);
      }
    }, 1000);

    return () => {
      console.log("Disconnecting socket");
      clearTimeout(timer);
      if (socketConnection) {
        socketConnection.disconnect();
      }
    };
  }, [currentUser, navigation]);

  const filteredContacts = contacts.filter((contact) =>
    contact?.userDetails?.name?.toLowerCase().includes(searchText.toLowerCase())
  );

  const handlePersonalPress = () => {
    setActiveTab("personal");
    navigation.navigate("Screen04");
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Đang tải danh sách chat...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Thanh tìm kiếm */}
      <View style={styles.searchBar}>
        <Ionicons name="search" size={20} color="#999" />
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm kiếm"
          value={searchText}
          onChangeText={setSearchText}
        />
      </View>

      {/* Danh sách người đã nhắn tin */}
      {contacts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="chatbubbles-outline" size={50} color="#999" />
          <Text style={styles.emptyText}>
            Không có cuộc trò chuyện nào. Tìm kiếm người dùng để bắt đầu!
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredContacts}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.contactItem}
              onPress={() =>
                navigation.navigate("ChatScreen", {
                  userId: item.userDetails._id.toString(),
                  userName: item.userDetails.name,
                  userProfilePic: item.userDetails.profile_pic,
                })
              }
            >
              <Image
                source={{
                  uri:
                    item.userDetails.profile_pic ||
                    "https://via.placeholder.com/50",
                }}
                style={styles.avatar}
              />
              <View style={styles.contactInfo}>
                <Text style={styles.contactName}>{item.userDetails.name}</Text>
                <Text style={styles.lastMessage}>
                  {item.lastMsg?.text || item.lastMsg?.imageUrl
                    ? "Hình ảnh"
                    : item.lastMsg?.videoUrl
                    ? "Video"
                    : ""}
                </Text>
              </View>
              {item.unseenMsg > 0 && (
                <View style={styles.unseenBadge}>
                  <Text style={styles.unseenText}>{item.unseenMsg}</Text>
                </View>
              )}
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* Tab điều hướng phía dưới */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setActiveTab("messages")}
        >
          <Ionicons
            name="chatbubbles"
            size={24}
            color={activeTab === "messages" ? "#007AFF" : "#666"}
          />
          <Text
            style={[
              styles.tabText,
              { color: activeTab === "messages" ? "#007AFF" : "#666" },
            ]}
          >
            Tin nhắn
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.tabItem} onPress={handlePersonalPress}>
          <Ionicons
            name="person"
            size={24}
            color={activeTab === "personal" ? "#007AFF" : "#666"}
          />
          <Text
            style={[
              styles.tabText,
              { color: activeTab === "personal" ? "#007AFF" : "#666" },
            ]}
          >
            Cá nhân
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#666",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    margin: 15,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 50,
  },
  emptyText: {
    fontSize: 16,
    color: "#999",
    textAlign: "center",
    marginTop: 10,
  },
  listContent: {
    paddingBottom: 70,
  },
  contactItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  contactInfo: {
    flex: 1,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
  },
  contactName: {
    fontSize: 16,
    fontWeight: "500",
  },
  lastMessage: {
    fontSize: 14,
    color: "#666",
  },
  unseenBadge: {
    backgroundColor: "#007AFF",
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: "auto",
  },
  unseenText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
  tabBar: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#eee",
    paddingVertical: 10,
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    padding: 5,
  },
  tabText: {
    fontSize: 12,
    marginTop: 5,
  },
});

export default Screen05;
