import React, { useEffect, useState, useContext } from "react";
import {
  View,
  Text,
  TextInput,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from "react-native";
import axios from "axios";
import { useNavigation } from "@react-navigation/native";
import { AuthContext } from "../AuthContext.js";
import { Ionicons } from "@expo/vector-icons";
import UserSearchCard from "../Components/UserSearchCard.js";

const ContactsTab = () => {
  const navigation = useNavigation();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const { currentUser, socketConnection } = useContext(AuthContext);

  const handleSearchUser = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setLoading(true);
      const response = await axios.post(
        `http://localhost:8080/api/search-user?currentUserId=${currentUser._id}`,
        { search: searchQuery },
        {
          headers: { Authorization: `Bearer ${currentUser.token}` },
        }
      );
      console.log("Search results:", response.data.data);
      setSearchResults(response.data.data || []);
    } catch (error) {
      console.error("Lỗi tìm kiếm:", error.response?.data || error.message);
      Alert.alert(
        "Lỗi",
        error.response?.data?.message || "Không thể tìm kiếm người dùng"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleSearchUser();
  }, [searchQuery]);

  useEffect(() => {
    if (!currentUser || !currentUser.token) {
      navigation.replace("Screen01");
    }
  }, [currentUser, navigation]);

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Ionicons
          name="search"
          size={20}
          color="#888"
          style={styles.searchIcon}
        />
        <TextInput
          placeholder="Search by name or phone number"
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
          placeholderTextColor="#999"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery("")}>
            <Ionicons name="close-circle" size={20} color="#888" />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.resultsContainer}>
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Searching...</Text>
          </View>
        ) : searchResults.length === 0 ? (
          <View style={styles.centerContainer}>
            {searchQuery.length > 0 ? (
              <>
                <Ionicons name="person-outline" size={48} color="#ccc" />
                <Text style={styles.emptyText}>No users found</Text>
                <Text style={styles.emptySubtext}>
                  Try a different search term
                </Text>
              </>
            ) : (
              <>
                <Ionicons name="search" size={48} color="#ccc" />
                <Text style={styles.emptyText}>Search for contacts</Text>
                <Text style={styles.emptySubtext}>
                  Type a name or phone number
                </Text>
              </>
            )}
          </View>
        ) : (
          searchResults.map((user) => (
            <UserSearchCard
              key={user._id}
              user={user}
              socketConnection={socketConnection}
            />
          ))
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingTop: 15,
    marginTop: 40,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderRadius: 10,
    marginHorizontal: 15,
    marginBottom: 15,
    paddingHorizontal: 12,
    height: 46,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#333",
    height: "100%",
  },
  resultsContainer: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#888",
  },
  emptyText: {
    marginTop: 10,
    fontSize: 18,
    fontWeight: "500",
    color: "#666",
  },
  emptySubtext: {
    marginTop: 5,
    fontSize: 14,
    color: "#999",
  },
});

export default ContactsTab;
