import { View, Text, StyleSheet, TouchableOpacity, ScrollView, useColorScheme, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';

export default function ProfileScreen() {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const router = useRouter();
    const [notifications, setNotifications] = useState(true);

    const user = {
        name: 'John Doe',
        email: 'john@example.com',
        role: 'client',
        memberSince: 'Jan 2026',
    };

    const menuItems = [
        { icon: 'home-outline', label: 'My Properties', route: '/properties' },
        { icon: 'card-outline', label: 'Payment Methods', route: '/payments' },
        { icon: 'star-outline', label: 'My Reviews', route: '/reviews' },
        { icon: 'help-circle-outline', label: 'Help & Support', route: '/support' },
        { icon: 'document-text-outline', label: 'Terms & Privacy', route: '/terms' },
    ];

    return (
        <SafeAreaView style={[styles.container, isDark && styles.containerDark]}>
            <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.header}>
                    <Text style={[styles.title, isDark && styles.textLight]}>Profile</Text>
                </View>

                {/* Profile Card */}
                <View style={[styles.profileCard, isDark && styles.cardDark]}>
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>{user.name[0]}</Text>
                    </View>
                    <View style={styles.profileInfo}>
                        <Text style={[styles.name, isDark && styles.textLight]}>{user.name}</Text>
                        <Text style={[styles.email, isDark && styles.textMuted]}>{user.email}</Text>
                        <Text style={[styles.member, isDark && styles.textMuted]}>
                            Member since {user.memberSince}
                        </Text>
                    </View>
                    <TouchableOpacity style={styles.editBtn}>
                        <Ionicons name="pencil" size={18} color="#0ea5e9" />
                    </TouchableOpacity>
                </View>

                {/* Notifications Toggle */}
                <View style={[styles.settingRow, isDark && styles.cardDark]}>
                    <View style={styles.settingLeft}>
                        <Ionicons name="notifications-outline" size={22} color={isDark ? '#94a3b8' : '#64748b'} />
                        <Text style={[styles.settingLabel, isDark && styles.textLight]}>Notifications</Text>
                    </View>
                    <Switch
                        value={notifications}
                        onValueChange={setNotifications}
                        trackColor={{ false: '#e2e8f0', true: '#0ea5e9' }}
                        thumbColor="#fff"
                    />
                </View>

                {/* Menu Items */}
                <View style={styles.menu}>
                    {menuItems.map((item, index) => (
                        <TouchableOpacity
                            key={index}
                            style={[styles.menuItem, isDark && styles.cardDark]}
                            onPress={() => router.push(item.route)}
                        >
                            <View style={styles.menuLeft}>
                                <Ionicons name={item.icon as any} size={22} color={isDark ? '#94a3b8' : '#64748b'} />
                                <Text style={[styles.menuLabel, isDark && styles.textLight]}>{item.label}</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Logout */}
                <TouchableOpacity style={[styles.logoutBtn, isDark && styles.logoutBtnDark]}>
                    <Ionicons name="log-out-outline" size={22} color="#ef4444" />
                    <Text style={styles.logoutText}>Sign Out</Text>
                </TouchableOpacity>

                <Text style={styles.version}>Version 1.0.0</Text>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    containerDark: { backgroundColor: '#0f172a' },
    header: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16 },
    title: { fontSize: 28, fontWeight: '700', color: '#1e293b' },
    profileCard: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 20,
        padding: 20,
        backgroundColor: '#fff',
        borderRadius: 16,
        marginBottom: 16,
    },
    cardDark: { backgroundColor: '#1e293b' },
    avatar: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#0ea5e9',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: { color: '#fff', fontSize: 24, fontWeight: '600' },
    profileInfo: { flex: 1, marginLeft: 16 },
    name: { fontSize: 18, fontWeight: '600', color: '#1e293b' },
    email: { fontSize: 14, color: '#64748b', marginTop: 2 },
    member: { fontSize: 12, color: '#94a3b8', marginTop: 4 },
    editBtn: { padding: 8 },
    settingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginHorizontal: 20,
        padding: 16,
        backgroundColor: '#fff',
        borderRadius: 12,
        marginBottom: 16,
    },
    settingLeft: { flexDirection: 'row', alignItems: 'center' },
    settingLabel: { fontSize: 16, color: '#1e293b', marginLeft: 12 },
    menu: { marginHorizontal: 20 },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        backgroundColor: '#fff',
        borderRadius: 12,
        marginBottom: 8,
    },
    menuLeft: { flexDirection: 'row', alignItems: 'center' },
    menuLabel: { fontSize: 16, color: '#1e293b', marginLeft: 12 },
    logoutBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: 20,
        marginTop: 16,
        padding: 16,
        backgroundColor: '#fef2f2',
        borderRadius: 12,
    },
    logoutBtnDark: { backgroundColor: '#450a0a' },
    logoutText: { fontSize: 16, fontWeight: '600', color: '#ef4444', marginLeft: 8 },
    version: { textAlign: 'center', color: '#94a3b8', fontSize: 12, marginTop: 24, marginBottom: 32 },
    textLight: { color: '#f1f5f9' },
    textMuted: { color: '#94a3b8' },
});
