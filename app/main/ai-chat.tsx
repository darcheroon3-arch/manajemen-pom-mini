import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { supabase } from '@/lib/supabase';
import { Send, Bot, User, Sparkles, RefreshCw } from 'lucide-react-native';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  time: string;
}

const quickPrompts = [
  'Data keuangan saya',
  'Saran pengembangan profit',
  'Tren penjualan',
  'Status stok bensin',
  'Analisis pengeluaran',
];

export default function AIChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: '👋 Halo! Saya AI Asisten Keuangan untuk Pom Mini Anda.\n\nTanyakan saya tentang:\n• Data keuangan & laporan\n• Saran pengembangan profit\n• Tren penjualan\n• Status stok bensin\n• Analisis pengeluaran\n\nAtau ketik pertanyaan Anda sendiri!',
      time: getCurrentTime(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  function getCurrentTime() {
    const now = new Date();
    return String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
  }

  const sendMessage = async (text?: string) => {
    const prompt = (text || input).trim();
    if (!prompt || loading) return;

    const userMsg: ChatMessage = {
      id: 'u-' + Date.now(),
      role: 'user',
      content: prompt,
      time: getCurrentTime(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const { data } = await supabase.functions.invoke('ai-assistant', {
        body: { prompt },
      });

      const assistantMsg: ChatMessage = {
        id: 'a-' + Date.now(),
        role: 'assistant',
        content: data?.response || 'Maaf, terjadi kesalahan. Coba lagi.',
        time: data?.time || getCurrentTime(),
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: 'e-' + Date.now(),
        role: 'assistant',
        content: '⚠️ Gagal terhubung ke AI. Pastikan koneksi internet aktif.\n\nError: ' + err.message,
        time: getCurrentTime(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  const clearChat = () => {
    setMessages([
      {
        id: 'welcome-2',
        role: 'assistant',
        content: '👋 Halo! Saya AI Asisten Keuangan untuk Pom Mini Anda.\n\nTanyakan saya tentang:\n• Data keuangan & laporan\n• Saran pengembangan profit\n• Tren penjualan\n• Status stok bensin\n• Analisis pengeluaran\n\nAtau ketik pertanyaan Anda sendiri!',
        time: getCurrentTime(),
      },
    ]);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Sparkles size={20} color="#8b5cf6" />
          <Text style={styles.headerTitle}>AI Asisten</Text>
        </View>
        <TouchableOpacity onPress={clearChat} style={styles.clearButton}>
          <RefreshCw size={18} color="#94a3b8" />
        </TouchableOpacity>
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.chatArea}
        contentContainerStyle={styles.chatContent}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.map(msg => (
          <View key={msg.id} style={[styles.messageRow, msg.role === 'user' ? styles.userRow : styles.assistantRow]}>
            <View style={styles.messageBubble}>
              <View style={styles.messageHeader}>
                {msg.role === 'assistant' ? (
                  <Bot size={14} color="#8b5cf6" />
                ) : (
                  <User size={14} color="#3b82f6" />
                )}
                <Text style={[styles.messageRole, msg.role === 'assistant' ? styles.assistantRole : styles.userRole]}>
                  {msg.role === 'assistant' ? 'AI Asisten' : 'Anda'}
                </Text>
                <Text style={styles.messageTime}>{msg.time}</Text>
              </View>
              <Text style={styles.messageText}>{msg.content}</Text>
            </View>
          </View>
        ))}
        {loading && (
          <View style={styles.loadingRow}>
            <View style={styles.loadingBubble}>
              <ActivityIndicator size="small" color="#8b5cf6" />
              <Text style={styles.loadingText}>AI sedang berpikir...</Text>
            </View>
          </View>
        )}
      </ScrollView>

      <View style={styles.quickPrompts}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickPromptsContent}>
          {quickPrompts.map((p, i) => (
            <TouchableOpacity key={i} style={styles.quickPrompt} onPress={() => sendMessage(p)}>
              <Text style={styles.quickPromptText}>{p}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Tanyakan sesuatu..."
          placeholderTextColor="#64748b"
          multiline
          maxLength={500}
          onSubmitEditing={() => sendMessage()}
          blurOnSubmit={false}
        />
        <TouchableOpacity
          style={[styles.sendButton, !input.trim() && styles.sendButtonDisabled]}
          onPress={() => sendMessage()}
          disabled={!input.trim() || loading}
        >
          <Send size={20} color={input.trim() ? '#fff' : '#64748b'} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 72,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  clearButton: { padding: 6 },
  chatArea: { flex: 1 },
  chatContent: { padding: 16, paddingBottom: 8 },
  messageRow: { marginBottom: 12 },
  userRow: { alignItems: 'flex-end' },
  assistantRow: { alignItems: 'flex-start' },
  messageBubble: {
    maxWidth: '90%',
    borderRadius: 14,
    padding: 12,
    backgroundColor: '#1e293b',
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  messageRole: { fontSize: 12, fontWeight: '600' },
  assistantRole: { color: '#8b5cf6' },
  userRole: { color: '#3b82f6' },
  messageTime: { color: '#64748b', fontSize: 11 },
  messageText: { color: '#e2e8f0', fontSize: 14, lineHeight: 20 },
  loadingRow: { alignItems: 'flex-start', marginBottom: 12 },
  loadingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 12,
  },
  loadingText: { color: '#94a3b8', fontSize: 13 },
  quickPrompts: { maxHeight: 44, marginBottom: 4 },
  quickPromptsContent: { paddingHorizontal: 16, gap: 8 },
  quickPrompt: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#334155',
  },
  quickPromptText: { color: '#94a3b8', fontSize: 12, fontWeight: '500' },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    backgroundColor: '#0f172a',
  },
  input: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: '#fff',
    fontSize: 14,
    maxHeight: 80,
  },
  sendButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 20,
    padding: 10,
  },
  sendButtonDisabled: {
    backgroundColor: '#1e293b',
  },
});
