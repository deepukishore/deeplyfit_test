import React, { useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import Toast from 'react-native-toast-message';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import { getInitials } from '../utils/fitness';
import { colors, spacing } from '../utils/theme';

const QUICK_SUGGESTIONS = [
  'What should I eat for lunch? 🍽️',
  'Why am I not losing weight? 🤔',
  'How much protein did I have today? 💪',
  'Give me a workout suggestion 🏋️',
  'Am I on track this week? 📊',
  'Motivate me! ⚡',
];

const AIAssistant = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState([
    { role: 'assistant', content: `Hey ${user?.name || 'there'}! 👋 I’m your Deeply Fit AI coach. Ask me anything about your nutrition, workouts, or goals! 💪` },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [coachMode, setCoachMode] = useState('live');
  const scrollRef = useRef(null);
  const initials = getInitials(user?.name, user?.email);

  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, [messages]);

  const sendMessage = async (text) => {
    const msg = text || input.trim();
    if (!msg || loading) return;

    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: msg }]);
    setLoading(true);

    try {
      const history = messages.slice(-10).map((m) => ({ role: m.role, content: m.content }));
      const response = await api.chat({ message: msg, history });
      setCoachMode(response.mode === 'limited' ? 'limited' : 'live');
      setMessages((prev) => [...prev, { role: 'assistant', content: response.response }]);
    } catch (err) {
      Toast.show({ type: 'error', text1: err.message || 'Could not reach AI coach' });
      setInput(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={s.page} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={s.header}>
        <Text style={s.headerIcon}>🤖</Text>
        <View>
          <Text style={s.headerTitle}>AI Coach</Text>
          <Text style={[s.headerStatus, coachMode === 'limited' && s.headerStatusLimited]}>
            {coachMode === 'limited'
              ? '● Limited mode · Using your logged data'
              : '● Online · Knows your data'}
          </Text>
        </View>
        <TouchableOpacity
          style={s.clearBtn}
          onPress={() => setMessages([{ role: 'assistant', content: `Fresh start! 🌟 What would you like to work on today, ${user?.name || 'there'}?` }])}
        >
          <Text style={s.clearBtnText}>Clear</Text>
        </TouchableOpacity>
      </View>

      <View style={s.planBanner}>
        <Text style={s.planBannerText}>
          {user?.premium_status === 'active'
            ? 'PRO • Unlimited messages + 30-day memory'
            : 'FREE • 10 AI coach messages/day'}
        </Text>
      </View>

      <ScrollView ref={scrollRef} style={s.messages} contentContainerStyle={{ padding: spacing.md }}>
        {messages.map((msg, index) => (
          <View key={index} style={[s.msgRow, msg.role === 'user' ? s.msgRowUser : s.msgRowAssistant]}>
            {msg.role === 'assistant' && <Text style={s.botAvatar}>🤖</Text>}
            <View style={[s.bubble, msg.role === 'user' ? s.bubbleUser : s.bubbleAssistant]}>
              <Text style={[s.bubbleText, msg.role === 'user' && s.bubbleTextUser]}>{msg.content}</Text>
            </View>
            {msg.role === 'user' && <View style={s.userAvatar}><Text style={s.userAvatarText}>{initials}</Text></View>}
          </View>
        ))}
        {loading && (
          <View style={s.msgRowAssistant}>
            <Text style={s.botAvatar}>🤖</Text>
            <View style={s.bubbleAssistant}><ActivityIndicator size="small" color={colors.accentLime} /></View>
          </View>
        )}
      </ScrollView>

      {false && messages.length <= 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.suggestions} contentContainerStyle={{ padding: spacing.sm }}>
          {QUICK_SUGGESTIONS.map((suggestion, index) => (
            <TouchableOpacity key={index} style={s.suggestionChip} onPress={() => sendMessage(suggestion)} disabled={loading}>
              <Text style={s.suggestionText}>{suggestion}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <View style={s.inputArea}>
        <TextInput
          style={s.input}
          placeholder="Ask your AI coach anything..."
          placeholderTextColor={colors.textMuted}
          value={input}
          onChangeText={setInput}
          multiline
          maxHeight={100}
        />
        <TouchableOpacity style={[s.sendBtn, (!input.trim() || loading) && s.sendBtnDisabled]} onPress={() => sendMessage()} disabled={!input.trim() || loading}>
          {loading ? <ActivityIndicator size="small" color={colors.textInverse} /> : <Text style={s.sendBtnText}>↑</Text>}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bgPrimary },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    paddingTop: 56,
    backgroundColor: colors.bgCard,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerIcon: { fontSize: 24, marginRight: 10 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  headerStatus: { fontSize: 11, color: colors.accentLime, marginTop: 2 },
  headerStatusLimited: { color: colors.accentAmber },
  clearBtn: {
    marginLeft: 'auto',
    backgroundColor: colors.bgElevated,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: colors.border,
  },
  clearBtnText: { color: colors.textSecondary, fontWeight: '600', fontSize: 12 },
  planBanner: { paddingHorizontal: spacing.lg, paddingTop: 8, paddingBottom: 4 },
  planBannerText: { color: colors.textSecondary, fontSize: 11, fontWeight: '600' },
  messages: { flex: 1 },
  msgRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 10 },
  msgRowUser: { justifyContent: 'flex-end' },
  msgRowAssistant: { justifyContent: 'flex-start' },
  botAvatar: { fontSize: 24, marginRight: 7 },
  bubble: { maxWidth: '75%', borderRadius: 16, padding: 11 },
  bubbleUser: { backgroundColor: colors.accentPurple, borderBottomRightRadius: 4 },
  bubbleAssistant: { backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border, borderBottomLeftRadius: 4 },
  bubbleText: { color: colors.textPrimary, fontSize: 13.5, lineHeight: 20 },
  bubbleTextUser: { color: '#fff' },
  userAvatar: { width: 28, height: 28, borderRadius: 10, backgroundColor: colors.accentPurple, alignItems: 'center', justifyContent: 'center', marginLeft: 7 },
  userAvatarText: { color: '#fff', fontWeight: '800', fontSize: 11 },
  suggestions: { maxHeight: 56, borderTopWidth: 1, borderTopColor: colors.border },
  suggestionChip: { backgroundColor: colors.bgCard, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7, marginRight: 7, borderWidth: 1, borderColor: colors.border },
  suggestionText: { color: colors.textSecondary, fontSize: 12 },
  inputArea: { flexDirection: 'row', alignItems: 'flex-end', padding: spacing.md, backgroundColor: colors.bgCard, borderTopWidth: 1, borderTopColor: colors.border },
  input: { flex: 1, backgroundColor: colors.bgElevated, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 9, color: colors.textPrimary, fontSize: 14, borderWidth: 1, borderColor: colors.border, marginRight: 8 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.accentLime, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { opacity: 0.4 },
  sendBtnText: { color: colors.textInverse, fontWeight: '800', fontSize: 18 },
});

export default AIAssistant;
