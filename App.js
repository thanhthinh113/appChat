import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Provider } from "react-redux";
import { store } from "./redux/store"; // Redux store
import { AuthProvider } from "./AuthContext"; // Context cho xác thực
import Screen01 from "./Screens/Screen01";
import Screen02 from "./Screens/Screen02";
import Screen03 from "./Screens/Screen03";
import Screen04 from "./Screens/Screen04";
import Screen05 from "./Screens/Screen05";
import Screen06 from "./Screens/Screen06";
import EditProfile from "./Screens/EditProfileUser";
import "@expo/metro-runtime";
import { registerRootComponent } from "expo";
import ChatScreen from "./Screens/ChartScreen";

const Stack = createNativeStackNavigator();

function App() {
  return (
    <Provider store={store}>
      {" "}
      {/* Thêm Redux Provider */}
      <AuthProvider>
        <NavigationContainer>
          <Stack.Navigator
            initialRouteName="Screen01"
            screenOptions={{
              animation: "slide_from_right",
              headerShown: false,
            }}
          >
            <Stack.Screen name="Screen01" component={Screen01} />
            <Stack.Screen name="Screen02" component={Screen02} />
            <Stack.Screen name="Screen03" component={Screen03} />
            <Stack.Screen name="Screen04" component={Screen04} />
            <Stack.Screen name="Screen05" component={Screen05} />
            <Stack.Screen name="Screen06" component={Screen06} />
            <Stack.Screen name="ChatScreen" component={ChatScreen} />

            <Stack.Screen name="EditProfile" component={EditProfile} />
          </Stack.Navigator>
        </NavigationContainer>
      </AuthProvider>
    </Provider>
  );
}

registerRootComponent(App);

export default App;
