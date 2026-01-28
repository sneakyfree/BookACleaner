import { View, Text, FlatList, StyleSheet, TouchableOpacity, TextInput, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';

type Conversation = {
    id: string;
    name: string;
    lastMessage: string;
    time: string;
    unread: number;
};

const MOCK_CONVERSATIONS: Conversation[] = [
    { id: '1', name: 'Maria Santos', lastMessage: 'See you tomorrow at 2pm!', time: '2m ago', unread: 2 },
    { id: '2', name: 'Sofia Chen', lastMessage: 'The cleaning is complete 🧹', time: '1h ago', unread: 0 },
    { id: '3', name: 'BookACleaner Support', lastMessage: 'How can we help?', time: '2d ago', unread: 0 },
];

export default function MessagesScreen() {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const [selectedConv, setSelectedConv] = useState<string | null>(null);
    const [message, setMessage] = useState('');

    const renderConversation = ({ item }: { item: Conversation }) => (
        <TouchableOpacity
            style={[styles.convCard, isDark && styles.cardDark, selectedConv === item.id && styles.convSelected]}
            onPress={() => setSelectedConv(item.id)}
        >
            <View style={styles.avatar}>
                <Text style={styles.avatarText}>{item.name[0]}</Text>
            </View>
            <View style={styles.convInfo}>
                <Text style={[styles.convName, isDark && styles.textLight]}>{item.name}</Text>
                <Text style={[styles.lastMessage, isDark && styles.textMuted]} numberOfLines={1}>
                    {item.lastMessage}
                </Text>
            </View>
            <View style={styles.convMeta}>
                <Text style={[styles.time, isDark && styles.textMuted]}>{item.time}</Text>
                {item.unread > 0 && (
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>{item.unread}</Text>
                    </View>
                )}
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={[styles.container, isDark && styles.containerDark]}>
            <View style={styles.header}>
                <Text style={[styles.title, isDark && styles.textLight]}>Messages</Text>
            </View>

            <FlatList
                data={MOCK_CONVERSATIONS}
                renderItem={renderConversation}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.list}
            />

            {selectedConv && (
                <View style={[styles.inputBar, isDark && styles.inputBarDark]}>
                    <TextInput
                        style={[styles.input, isDark && styles.textLight]}
                        placeholder="Type a message..."
                        placeholderTextColor="#94a3b8"
                        value={message}
                        onChangeText={setMessage}
                    />
                    <TouchableOpacity style={styles.sendBtn}>
                        <Ionicons name="send" size={20} color="#fff" />
                    </TouchableOpacity>
                </View>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    containerDark: { backgroundColor: '#0f172a' },
    header: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16 },
    title: { fontSize: 28, fontWeight: '700', color: '#1e293b' },
    list: { paddingHorizontal: 20 },
    convCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        marginBottom: 8,
    },
    cardDark: { backgroundColor: '#1e293b' },
    convSelected: { borderWidth: 2, borderColor: '#0ea5e9' },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#0ea5e9',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: { color: '#fff', fontSize: 18, fontWeight: '600' },
    convInfo: { flex: 1, marginLeft: 12 },
    convName: { fontSize: 16, fontWeight: '600', color: '#1e293b' },
    lastMessage: { fontSize: 14, color: '#64748b', marginTop: 2 },
    convMeta: { alignItems: 'flex-end' },
    time: { fontSize: 12, color: '#94a3b8' },
    badge: {
        backgroundColor: '#0ea5e9',
        borderRadius: 10,
        paddingHorizontal: 6,
        paddingVertical: 2,
        marginTop: 4,
    },
    badgeText: { color: '#fff', fontSize: 11, fontWeight: '600' },
    inputBar: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#e2e8f0',
    },
    inputBarDark: { backgroundColor: '#1e293b', borderTopColor: '#334155' },
    input: { flex: 1, fontSize: 16, color: '#1e293b' },
    sendBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#0ea5e9',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 8,
    },
    textLight: { color: '#f1f5f9' },
    textMuted: { color: '#94a3b8' },
});
