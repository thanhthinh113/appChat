import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const Screen06 = ({ navigation, route }) => {
  // Lấy thông tin contact được truyền từ Screen05
  const contact = route.params?.contact || {
    id: "1",
    name: "Người dùng mẫu",
    avatar: "https://randomuser.me/api/portraits/men/1.jpg",
  };

  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const flatListRef = useRef();

  useEffect(() => {
    setMessages([
      { id: "1", text: "Xin chào!", time: "10:00", isMe: false },
      { id: "2", text: "Chào bạn!", time: "10:01", isMe: true },
      { id: "3", text: "Bạn khỏe không?", time: "10:02", isMe: false },
    ]);
  }, []);

  const handleSend = () => {
    if (!message.trim()) return;

    const newMessage = {
      id: Date.now().toString(),
      text: message,
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      isMe: true,
    };

    setMessages((prev) => [...prev, newMessage]);
    setMessage("");

    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const renderItem = ({ item }) => (
    <View
      style={[
        styles.messageRow,
        item.isMe ? styles.myMessage : styles.otherMessage,
      ]}
    >
      {!item.isMe && (
        <Image source={{ uri: contact.avatar }} style={styles.avatar} />
      )}
      <View
        style={[
          styles.bubble,
          item.isMe ? styles.myBubble : styles.otherBubble,
        ]}
      >
        <Text style={item.isMe ? styles.myText : styles.otherText}>
          {item.text}
        </Text>
        <Text
          style={[styles.time, item.isMe ? styles.myTime : styles.otherTime]}
        >
          {item.time}
        </Text>
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
      keyboardVerticalOffset={90}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Image source={{ uri: contact.avatar }} style={styles.headerAvatar} />
        <Text style={styles.headerTitle}>{contact.name}</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Danh sách tin nhắn */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesContainer}
        showsVerticalScrollIndicator={false}
        onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />

      {/* Ô nhập tin nhắn */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Nhập tin nhắn..."
          value={message}
          onChangeText={setMessage}
          multiline
        />
        <TouchableOpacity onPress={handleSend} style={styles.sendButton}>
          <Ionicons name="send" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    marginTop: 40,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  headerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginHorizontal: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    flex: 1,
  },
  messagesContainer: {
    padding: 15,
    paddingBottom: 80,
  },
  messageRow: {
    flexDirection: "row",
    marginBottom: 15,
    alignItems: "flex-end",
  },
  myMessage: {
    justifyContent: "flex-end",
  },
  otherMessage: {
    justifyContent: "flex-start",
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
  },
  bubble: {
    maxWidth: "75%",
    borderRadius: 12,
    padding: 12,
  },
  myBubble: {
    backgroundColor: "#007AFF",
    borderBottomRightRadius: 2,
  },
  otherBubble: {
    backgroundColor: "#f0f0f0",
    borderBottomLeftRadius: 2,
  },
  myText: {
    color: "#fff",
    fontSize: 16,
  },
  otherText: {
    color: "#000",
    fontSize: 16,
  },
  time: {
    fontSize: 12,
    marginTop: 4,
    textAlign: "right",
  },
  myTime: {
    color: "rgba(255,255,255,0.7)",
  },
  otherTime: {
    color: "#666",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    backgroundColor: "#fff",
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    maxHeight: 100,
    backgroundColor: "#f9f9f9",
  },
  sendButton: {
    marginLeft: 10,
    padding: 5,
  },
});

export default Screen06;
