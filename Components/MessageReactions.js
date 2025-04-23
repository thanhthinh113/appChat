import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

const MessageReactions = ({ reactions, onReactionPress }) => {
  if (!reactions || reactions.length === 0) return null;

  const reactionCounts = reactions.reduce((acc, reaction) => {
    acc[reaction.emoji] = (acc[reaction.emoji] || 0) + 1;
    return acc;
  }, {});

  return (
    <View style={styles.reactionsContainer}>
      {Object.entries(reactionCounts).map(([emoji, count]) => (
        <TouchableOpacity
          key={emoji}
          style={styles.reactionBubble}
          onPress={() => onReactionPress(emoji)}
        >
          <Text style={styles.reactionEmoji}>{emoji}</Text>
          <Text style={styles.reactionCount}>{count}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
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
});

export default MessageReactions;
