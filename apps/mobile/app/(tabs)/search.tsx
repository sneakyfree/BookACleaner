import { View, Text, TextInput, FlatList, StyleSheet, TouchableOpacity, useColorScheme, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';

type Cleaner = {
    id: string;
    name: string;
    rating: number;
    reviews: number;
    services: string[];
    hourlyRate: number;
    verified: boolean;
    avatar?: string;
};

const MOCK_CLEANERS: Cleaner[] = [
    { id: '1', name: 'Maria Santos', rating: 4.95, reviews: 234, services: ['Deep Clean', 'Standard', 'Airbnb'], hourlyRate: 45, verified: true },
    { id: '2', name: 'Sofia Chen', rating: 4.88, reviews: 156, services: ['Standard', 'Office'], hourlyRate: 40, verified: true },
    { id: '3', name: 'James Wilson', rating: 4.72, reviews: 89, services: ['Standard', 'Move-out'], hourlyRate: 35, verified: false },
];

export default function SearchScreen() {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const router = useRouter();
    const [search, setSearch] = useState('');

    const filteredCleaners = MOCK_CLEANERS.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.services.some(s => s.toLowerCase().includes(search.toLowerCase()))
    );

    const renderCleaner = ({ item }: { item: Cleaner }) => (
        <TouchableOpacity
            style={[styles.card, isDark && styles.cardDark]}
            onPress={() => router.push(`/cleaners/${item.id}`)}
        >
            <View style={styles.cardContent}>
                <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{item.name[0]}</Text>
                </View>
                <View style={styles.info}>
                    <View style={styles.nameRow}>
                        <Text style={[styles.name, isDark && styles.textLight]}>{item.name}</Text>
                        {item.verified && (
                            <Ionicons name="checkmark-circle" size={16} color="#0ea5e9" />
                        )}
                    </View>
                    <View style={styles.ratingRow}>
                        <Ionicons name="star" size={14} color="#f59e0b" />
                        <Text style={[styles.rating, isDark && styles.textMuted]}>
                            {item.rating} ({item.reviews} reviews)
                        </Text>
                    </View>
                    <View style={styles.services}>
                        {item.services.slice(0, 2).map((s, i) => (
                            <View key={i} style={styles.serviceTag}>
                                <Text style={styles.serviceText}>{s}</Text>
                            </View>
                        ))}
                    </View>
                </View>
                <View style={styles.priceCol}>
                    <Text style={[styles.price, isDark && styles.textLight]}>${item.hourlyRate}</Text>
                    <Text style={[styles.perHour, isDark && styles.textMuted]}>/hour</Text>
                </View>
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={[styles.container, isDark && styles.containerDark]}>
            <View style={styles.header}>
                <Text style={[styles.title, isDark && styles.textLight]}>Find Cleaners</Text>
            </View>

            <View style={[styles.searchBar, isDark && styles.searchBarDark]}>
                <Ionicons name="search" size={20} color="#64748b" />
                <TextInput
                    style={[styles.searchInput, isDark && styles.textLight]}
                    placeholder="Search by name or service..."
                    placeholderTextColor="#94a3b8"
                    value={search}
                    onChangeText={setSearch}
                />
            </View>

            <FlatList
                data={filteredCleaners}
                renderItem={renderCleaner}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.list}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    containerDark: { backgroundColor: '#0f172a' },
    header: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16 },
    title: { fontSize: 28, fontWeight: '700', color: '#1e293b' },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 20,
        marginBottom: 16,
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#fff',
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
    },
    searchBarDark: { backgroundColor: '#1e293b' },
    searchInput: { flex: 1, marginLeft: 12, fontSize: 16, color: '#1e293b' },
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
    },
    cardDark: { backgroundColor: '#1e293b' },
    cardContent: { flexDirection: 'row', alignItems: 'center' },
    avatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#0ea5e9',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: { color: '#fff', fontSize: 22, fontWeight: '600' },
    info: { flex: 1, marginLeft: 12 },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    name: { fontSize: 16, fontWeight: '600', color: '#1e293b' },
    ratingRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
    rating: { fontSize: 14, color: '#64748b', marginLeft: 4 },
    services: { flexDirection: 'row', marginTop: 8, gap: 6 },
    serviceTag: { backgroundColor: '#e0f2fe', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
    serviceText: { fontSize: 11, color: '#0ea5e9', fontWeight: '500' },
    priceCol: { alignItems: 'flex-end' },
    price: { fontSize: 20, fontWeight: '700', color: '#0ea5e9' },
    perHour: { fontSize: 12, color: '#64748b' },
    textLight: { color: '#f1f5f9' },
    textMuted: { color: '#94a3b8' },
});
