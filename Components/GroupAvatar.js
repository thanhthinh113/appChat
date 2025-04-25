import React from "react";
import { View, Text, Image, StyleSheet } from "react-native";

const GroupAvatar = ({ members = [], size = 40 }) => {
  // Nếu không có thành viên, hiển thị avatar mặc định
  if (!members || members.length === 0) {
    return (
      <View
        style={[
          styles.avatarContainer,
          { width: size, height: size },
          styles.defaultAvatar,
        ]}
      >
        <Text style={[styles.defaultText, { fontSize: size * 0.4 }]}>?</Text>
      </View>
    );
  }

  // Hiển thị avatar cho 1 thành viên
  if (members.length === 1) {
    return (
      <View style={[styles.avatarContainer, { width: size, height: size }]}>
        <Image
          source={{
            uri: members[0].profile_pic || "https://via.placeholder.com/50",
          }}
          style={[styles.avatar, { width: size, height: size }]}
        />
      </View>
    );
  }

  // Hiển thị avatar cho 2 thành viên
  if (members.length === 2) {
    return (
      <View style={[styles.avatarContainer, { width: size, height: size }]}>
        <View style={styles.row}>
          <Image
            source={{
              uri: members[0].profile_pic || "https://via.placeholder.com/50",
            }}
            style={[
              styles.avatar,
              { width: size / 2, height: size / 2 },
              styles.topLeft,
            ]}
          />
          <Image
            source={{
              uri: members[1].profile_pic || "https://via.placeholder.com/50",
            }}
            style={[
              styles.avatar,
              { width: size / 2, height: size / 2 },
              styles.topRight,
            ]}
          />
        </View>
      </View>
    );
  }

  // Hiển thị avatar cho 3 thành viên
  if (members.length === 3) {
    return (
      <View style={[styles.avatarContainer, { width: size, height: size }]}>
        <View style={styles.row}>
          <Image
            source={{
              uri: members[0].profile_pic || "https://via.placeholder.com/50",
            }}
            style={[
              styles.avatar,
              { width: size / 2, height: size / 2 },
              styles.topLeft,
            ]}
          />
          <Image
            source={{
              uri: members[1].profile_pic || "https://via.placeholder.com/50",
            }}
            style={[
              styles.avatar,
              { width: size / 2, height: size / 2 },
              styles.topRight,
            ]}
          />
        </View>
        <View style={styles.row}>
          <Image
            source={{
              uri: members[2].profile_pic || "https://via.placeholder.com/50",
            }}
            style={[
              styles.avatar,
              { width: size / 2, height: size / 2 },
              styles.bottomLeft,
            ]}
          />
          <View
            style={[
              styles.avatar,
              { width: size / 2, height: size / 2 },
              styles.bottomRight,
              styles.overlay,
            ]}
          />
        </View>
      </View>
    );
  }

  // Hiển thị avatar cho 4 thành viên trở lên
  return (
    <View style={[styles.avatarContainer, { width: size, height: size }]}>
      <View style={styles.row}>
        <Image
          source={{
            uri: members[0].profile_pic || "https://via.placeholder.com/50",
          }}
          style={[
            styles.avatar,
            { width: size / 2, height: size / 2 },
            styles.topLeft,
          ]}
        />
        <Image
          source={{
            uri: members[1].profile_pic || "https://via.placeholder.com/50",
          }}
          style={[
            styles.avatar,
            { width: size / 2, height: size / 2 },
            styles.topRight,
          ]}
        />
      </View>
      <View style={styles.row}>
        <Image
          source={{
            uri: members[2].profile_pic || "https://via.placeholder.com/50",
          }}
          style={[
            styles.avatar,
            { width: size / 2, height: size / 2 },
            styles.bottomLeft,
          ]}
        />
        <Image
          source={{
            uri: members[3].profile_pic || "https://via.placeholder.com/50",
          }}
          style={[
            styles.avatar,
            { width: size / 2, height: size / 2 },
            styles.bottomRight,
          ]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  avatarContainer: {
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#f3f4f6",
  },
  defaultAvatar: {
    backgroundColor: "#e5e7eb",
    justifyContent: "center",
    alignItems: "center",
  },
  defaultText: {
    color: "#6b7280",
    fontWeight: "bold",
  },
  row: {
    flexDirection: "row",
    flex: 1,
  },
  avatar: {
    resizeMode: "cover",
  },
  topLeft: {
    borderTopLeftRadius: 8,
  },
  topRight: {
    borderTopRightRadius: 8,
  },
  bottomLeft: {
    borderBottomLeftRadius: 8,
  },
  bottomRight: {
    borderBottomRightRadius: 8,
  },
  overlay: {
    backgroundColor: "rgba(0, 0, 0, 0.1)",
  },
});

export default GroupAvatar;
