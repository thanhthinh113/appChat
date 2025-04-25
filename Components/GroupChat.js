import React, { useState, useEffect, useContext } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  StyleSheet,
  Alert,
  Modal,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { Ionicons, FontAwesome5 } from "@expo/vector-icons";
import { AuthContext } from "../AuthContext.js";
import GroupAvatar from "./GroupAvatar";

const GroupChat = ({ visible, onClose }) => {
  const { currentUser, socketConnection } = useContext(AuthContext);
  const [groupName, setGroupName] = useState("");
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [allUsers, setAllUsers] = useState([]);
  const [selectedUserDetails, setSelectedUserDetails] = useState([]);
  const [groups, setGroups] = useState([]);
  const [activeTab, setActiveTab] = useState("create"); // 'create' or 'list'
  const [loading, setLoading] = useState(false);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [loadingGroups, setLoadingGroups] = useState(false);

  // Fetch friends list
  const fetchFriends = () => {
    if (!socketConnection || !currentUser) {
      console.log("Socket or currentUser not available for friends");
      return;
    }
    console.log("Fetching friends for user:", currentUser._id);
    setLoadingFriends(true);
    socketConnection.emit("get-friends");
  };

  // Fetch groups list
  const fetchGroups = () => {
    if (!socketConnection || !currentUser) {
      console.log("Socket or currentUser not available for groups");
      return;
    }
    console.log("Fetching groups for user:", currentUser._id);
    setLoadingGroups(true);
    socketConnection.emit("get-user-groups");
  };

  // Debug socket connection
  useEffect(() => {
    if (socketConnection) {
      console.log("Socket connection status:", socketConnection.connected);
      console.log("Socket ID:", socketConnection.id);
    } else {
      console.log("Socket connection is null");
    }
  }, [socketConnection]);

  useEffect(() => {
    if (!socketConnection || !currentUser) {
      console.log("Socket or currentUser not available in useEffect");
      return;
    }

    console.log("Setting up socket listeners for user:", currentUser._id);

    // Socket event listeners
    socketConnection.on("connect", () => {
      console.log("Socket connected successfully");
      fetchFriends();
      fetchGroups();
    });

    socketConnection.on("connect_error", (error) => {
      console.error("Socket connection error:", error.message);
      Alert.alert("Lỗi kết nối", "Không thể kết nối đến máy chủ");
    });

    socketConnection.on("reconnect", () => {
      console.log("Socket reconnected");
      fetchFriends();
      fetchGroups();
    });

    socketConnection.on("friends", (data) => {
      console.log("Received friends data:", data);
      if (Array.isArray(data)) {
        const filteredFriends = data.filter(
          (friend) => friend._id !== currentUser._id
        );
        setAllUsers(filteredFriends);
      }
      setLoadingFriends(false);
    });

    socketConnection.on("user-groups", (data) => {
      console.log("Received groups data:", data);
      if (Array.isArray(data)) {
        console.log("Setting groups:", data);
        setGroups(data);
      } else {
        console.error("Invalid groups data received:", data);
        setGroups([]);
      }
      setLoadingGroups(false);
    });

    socketConnection.on("new-group", (groupData) => {
      console.log("New group received:", groupData);
      setGroups((prevGroups) => {
        const existingGroup = prevGroups.find((g) => g._id === groupData._id);
        if (existingGroup) {
          return prevGroups.map((g) =>
            g._id === groupData._id ? groupData : g
          );
        }
        return [...prevGroups, groupData];
      });
      Alert.alert("Thành công", "Nhóm chat mới đã được tạo");
      onClose();
    });

    socketConnection.on("group-created", (response) => {
      console.log("Group created response:", response);
      setLoading(false);
      if (response.success) {
        setGroups((prevGroups) => {
          const newGroups = [...prevGroups];
          const existingGroupIndex = newGroups.findIndex(
            (g) => g._id === response.group._id
          );
          if (existingGroupIndex !== -1) {
            newGroups[existingGroupIndex] = response.group;
          } else {
            newGroups.push(response.group);
          }
          return newGroups;
        });

        setGroupName("");
        setSelectedUsers([]);
        setSelectedUserDetails([]);
        setActiveTab("list");
        Alert.alert("Thành công", "Tạo nhóm thành công");
      } else {
        Alert.alert("Lỗi", response.message || "Có lỗi xảy ra khi tạo nhóm");
      }
    });

    socketConnection.on("error", (error) => {
      console.error("Socket error:", error);
      setLoading(false);
      setLoadingFriends(false);
      setLoadingGroups(false);
      Alert.alert("Lỗi", error);
    });

    // Fetch initial data
    fetchFriends();
    fetchGroups();

    return () => {
      console.log("Cleaning up socket listeners");
      socketConnection.off("connect");
      socketConnection.off("connect_error");
      socketConnection.off("reconnect");
      socketConnection.off("friends");
      socketConnection.off("user-groups");
      socketConnection.off("new-group");
      socketConnection.off("group-created");
      socketConnection.off("error");
    };
  }, [socketConnection, currentUser]);

  // Debug groups state
  useEffect(() => {
    console.log("Groups state updated:", groups);
  }, [groups]);

  // Hiển thị danh sách nhóm
  const renderGroupList = () => {
    if (loadingGroups) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Đang tải danh sách nhóm...</Text>
        </View>
      );
    }

    if (groups.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Bạn chưa tham gia nhóm nào</Text>
        </View>
      );
    }

    return (
      <FlatList
        data={groups}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.groupItem}
            onPress={() => {
              onClose();
              // Điều hướng đến màn hình chat nhóm
              // navigation.navigate('GroupChatScreen', { groupId: item._id });
            }}
          >
            <GroupAvatar members={item.members || []} size={40} />
            <View style={styles.groupInfo}>
              <Text style={styles.groupName}>{item.name}</Text>
              <View style={styles.groupMeta}>
                <Text style={styles.memberCount}>
                  {item.members?.length || 0} thành viên
                </Text>
                {item.creator?._id === currentUser._id && (
                  <View style={styles.creatorBadge}>
                    <Text style={styles.creatorText}>Người tạo</Text>
                  </View>
                )}
              </View>
            </View>
          </TouchableOpacity>
        )}
      />
    );
  };

  // Xử lý tạo nhóm mới
  const handleCreateGroup = () => {
    if (!socketConnection) {
      Alert.alert(
        "Lỗi",
        "Không thể kết nối đến máy chủ. Vui lòng thử lại sau."
      );
      return;
    }

    if (!groupName.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập tên nhóm");
      return;
    }

    if (selectedUsers.length < 2) {
      Alert.alert("Lỗi", "Vui lòng chọn ít nhất 2 thành viên");
      return;
    }

    const invalidUsers = selectedUsers.filter(
      (userId) => !allUsers.some((user) => user._id === userId)
    );

    if (invalidUsers.length > 0) {
      Alert.alert("Lỗi", "Có thành viên không hợp lệ. Vui lòng chọn lại.");
      return;
    }

    setLoading(true);
    socketConnection.emit("create-group", {
      name: groupName,
      members: selectedUsers,
      creator: currentUser._id,
    });
  };

  // Xử lý chọn/bỏ chọn thành viên
  const handleSelectUser = (selectedUser) => {
    if (selectedUsers.includes(selectedUser._id)) {
      setSelectedUsers(selectedUsers.filter((id) => id !== selectedUser._id));
      setSelectedUserDetails(
        selectedUserDetails.filter((user) => user._id !== selectedUser._id)
      );
    } else {
      setSelectedUsers([...selectedUsers, selectedUser._id]);
      setSelectedUserDetails([...selectedUserDetails, selectedUser]);
    }
  };

  // Xử lý xóa thành viên đã chọn
  const handleRemoveUser = (userId) => {
    setSelectedUsers(selectedUsers.filter((id) => id !== userId));
    setSelectedUserDetails(
      selectedUserDetails.filter((user) => user._id !== userId)
    );
  };

  // Lọc danh sách bạn bè theo từ khóa tìm kiếm
  const filteredUsers = allUsers.filter((user) =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Nhóm chat</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#000" />
            </TouchableOpacity>
          </View>

          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[
                styles.tabButton,
                activeTab === "create" && styles.activeTabButton,
              ]}
              onPress={() => setActiveTab("create")}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === "create" && styles.activeTabText,
                ]}
              >
                Tạo nhóm mới
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.tabButton,
                activeTab === "list" && styles.activeTabButton,
              ]}
              onPress={() => setActiveTab("list")}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === "list" && styles.activeTabText,
                ]}
              >
                Danh sách nhóm
              </Text>
            </TouchableOpacity>
          </View>

          {activeTab === "create" ? (
            <ScrollView style={styles.createContainer}>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  value={groupName}
                  onChangeText={setGroupName}
                  placeholder="Nhập tên nhóm..."
                />
              </View>

              {selectedUserDetails.length > 0 && (
                <View style={styles.selectedUsersContainer}>
                  {selectedUserDetails.map((user) => (
                    <View key={user._id} style={styles.selectedUserItem}>
                      <Text style={styles.selectedUserName}>{user.name}</Text>
                      <TouchableOpacity
                        onPress={() => handleRemoveUser(user._id)}
                        style={styles.removeUserButton}
                      >
                        <Ionicons
                          name="close-circle"
                          size={16}
                          color="#3b82f6"
                        />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              <View style={styles.searchContainer}>
                <FontAwesome5
                  name="search"
                  size={16}
                  color="#9ca3af"
                  style={styles.searchIcon}
                />
                <TextInput
                  style={styles.searchInput}
                  value={searchTerm}
                  onChangeText={setSearchTerm}
                  placeholder="Tìm bạn bè..."
                />
              </View>

              {loadingFriends ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#007AFF" />
                  <Text style={styles.loadingText}>
                    Đang tải danh sách bạn bè...
                  </Text>
                </View>
              ) : (
                <View style={styles.usersListContainer}>
                  {filteredUsers.map((user) => (
                    <TouchableOpacity
                      key={user._id}
                      style={[
                        styles.userItem,
                        selectedUsers.includes(user._id) &&
                          styles.selectedUserItem,
                      ]}
                      onPress={() => handleSelectUser(user)}
                    >
                      <View style={styles.userInfo}>
                        <Image
                          source={{
                            uri:
                              user.profile_pic ||
                              "https://via.placeholder.com/50",
                          }}
                          style={styles.userAvatar}
                        />
                        <Text style={styles.userName}>{user.name}</Text>
                      </View>
                      {selectedUsers.includes(user._id) && (
                        <View style={styles.checkmarkContainer}>
                          <Ionicons
                            name="checkmark-circle"
                            size={20}
                            color="#3b82f6"
                          />
                        </View>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <View style={styles.previewContainer}>
                <Text style={styles.previewTitle}>Xem trước avatar nhóm</Text>
                <View style={styles.avatarPreview}>
                  <GroupAvatar members={selectedUserDetails} size={80} />
                </View>
              </View>

              <View style={styles.footer}>
                <Text style={styles.selectedCount}>
                  Đã chọn: {selectedUsers.length} thành viên
                </Text>
                <TouchableOpacity
                  onPress={handleCreateGroup}
                  disabled={
                    !groupName.trim() || selectedUsers.length < 2 || loading
                  }
                  style={[
                    styles.createButton,
                    (!groupName.trim() ||
                      selectedUsers.length < 2 ||
                      loading) &&
                      styles.disabledButton,
                  ]}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.createButtonText}>Tạo nhóm</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          ) : (
            <View style={styles.listContainer}>{renderGroupList()}</View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    margin: 20,
    borderRadius: 12,
    maxHeight: "80%",
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  tabContainer: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
  },
  activeTabButton: {
    borderBottomWidth: 2,
    borderBottomColor: "#3b82f6",
  },
  tabText: {
    fontSize: 14,
    color: "#6b7280",
  },
  activeTabText: {
    color: "#3b82f6",
    fontWeight: "500",
  },
  createContainer: {
    padding: 16,
  },
  inputContainer: {
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  selectedUsersContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
    padding: 8,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
  },
  selectedUserItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#eff6ff",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  selectedUserName: {
    fontSize: 14,
    color: "#1e40af",
  },
  removeUserButton: {
    marginLeft: 4,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    marginBottom: 16,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
  },
  usersListContainer: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    maxHeight: 240,
    marginBottom: 16,
  },
  userItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 12,
  },
  userName: {
    fontSize: 16,
  },
  checkmarkContainer: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#3b82f6",
    alignItems: "center",
    justifyContent: "center",
  },
  previewContainer: {
    marginBottom: 16,
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: "500",
    color: "#4b5563",
    marginBottom: 8,
  },
  avatarPreview: {
    alignItems: "center",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 16,
  },
  selectedCount: {
    fontSize: 14,
    color: "#6b7280",
  },
  createButton: {
    backgroundColor: "#3b82f6",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  disabledButton: {
    backgroundColor: "#9ca3af",
  },
  createButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "500",
  },
  listContainer: {
    flex: 1,
  },
  emptyContainer: {
    padding: 32,
    alignItems: "center",
  },
  emptyText: {
    color: "#6b7280",
    fontSize: 16,
  },
  groupItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  groupInfo: {
    flex: 1,
    marginLeft: 12,
  },
  groupName: {
    fontSize: 16,
    fontWeight: "500",
  },
  groupMeta: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  memberCount: {
    fontSize: 14,
    color: "#6b7280",
    marginRight: 8,
  },
  creatorBadge: {
    backgroundColor: "#eff6ff",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  creatorText: {
    fontSize: 12,
    color: "#3b82f6",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    color: "#666",
    fontSize: 14,
  },
});

export default GroupChat;
