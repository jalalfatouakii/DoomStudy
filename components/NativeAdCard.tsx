import { Colors } from "@/constants/colors";
import React, { useEffect, useState } from "react";
import { Dimensions, Image, StyleSheet, Text, View } from "react-native";
import {
    NativeAd,
    NativeAdView,
    NativeAsset,
    NativeAssetType,
    NativeMediaView,
    TestIds,
} from "react-native-google-mobile-ads";

const { width } = Dimensions.get("window");

const adUnitId = __DEV__ ? TestIds.NATIVE : "ca-app-pub-xxxxxxxxxxxxxxxx/yyyyyyyyyy";

type Props = {
    height?: number;
};

export default function NativeAdCard({ height }: Props) {
    const [nativeAd, setNativeAd] = useState<NativeAd>();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        NativeAd.createForAdRequest(adUnitId)
            .then((ad) => {
                setNativeAd(ad);
                setLoading(false);
            })
            .catch((error) => {
                console.warn("Native Ad failed to load", error);
                setLoading(false);
            });
    }, []);

    // Clean up
    useEffect(() => {
        return () => {
            nativeAd?.destroy();
        };
    }, [nativeAd]);

    if (!nativeAd) {
        // Optionally return a placeholder or null
        return null;
    }

    return (
        <View style={[styles.container, height ? { height } : undefined]}>
            <NativeAdView nativeAd={nativeAd} style={styles.nativeAdView}>
                <View style={styles.cardContent}>

                    {/* Header */}
                    <View style={styles.header}>
                        {nativeAd.icon && (
                            <NativeAsset assetType={NativeAssetType.ICON}>
                                <Image source={{ uri: nativeAd.icon.url }} style={styles.icon} />
                            </NativeAsset>
                        )}

                        <View style={styles.headerText}>
                            <NativeAsset assetType={NativeAssetType.HEADLINE}>
                                <Text style={styles.headline} numberOfLines={1}>{nativeAd.headline}</Text>
                            </NativeAsset>

                            <NativeAsset assetType={NativeAssetType.BODY}>
                                <Text style={styles.tagline} numberOfLines={2}>{nativeAd.body}</Text>
                            </NativeAsset>
                        </View>

                        <View style={styles.adBadge}>
                            <Text style={styles.adBadgeText}>Ad</Text>
                        </View>
                    </View>

                    {/* Media */}
                    <View style={styles.mediaContainer}>
                        <NativeMediaView style={styles.media} resizeMode="cover" />
                    </View>

                    {/* Footer */}
                    <View style={styles.footer}>
                        <View style={styles.storeInfo}>
                            {nativeAd.store ? (
                                <NativeAsset assetType={NativeAssetType.STORE}>
                                    <Text style={styles.store}>{nativeAd.store}</Text>
                                </NativeAsset>
                            ) : null}
                            {nativeAd.price ? (
                                <NativeAsset assetType={NativeAssetType.PRICE}>
                                    <Text style={styles.price}>{nativeAd.price}</Text>
                                </NativeAsset>
                            ) : null}
                        </View>

                        <NativeAsset assetType={NativeAssetType.CALL_TO_ACTION}>
                            <View style={styles.callToAction}>
                                <Text style={styles.callToActionText}>{nativeAd.callToAction}</Text>
                            </View>
                        </NativeAsset>
                    </View>

                </View>
            </NativeAdView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: width * 0.9,
        justifyContent: "center",
        alignItems: "center",
    },
    nativeAdView: {
        width: "100%",
        height: "100%",
    },
    cardContent: {
        backgroundColor: Colors.backgroundLighter,
        borderRadius: 16,
        padding: 16,
        width: "100%",
        flex: 1,
        justifyContent: "space-between",
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
        gap: 10,
        height: 50,
    },
    icon: {
        width: 40,
        height: 40,
        borderRadius: 8,
        backgroundColor: '#eee',
    },
    headerText: {
        flex: 1,
        justifyContent: 'center',
    },
    headline: {
        fontSize: 15,
        fontWeight: 'bold',
        color: Colors.text,
        marginBottom: 2,
    },
    tagline: {
        fontSize: 12,
        color: Colors.tabIconDefault,
    },
    adBadge: {
        backgroundColor: '#f1f3f4',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    adBadgeText: {
        fontSize: 10,
        color: '#333',
        fontWeight: 'bold',
    },
    mediaContainer: {
        flex: 1,
        width: '100%',
        borderRadius: 8,
        overflow: 'hidden',
        marginBottom: 10,
        backgroundColor: '#000',
        minHeight: 150,
    },
    media: {
        width: '100%',
        height: '100%',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        height: 40,
    },
    storeInfo: {
        flex: 1,
        marginRight: 10,
    },
    store: {
        fontSize: 12,
        color: Colors.tabIconDefault,
        fontWeight: '500',
    },
    price: {
        fontSize: 12,
        color: Colors.text,
        fontWeight: 'bold',
    },
    callToAction: {
        backgroundColor: Colors.tint,
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    callToActionText: {
        color: 'black',
        fontSize: 13,
        fontWeight: 'bold',
        textAlign: 'center',
    }
});
