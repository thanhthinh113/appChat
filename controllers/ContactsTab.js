import React, { useEffect, useState, useContext } from "react";
import { View, Text, TextInput, Image, TouchableOpacity } from "react-native";
import axios from "axios";
import { useNavigation } from "@react-navigation/native";
import { AuthContext } from "../AuthContext.js";

const ContactsTab = () => {
  const navigation = useNavigation();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const { currentUser } = useContext(AuthContext);

  const handleSearchUser = async () => {
    if (!searchQuery.trim()) return;

    try {
      const response = await axios.post(
        "http://localhost:8080/api/search-userss",
        { search: searchQuery },
        {
          headers: { Authorization: `Bearer ${currentUser.token}` },
        }
      );
      console.log("Search results:", response.data.data);
      setSearchResults(response.data.data || []);
    } catch (error) {
      console.error("Lỗi tìm kiếm:", error.response?.data || error.message);
    }
  };

  useEffect(() => {
    if (!currentUser || !currentUser.token) {
      navigation.replace("Screen01");
    }
  }, [currentUser, navigation]);

  return (
    <View style={{ flex: 1, marginTop: 40, padding: 10 }}>
      <TextInput
        placeholder="Tìm kiếm tên hoặc số điện thoại..."
        style={{
          borderWidth: 1,
          borderColor: "#ccc",
          borderRadius: 10,
          paddingHorizontal: 10,
          paddingVertical: 8,
          marginBottom: 15,
        }}
        value={searchQuery}
        onChangeText={setSearchQuery}
        onSubmitEditing={handleSearchUser}
        returnKeyType="search"
      />

      {searchResults.length === 0 ? (
        <Text style={{ textAlign: "center", color: "#999" }}>
          Không có kết quả
        </Text>
      ) : (
        searchResults.map((user) => (
          <TouchableOpacity
            key={user._id}
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 10,
              padding: 10,
              borderBottomWidth: 1,
              borderColor: "#eee",
            }}
            onPress={() => {
              console.log("Navigating to ChatScreen with user:", user);
              if (!currentUser?.token) {
                Alert.alert("Lỗi", "Vui lòng đăng nhập để trò chuyện.");
                navigation.replace("Screen01");
                return;
              }
              navigation.navigate("ChatScreen", {
                userId: user._id,
                userName: user.name,
                userProfilePic: user.profile_pic,
              });
            }}
          >
            <Image
              source={{
                uri: user.profile_pic || "https://via.placeholder.com/40",
              }}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                marginRight: 10,
              }}
            />
            <View>
              <Text style={{ fontSize: 16 }}>{user.name}</Text>
              <Text style={{ color: "#666" }}>{user.phone}</Text>
            </View>
          </TouchableOpacity>
        ))
      )}
    </View>
  );
};

export default ContactsTab;
