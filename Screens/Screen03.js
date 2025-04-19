import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import firebase from "../firebase"; // Đã cấu hình firebase
import axios from "axios";

const Screen03 = ({ navigation }) => {
  const [step, setStep] = useState("checkPhone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [confirmResult, setConfirmResult] = useState(null);
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);

  const sendOtp = async () => {
    if (!phone) {
      Alert.alert("Lỗi", "Vui lòng nhập số điện thoại");
      return;
    }

    const formattedPhone = phone.startsWith("+84")
      ? phone
      : phone.replace(/^0/, "+84");

    try {
      setLoading(true);
      const res = await axios.post(`http://localhost:8080/api/phone`, {
        phone,
      });

      if (res.data.success) {
        setToken(res.data.token);
        const result = await firebase
          .auth()
          .signInWithPhoneNumber(formattedPhone);
        setConfirmResult(result);
        setStep("verifyOtp");
        Alert.alert("Thành công", "Mã OTP đã được gửi đến điện thoại");
      }
    } catch (err) {
      Alert.alert("Lỗi", err?.response?.data?.message || "Gửi mã OTP thất bại");
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    if (!otp) {
      Alert.alert("Lỗi", "Vui lòng nhập mã OTP");
      return;
    }

    try {
      setLoading(true);
      await confirmResult.confirm(otp);
      Alert.alert("Xác thực thành công ✅");
      setStep("resetPassword");
    } catch (err) {
      Alert.alert("Lỗi", "Mã OTP không chính xác ❌");
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async () => {
    if (!newPassword || !confirmPassword) {
      Alert.alert("Lỗi", "Vui lòng nhập đủ thông tin mật khẩu");
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert("Lỗi", "Mật khẩu không khớp");
      return;
    }

    try {
      setLoading(true);
      const res = await axios.post(`http://localhost:8080/api/reset-password`, {
        newPassword,
        token,
      });
      Alert.alert("Thành công", res.data.message);
      navigation.navigate("Screen01");
    } catch (err) {
      Alert.alert(
        "Lỗi",
        err?.response?.data?.message || "Đặt lại mật khẩu thất bại"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <Text style={styles.title}>Quên mật khẩu</Text>

      {step === "checkPhone" && (
        <>
          <TextInput
            style={styles.input}
            placeholder="Số điện thoại"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />
          <TouchableOpacity
            style={styles.button}
            onPress={sendOtp}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? "Đang gửi..." : "Gửi OTP"}
            </Text>
          </TouchableOpacity>
        </>
      )}

      {step === "verifyOtp" && (
        <>
          <TextInput
            style={styles.input}
            placeholder="Nhập mã OTP"
            value={otp}
            onChangeText={setOtp}
            keyboardType="number-pad"
          />
          <TouchableOpacity
            style={styles.button}
            onPress={verifyOtp}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? "Đang xác thực..." : "Xác thực"}
            </Text>
          </TouchableOpacity>
        </>
      )}

      {step === "resetPassword" && (
        <>
          <TextInput
            style={styles.input}
            placeholder="Mật khẩu mới"
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
          />
          <TextInput
            style={styles.input}
            placeholder="Xác nhận mật khẩu"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
          />
          <TouchableOpacity
            style={styles.button}
            onPress={resetPassword}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? "Đang xử lý..." : "Đặt lại mật khẩu"}
            </Text>
          </TouchableOpacity>
        </>
      )}

      {step !== "checkPhone" && (
        <TouchableOpacity
          onPress={() => setStep("checkPhone")}
          style={styles.backButton}
        >
          <Text style={styles.backText}>← Quay lại</Text>
        </TouchableOpacity>
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#fff",
    justifyContent: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 30,
    textAlign: "center",
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 15,
    fontSize: 16,
  },
  button: {
    backgroundColor: "#007AFF",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 10,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  backButton: {
    marginTop: 15,
    alignSelf: "center",
  },
  backText: {
    color: "#007AFF",
  },
});

export default Screen03;
