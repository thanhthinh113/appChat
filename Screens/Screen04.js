import React, { useState, useContext, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
  Alert,
  FlatList,
} from "react-native";
import { AuthContext } from "../AuthContext.js";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import Screen05 from "./Screen05.js";
import ContactsTab from "../controllers/ContactsTab";
import GroupChat from "../Components/GroupChat";
import GroupAvatar from "../Components/GroupAvatar";

const Screen04 = ({ navigation }) => {
  const { currentUser, logout, socketConnection } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState("profile");
  const [groups, setGroups] = useState([]);
  const [showGroupChat, setShowGroupChat] = useState(false);

  useEffect(() => {
    if (!currentUser) {
      navigation.replace("Screen01");
    }

    // Lấy danh sách nhóm khi component mount
    if (socketConnection) {
      socketConnection.emit("get-user-groups");
      socketConnection.on("user-groups", (data) => {
        if (Array.isArray(data)) {
          setGroups(data);
        }
      });

      // Lắng nghe sự kiện nhóm mới
      socketConnection.on("new-group", (groupData) => {
        setGroups((prevGroups) => {
          const existingGroup = prevGroups.find((g) => g._id === groupData._id);
          if (existingGroup) {
            return prevGroups.map((g) =>
              g._id === groupData._id ? groupData : g
            );
          }
          return [...prevGroups, groupData];
        });
      });
    }

    return () => {
      if (socketConnection) {
        socketConnection.off("user-groups");
        socketConnection.off("new-group");
      }
    };
  }, [currentUser, socketConnection]);

  const handleLogout = async () => {
    Alert.alert(
      "Xác nhận đăng xuất",
      "Bạn có chắc chắn muốn đăng xuất khỏi tài khoản?",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Đăng xuất",
          onPress: async () => {
            try {
              await logout();
              navigation.replace("Screen01");
            } catch (error) {
              Alert.alert(
                "Lỗi",
                "Đăng xuất không thành công. Vui lòng thử lại."
              );
            }
          },
        },
      ]
    );
  };

  const renderProfileTab = () => (
    <ScrollView contentContainerStyle={styles.profileContent}>
      <View style={styles.avatarContainer}>
        {currentUser?.profile_pic ? (
          <Image
            source={{ uri: currentUser.profile_pic }}
            style={styles.avatar}
          />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.placeholderText}>
              {currentUser?.name?.charAt(0)?.toUpperCase() || "U"}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.infoSection}>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Tên người dùng</Text>
          <Text style={styles.infoValue}>
            {currentUser?.name || "Chưa cập nhật"}
          </Text>
        </View>

        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Số điện thoại</Text>
          <Text style={styles.infoValue}>
            {currentUser?.phone || "Chưa cập nhật"}
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.editButton}
        onPress={() => navigation.navigate("EditProfile")}
      >
        <Text style={styles.editButtonText}>Chỉnh sửa thông tin</Text>
        <Ionicons name="chevron-forward" size={20} color="#fff" />
      </TouchableOpacity>
    </ScrollView>
  );

  const renderGroupsTab = () => (
    <View style={styles.groupsContainer}>
      <FlatList
        data={groups}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.groupItem}
            onPress={() =>
              navigation.navigate("GroupChatScreen", { groupId: item._id })
            }
          >
            <GroupAvatar members={item.members || []} size={50} />
            <View style={styles.groupInfo}>
              <Text style={styles.groupName}>{item.name}</Text>
              <Text style={styles.groupMembers}>
                {item.members?.length || 0} thành viên
              </Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Chưa có nhóm chat nào</Text>
          </View>
        )}
      />
    </View>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case "messenger":
        return (
          <View style={styles.tabContent}>
            <Screen05 />
          </View>
        );
      case "contacts":
        return <ContactsTab />;
      case "groups":
        return renderGroupsTab();
      case "profile":
        return renderProfileTab();
      default:
        return null;
    }
  };

  if (!currentUser) return null;

  return (
    <View style={styles.container}>
      {/* Main Content */}
      {renderTabContent()}

      {/* Bottom Tab Navigation */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setActiveTab("messenger")}
        >
          <Ionicons
            name={
              activeTab === "messenger" ? "chatbubbles" : "chatbubbles-outline"
            }
            size={24}
            color={activeTab === "messenger" ? "#007AFF" : "#666"}
          />
          <Text
            style={[
              styles.tabLabel,
              { color: activeTab === "messenger" ? "#007AFF" : "#666" },
            ]}
          >
            Messenger
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setActiveTab("contacts")}
        >
          <Ionicons
            name={activeTab === "contacts" ? "people" : "people-outline"}
            size={24}
            color={activeTab === "contacts" ? "#007AFF" : "#666"}
          />
          <Text
            style={[
              styles.tabLabel,
              { color: activeTab === "contacts" ? "#007AFF" : "#666" },
            ]}
          >
            Danh bạ
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setShowGroupChat(true)}
        >
          <View style={styles.addButton}>
            <Ionicons name="add" size={24} color="#fff" />
          </View>
          <Text style={styles.tabLabel}>Tạo nhóm</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setActiveTab("groups")}
        >
          <Ionicons
            name={activeTab === "groups" ? "people" : "people-outline"}
            size={24}
            color={activeTab === "groups" ? "#007AFF" : "#666"}
          />
          <Text
            style={[
              styles.tabLabel,
              { color: activeTab === "groups" ? "#007AFF" : "#666" },
            ]}
          >
            Nhóm
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setActiveTab("profile")}
        >
          <Ionicons
            name={activeTab === "profile" ? "person" : "person-outline"}
            size={24}
            color={activeTab === "profile" ? "#007AFF" : "#666"}
          />
          <Text
            style={[
              styles.tabLabel,
              { color: activeTab === "profile" ? "#007AFF" : "#666" },
            ]}
          >
            Cá nhân
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.tabItem} onPress={handleLogout}>
          <MaterialIcons name="logout" size={24} color="#FF3B30" />
          <Text style={[styles.tabLabel, { color: "#FF3B30" }]}>Đăng xuất</Text>
        </TouchableOpacity>
      </View>

      {showGroupChat && <GroupChat onClose={() => setShowGroupChat(false)} />}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  profileContent: {
    padding: 20,
    paddingBottom: 80,
  },
  avatarContainer: {
    alignItems: "center",
    marginVertical: 20,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: "#007AFF",
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#e1e1e1",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#007AFF",
  },
  placeholderText: {
    fontSize: 36,
    color: "#666",
    fontWeight: "bold",
  },
  infoSection: {
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    paddingTop: 20,
  },
  infoItem: {
    marginBottom: 25,
    paddingHorizontal: 10,
  },
  infoLabel: {
    fontSize: 14,
    color: "#666",
    marginBottom: 5,
  },
  infoValue: {
    fontSize: 16,
    color: "#333",
    fontWeight: "500",
  },
  editButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#007AFF",
    padding: 15,
    borderRadius: 10,
    marginTop: 30,
  },
  editButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  tabContent: {
    flex: 1,
    marginTop: 40,
  },
  tabPlaceholder: {
    marginTop: 15,
    color: "#999",
    fontSize: 16,
  },
  tabBar: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    height: 60,
    borderTopWidth: 1,
    borderColor: "#eee",
    backgroundColor: "#fff",
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  tabItem: {
    alignItems: "center",
    justifyContent: "center",
    padding: 5,
  },
  tabLabel: {
    fontSize: 12,
    marginTop: 5,
  },
  groupsContainer: {
    flex: 1,
    padding: 16,
    paddingBottom: 80,
  },
  groupItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  groupInfo: {
    marginLeft: 12,
  },
  groupName: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
  },
  groupMembers: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#007AFF",
    justifyContent: "center",
    alignItems: "center",
  },
});

export default Screen04;
