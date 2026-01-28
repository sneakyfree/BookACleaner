import { View, Text, ScrollView, StyleSheet, TouchableOpacity, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function HomeScreen() {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const router = useRouter();

    const quickActions = [
        { icon: 'sparkles', label: 'Book Now', route: '/book' },
        { icon: 'calendar', label: 'Schedule', route: '/bookings' },
        { icon: 'chatbubbles', label: 'Messages', route: '/messages' },
        { icon: 'star', label: 'Reviews', route: '/reviews' },
    ];

    const upcomingBooking = {
        id: '1',
        cleanerName: 'Maria Santos',
        date: 'Today, 2:00 PM',
        service: 'Deep Clean',
        address: '123 Main St',
    };

    return (
        <SafeAreaView style={[styles.container, isDark && styles.containerDark]}>
            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View style={styles.header}>
                    <View>
                        <Text style={[styles.greeting, isDark && styles.textLight]}>
                            Good afternoon! 👋
                        </Text>
                        <Text style={[styles.subtitle, isDark && styles.textMuted]}>
                            Ready for a sparkling clean home?
                        </Text>
                    </View>
                    <TouchableOpacity style={styles.notificationBtn}>
                        <Ionicons
                            name="notifications-outline"
                            size={24}
                            color={isDark ? '#fff' : '#1e293b'}
                        />
                    </TouchableOpacity>
                </View>

                {/* Quick Actions */}
                <View style={styles.quickActions}>
                    {quickActions.map((action, index) => (
                        <TouchableOpacity
                            key={index}
                            style={[styles.actionBtn, isDark && styles.actionBtnDark]}
                            onPress={() => router.push(action.route)}
                        >
                            <View style={styles.actionIcon}>
                                <Ionicons name={action.icon as any} size={24} color="#0ea5e9" />
                            </View>
                            <Text style={[styles.actionLabel, isDark && styles.textLight]}>
                                {action.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Upcoming Booking */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, isDark && styles.textLight]}>
                        Upcoming Booking
                    </Text>
                    <TouchableOpacity
                        style={[styles.bookingCard, isDark && styles.cardDark]}
                        onPress={() => router.push(`/bookings/${upcomingBooking.id}`)}
                    >
                        <View style={styles.bookingHeader}>
                            <View style={styles.cleanerAvatar}>
                                <Text style={styles.avatarText}>M</Text>
                            </View>
                            <View style={styles.bookingInfo}>
                                <Text style={[styles.cleanerName, isDark && styles.textLight]}>
                                    {upcomingBooking.cleanerName}
                                </Text>
                                <Text style={[styles.bookingDate, isDark && styles.textMuted]}>
                                    {upcomingBooking.date}
                                </Text>
                            </View>
                            <View style={styles.serviceTag}>
                                <Text style={styles.serviceText}>{upcomingBooking.service}</Text>
                            </View>
                        </View>
                        <View style={styles.bookingAddress}>
                            <Ionicons name="location-outline" size={16} color="#64748b" />
                            <Text style={[styles.addressText, isDark && styles.textMuted]}>
                                {upcomingBooking.address}
                            </Text>
                        </View>
                    </TouchableOpacity>
                </View>

                {/* CTA */}
                <TouchableOpacity
                    style={styles.ctaButton}
                    onPress={() => router.push('/book')}
                >
                    <Text style={styles.ctaText}>Book a Cleaning</Text>
                    <Ionicons name="arrow-forward" size={20} color="#fff" />
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    containerDark: {
        backgroundColor: '#0f172a',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 16,
    },
    greeting: {
        fontSize: 24,
        fontWeight: '700',
        color: '#1e293b',
    },
    subtitle: {
        fontSize: 14,
        color: '#64748b',
        marginTop: 4,
    },
    notificationBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    quickActions: {
        flexDirection: 'row',
        paddingHorizontal: 12,
        marginBottom: 24,
    },
    actionBtn: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 16,
        marginHorizontal: 4,
        backgroundColor: '#fff',
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    actionBtnDark: {
        backgroundColor: '#1e293b',
    },
    actionIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#e0f2fe',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    actionLabel: {
        fontSize: 12,
        fontWeight: '500',
        color: '#1e293b',
    },
    section: {
        paddingHorizontal: 20,
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1e293b',
        marginBottom: 12,
    },
    bookingCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    cardDark: {
        backgroundColor: '#1e293b',
    },
    bookingHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    cleanerAvatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#0ea5e9',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
    },
    bookingInfo: {
        flex: 1,
        marginLeft: 12,
    },
    cleanerName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1e293b',
    },
    bookingDate: {
        fontSize: 14,
        color: '#64748b',
        marginTop: 2,
    },
    serviceTag: {
        backgroundColor: '#e0f2fe',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    serviceText: {
        fontSize: 12,
        fontWeight: '500',
        color: '#0ea5e9',
    },
    bookingAddress: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    addressText: {
        fontSize: 14,
        color: '#64748b',
        marginLeft: 4,
    },
    ctaButton: {
        marginHorizontal: 20,
        marginBottom: 32,
        backgroundColor: '#0ea5e9',
        borderRadius: 16,
        paddingVertical: 18,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#0ea5e9',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    ctaText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        marginRight: 8,
    },
    textLight: {
        color: '#f1f5f9',
    },
    textMuted: {
        color: '#94a3b8',
    },
});
