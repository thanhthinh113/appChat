import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  Button,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ScrollView,
  Image,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import axios from "axios";
import uploadFile from "../helpers/uploadFile";
import firebase from "../firebase";
import { FirebaseRecaptchaVerifierModal } from "expo-firebase-recaptcha";

const BACKEND_URL = "http://localhost:8080/api/register";

const Screen02 = ({ navigation }) => {
  const [form, setForm] = useState({
    name: "",
    phone: "",
    password: "",
  });
  const [avatar, setAvatar] = useState(null);
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [isPhoneVerified, setIsPhoneVerified] = useState(false);
  const [verificationId, setVerificationId] = useState(null);
  const recaptchaVerifier = useRef(null);

  const handleChange = (field, value) => {
    setForm({ ...form, [field]: value });
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled) {
      setAvatar(result.assets[0]);
    }
  };

  const sendOTP = async () => {
    const phoneNumber = form.phone.startsWith("+84")
      ? form.phone
      : form.phone.replace(/^0/, "+84");

    try {
      const phoneProvider = new firebase.auth.PhoneAuthProvider();
      const id = await phoneProvider.verifyPhoneNumber(
        phoneNumber,
        recaptchaVerifier.current
      );
      setVerificationId(id);
      setOtpSent(true);
      Alert.alert("Đã gửi OTP");
    } catch (err) {
      console.error(err);
      Alert.alert("Lỗi gửi OTP", err.message);
    }
  };

  const verifyOTP = async () => {
    try {
      const credential = firebase.auth.PhoneAuthProvider.credential(
        verificationId,
        otp
      );
      await firebase.auth().signInWithCredential(credential);
      setIsPhoneVerified(true);
      Alert.alert("Xác thực thành công ✅");
    } catch (err) {
      console.error(err);
      Alert.alert("OTP sai ❌");
    }
  };

  const handleRegister = async () => {
    if (!avatar) {
      Alert.alert("Vui lòng chọn ảnh đại diện trước khi đăng ký");
      return;
    }

    try {
      const uploadRes = await uploadFile({
        uri: avatar.uri,
        type: avatar.type || "image/jpeg",
        name: "profile.jpg",
      });

      const imageUrl = uploadRes.secure_url;

      await axios.post(BACKEND_URL, {
        name: form.name.trim(),
        phone: form.phone.trim(),
        password: form.password,
        profile_pic: imageUrl,
      });

      Alert.alert("Đăng ký thành công");
      navigation.navigate("Screen01");
    } catch (err) {
      console.log(err);
      Alert.alert("Lỗi đăng ký", err.response?.data?.message || err.message);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <FirebaseRecaptchaVerifierModal
        ref={recaptchaVerifier}
        firebaseConfig={firebase.app().options}
      />

      <Text style={styles.title}>Đăng ký</Text>

      {!isPhoneVerified && (
        <>
          <TextInput
            placeholder="Số điện thoại"
            keyboardType="phone-pad"
            style={styles.input}
            value={form.phone}
            onChangeText={(text) => handleChange("phone", text)}
          />

          <Button title="Gửi OTP" onPress={sendOTP} />

          {otpSent && (
            <>
              <TextInput
                placeholder="Nhập OTP"
                style={styles.input}
                value={otp}
                onChangeText={setOtp}
              />
              <Button title="Xác thực OTP" onPress={verifyOTP} />
            </>
          )}
        </>
      )}

      {isPhoneVerified && (
        <>
          <TouchableOpacity onPress={pickImage} style={styles.pickImage}>
            <Text style={{ color: "blue", textAlign: "center" }}>
              {avatar ? "Đổi ảnh đại diện" : "Chọn ảnh đại diện"}
            </Text>
          </TouchableOpacity>

          {avatar && (
            <Image source={{ uri: avatar.uri }} style={styles.avatar} />
          )}

          <TextInput
            placeholder="Tên"
            style={styles.input}
            value={form.name}
            onChangeText={(text) => handleChange("name", text)}
          />

          <TextInput
            placeholder="Mật khẩu"
            secureTextEntry
            style={styles.input}
            value={form.password}
            onChangeText={(text) => handleChange("password", text)}
          />

          <Button title="Đăng ký" onPress={handleRegister} />
        </>
      )}

      <TouchableOpacity onPress={() => navigation.navigate("Screen01")}>
        <Text style={styles.link}>Đã có tài khoản? Đăng nhập</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 20, justifyContent: "center" },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 10,
    marginBottom: 15,
  },
  pickImage: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 10,
    marginBottom: 15,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignSelf: "center",
    marginBottom: 20,
  },
  link: {
    marginTop: 20,
    color: "blue",
    textAlign: "center",
  },
});

export default Screen02;
