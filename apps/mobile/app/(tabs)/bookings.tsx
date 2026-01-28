import { View, Text, FlatList, StyleSheet, TouchableOpacity, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';

type Booking = {
    id: string;
    cleanerName: string;
    date: string;
    time: string;
    service: string;
    status: 'pending' | 'confirmed' | 'completed';
    address: string;
    price: number;
};

const MOCK_BOOKINGS: Booking[] = [
    {
        id: '1',
        cleanerName: 'Maria Santos',
        date: 'Jan 25, 2026',
        time: '2:00 PM',
        service: 'Deep Clean',
        status: 'confirmed',
        address: '123 Main St',
        price: 150,
    },
    {
        id: '2',
        cleanerName: 'Sofia Chen',
        date: 'Jan 28, 2026',
        time: '10:00 AM',
        service: 'Standard Clean',
        status: 'pending',
        address: '456 Oak Ave',
        price: 85,
    },
    {
        id: '3',
        cleanerName: 'Maria Santos',
        date: 'Jan 20, 2026',
        time: '1:00 PM',
        service: 'Standard Clean',
        status: 'completed',
        address: '123 Main St',
        price: 85,
    },
];

export default function BookingsScreen() {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const router = useRouter();
    const [filter, setFilter] = useState<'all' | 'upcoming' | 'completed'>('all');

    const filteredBookings = MOCK_BOOKINGS.filter(b => {
        if (filter === 'upcoming') return b.status !== 'completed';
        if (filter === 'completed') return b.status === 'completed';
        return true;
    });

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'confirmed': return '#10b981';
            case 'pending': return '#f59e0b';
            case 'completed': return '#64748b';
            default: return '#64748b';
        }
    };

    const renderBooking = ({ item }: { item: Booking }) => (
        <TouchableOpacity
            style={[styles.card, isDark && styles.cardDark]}
            onPress={() => router.push(`/bookings/${item.id}`)}
        >
            <View style={styles.cardHeader}>
                <View style={styles.cleanerInfo}>
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>{item.cleanerName[0]}</Text>
                    </View>
                    <View>
                        <Text style={[styles.cleanerName, isDark && styles.textLight]}>
                            {item.cleanerName}
                        </Text>
                        <Text style={[styles.service, isDark && styles.textMuted]}>
                            {item.service}
                        </Text>
                    </View>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                        {item.status}
                    </Text>
                </View>
            </View>

            <View style={styles.cardDetails}>
                <View style={styles.detailRow}>
                    <Ionicons name="calendar-outline" size={16} color="#64748b" />
                    <Text style={[styles.detailText, isDark && styles.textMuted]}>
                        {item.date} at {item.time}
                    </Text>
                </View>
                <View style={styles.detailRow}>
                    <Ionicons name="location-outline" size={16} color="#64748b" />
                    <Text style={[styles.detailText, isDark && styles.textMuted]}>
                        {item.address}
                    </Text>
                </View>
            </View>

            <View style={styles.cardFooter}>
                <Text style={[styles.price, isDark && styles.textLight]}>
                    ${item.price}
                </Text>
                <Ionicons name="chevron-forward" size={20} color="#64748b" />
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={[styles.container, isDark && styles.containerDark]}>
            <View style={styles.header}>
                <Text style={[styles.title, isDark && styles.textLight]}>My Bookings</Text>
            </View>

            <View style={styles.filters}>
                {(['all', 'upcoming', 'completed'] as const).map(f => (
                    <TouchableOpacity
                        key={f}
                        style={[
                            styles.filterBtn,
                            filter === f && styles.filterBtnActive,
                        ]}
                        onPress={() => setFilter(f)}
                    >
                        <Text style={[
                            styles.filterText,
                            filter === f && styles.filterTextActive,
                        ]}>
                            {f.charAt(0).toUpperCase() + f.slice(1)}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <FlatList
                data={filteredBookings}
                renderItem={renderBooking}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.list}
                showsVerticalScrollIndicator={false}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    containerDark: { backgroundColor: '#0f172a' },
    header: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16 },
    title: { fontSize: 28, fontWeight: '700', color: '#1e293b' },
    filters: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 16 },
    filterBtn: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#e2e8f0',
        marginRight: 8,
    },
    filterBtnActive: { backgroundColor: '#0ea5e9' },
    filterText: { fontSize: 14, fontWeight: '500', color: '#64748b' },
    filterTextActive: { color: '#fff' },
    list: { paddingHorizontal: 20 },
    card: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    cardDark: { backgroundColor: '#1e293b' },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    cleanerInfo: { flexDirection: 'row', alignItems: 'center' },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#0ea5e9',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    avatarText: { color: '#fff', fontSize: 16, fontWeight: '600' },
    cleanerName: { fontSize: 16, fontWeight: '600', color: '#1e293b' },
    service: { fontSize: 14, color: '#64748b', marginTop: 2 },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    statusText: { fontSize: 12, fontWeight: '500', textTransform: 'capitalize' },
    cardDetails: { marginBottom: 12 },
    detailRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
    detailText: { fontSize: 14, color: '#64748b', marginLeft: 8 },
    cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingTop: 12 },
    price: { fontSize: 18, fontWeight: '700', color: '#0ea5e9' },
    textLight: { color: '#f1f5f9' },
    textMuted: { color: '#94a3b8' },
});
