import { Colors } from "@/constants/colors";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Icon, Label, NativeTabs, VectorIcon } from 'expo-router/unstable-native-tabs';
import React from "react";
import { Platform } from "react-native";

export default function TabLayout() {

    return (
        <NativeTabs
            backgroundColor={Colors.background}
            blurEffect="none"
            // disableIndicator // a mediter jsp sah
            disableTransparentOnScrollEdge={true}
            iconColor={{
                default: Colors.tabIconDefault,
                selected: Colors.tabIconSelected,
            }}
            tintColor={Colors.tabIconSelected}
        >
            <NativeTabs.Trigger name="index">
                {Platform.select({
                    ios: <Icon sf={{ default: "house", selected: "house.fill" }} />,
                    android: <Icon src={<VectorIcon family={MaterialIcons} name="home" />} />,
                })}
                <Label>Home</Label>
            </NativeTabs.Trigger>

            {/* Add a new course */}
            <NativeTabs.Trigger name="add" >
                {Platform.select({
                    ios: <Icon sf={{ default: "plus", selected: "plus" }} />,
                    android: <Icon src={<VectorIcon family={MaterialIcons} name="add" />} />,
                })}
                <Label>Add</Label>
            </NativeTabs.Trigger>

            <NativeTabs.Trigger name="settings">
                {Platform.select({
                    ios: <Icon sf={{ default: "gearshape", selected: "gearshape.fill" }} />,
                    android: <Icon src={<VectorIcon family={MaterialIcons} name="settings" />} />,
                })}
                <Label>Settings</Label>
            </NativeTabs.Trigger>

        </NativeTabs>
    );
}
