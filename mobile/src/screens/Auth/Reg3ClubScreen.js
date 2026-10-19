import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, radii } from '../../constants/theme';

export const CLUBS_DATA = [
  {
    id: 'rm',
    name: 'Real Madrid',
    league: 'LaLiga',
    ini: 'RM',
    c1: '#F3F5F9',
    c2: '#F2A33A',
    kits: [
      { id: 'home', name: 'Uy formasi', color: '#F3F5F9', trim: '#F2A33A', ink: '#0E1A3F' },
      { id: 'away', name: 'Mehmon formasi', color: '#0E1A3F', trim: '#F3F5F9', ink: '#F3F5F9' },
      { id: 'third', name: 'Uchinchi forma', color: '#121A42', trim: '#F2A33A', ink: '#F2A33A' },
    ],
  },
  {
    id: 'fcb',
    name: 'FC Barcelona',
    league: 'LaLiga',
    ini: 'FCB',
    c1: '#1D2F8C',
    c2: '#B8323F',
    kits: [
      { id: 'home', name: 'Uy formasi', color: '#1D2F8C', trim: '#B8323F', ink: '#F2A33A', pattern: 'stripes' },
      { id: 'away', name: 'Mehmon formasi', color: '#F2A33A', trim: '#1D2F8C', ink: '#1D2F8C' },
      { id: 'third', name: 'Uchinchi forma', color: '#19A7A1', trim: '#080C24', ink: '#080C24' },
    ],
  },
  {
    id: 'mu',
    name: 'Manchester United',
    league: 'Premier League',
    ini: 'MU',
    c1: '#B8323F',
    c2: '#F3F5F9',
    kits: [
      { id: 'home', name: 'Uy formasi', color: '#B8323F', trim: '#F3F5F9', ink: '#F3F5F9' },
      { id: 'away', name: 'Mehmon formasi', color: '#F3F5F9', trim: '#B8323F', ink: '#B8323F' },
      { id: 'third', name: 'Uchinchi forma', color: '#0E1A3F', trim: '#F2A33A', ink: '#F2A33A' },
    ],
  },
  {
    id: 'bay',
    name: 'Bayern München',
    league: 'Bundesliga',
    ini: 'BAY',
    c1: '#B8323F',
    c2: '#F3F5F9',
    kits: [
      { id: 'home', name: 'Uy formasi', color: '#B8323F', trim: '#F3F5F9', ink: '#F3F5F9', pattern: 'hoops' },
      { id: 'away', name: 'Mehmon formasi', color: '#F3F5F9', trim: '#B8323F', ink: '#B8323F' },
      { id: 'third', name: 'Uchinchi forma', color: '#0E1A3F', trim: '#19A7A1', ink: '#19A7A1' },
    ],
  },
  {
    id: 'juv',
    name: 'Juventus',
    league: 'Serie A',
    ini: 'JUV',
    c1: '#F3F5F9',
    c2: '#121A42',
    kits: [
      { id: 'home', name: 'Uy formasi', color: '#F3F5F9', trim: '#121A42', ink: '#F2A33A', pattern: 'stripes' },
      { id: 'away', name: 'Mehmon formasi', color: '#121A42', trim: '#F2A33A', ink: '#F2A33A' },
      { id: 'third', name: 'Uchinchi forma', color: '#F2A33A', trim: '#121A42', ink: '#121A42' },
    ],
  },
  {
    id: 'liv',
    name: 'Liverpool',
    league: 'Premier League',
    ini: 'LFC',
    c1: '#B8323F',
    c2: '#F2A33A',
    kits: [
      { id: 'home', name: 'Uy formasi', color: '#B8323F', trim: '#F3F5F9', ink: '#F3F5F9' },
      { id: 'away', name: 'Mehmon formasi', color: '#F3F5F9', trim: '#19A7A1', ink: '#19A7A1' },
      { id: 'third', name: 'Uchinchi forma', color: '#0E1A3F', trim: '#F2A33A', ink: '#F2A33A' },
    ],
  },
  {
    id: 'psg',
    name: 'PSG',
    league: 'Ligue 1',
    ini: 'PSG',
    c1: '#0E1A3F',
    c2: '#B8323F',
    kits: [
      { id: 'home', name: 'Uy formasi', color: '#0E1A3F', trim: '#B8323F', ink: '#F3F5F9', pattern: 'sash' },
      { id: 'away', name: 'Mehmon formasi', color: '#F3F5F9', trim: '#1D2F8C', ink: '#1D2F8C', pattern: 'sash' },
      { id: 'third', name: 'Uchinchi forma', color: '#121A42', trim: '#F2A33A', ink: '#F2A33A' },
    ],
  },
];

export default function Reg3ClubScreen({ onNext, onBack, initial = {}, initialData = {} }) {
  const source = Object.keys(initialData).length ? initialData : initial;
  const [selectedId, setSelectedId] = useState(source.favoriteClub || 'rm');

  const handleNext = () => {
    const club = CLUBS_DATA.find((c) => c.id === selectedId) || CLUBS_DATA[0];
    onNext({ favoriteClub: club.id, clubName: club.name });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Back button */}
        <Pressable onPress={onBack} hitSlop={10} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#F3F5F9" />
        </Pressable>

        {/* Step indicator */}
        <View style={styles.stepRow}>
          <View style={styles.stepIndicator}>
            <Text style={styles.stepText}>3 / 4-BOSQICH</Text>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: '75%' }]} />
          </View>
        </View>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Sevimli jamoangiz</Text>
          <Text style={styles.subtitle}>
            Asosiy ekranda sevimli klubingiz formasi va yangiliklari birinchi ko‘rinadi
          </Text>
        </View>

        {/* Clubs Grid */}
        <View style={styles.grid}>
          {CLUBS_DATA.map((c) => {
            const isSelected = c.id === selectedId;
            return (
              <Pressable
                key={c.id}
                onPress={() => setSelectedId(c.id)}
                style={[styles.clubCard, isSelected && styles.clubCardActive]}
              >
                <View style={[styles.crestCircle, { backgroundColor: c.c1 }]}>
                  <Text style={[styles.crestText, { color: c.c2 === '#F3F5F9' ? '#080C24' : c.c2 }]}>
                    {c.ini}
                  </Text>
                </View>
                <Text style={[styles.clubName, isSelected && styles.clubNameActive]} numberOfLines={1}>
                  {c.name}
                </Text>
                <Text style={styles.clubLeague}>{c.league}</Text>

                {isSelected && (
                  <View style={styles.checkBadge}>
                    <MaterialCommunityIcons name="check" size={14} color="#080C24" />
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>

        {/* Next button */}
        <Pressable onPress={handleNext} style={styles.nextBtn}>
          <Text style={styles.nextBtnText}>Davom etish</Text>
          <MaterialCommunityIcons name="arrow-right" size={20} color="#080C24" />
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#050818',
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    backgroundColor: '#121A42',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  stepIndicator: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(242, 163, 58, 0.12)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: radii.round,
  },
  stepText: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '800',
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: '#1B2560',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.accent,
    borderRadius: 2,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#F3F5F9',
  },
  subtitle: {
    fontSize: 14,
    color: '#A9B0D0',
    marginTop: 6,
    lineHeight: 20,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  clubCard: {
    width: '48%',
    backgroundColor: '#0E1A3F',
    borderRadius: radii.lg,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(243, 245, 249, 0.1)',
    position: 'relative',
  },
  clubCardActive: {
    borderColor: colors.accent,
    backgroundColor: 'rgba(242, 163, 58, 0.08)',
  },
  crestCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(243, 245, 249, 0.2)',
  },
  crestText: {
    fontSize: 15,
    fontWeight: '900',
  },
  clubName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F3F5F9',
    textAlign: 'center',
  },
  clubNameActive: {
    color: colors.accent,
  },
  clubLeague: {
    fontSize: 11,
    color: '#8D95BD',
    marginTop: 2,
  },
  checkBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextBtn: {
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  nextBtnText: {
    color: '#080C24',
    fontSize: 15,
    fontWeight: '800',
  },
});
