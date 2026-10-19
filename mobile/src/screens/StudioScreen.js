import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import JerseyVisualizer from '../components/ui/JerseyVisualizer';
import { useToast } from '../components/ui/Toast';
import { colors, radii, spacing } from '../constants/theme';

const SOLIDS = [
  '#0E1A3F',
  '#F3F5F9',
  '#1D2F8C',
  '#19A7A1',
  '#F2A33A',
  '#B8323F',
  '#121A42',
  '#4CAF6A',
];

const GRADS = [
  { name: 'Quyosh', value: '#F2A33A,#B8323F' },
  { name: 'Okean', value: '#19A7A1,#1D2F8C' },
  { name: 'Olov', value: '#B8323F,#0E1A3F' },
  { name: 'Neon', value: '#9184D9,#19A7A1' },
  { name: 'Tun', value: '#1D2F8C,#080C24' },
  { name: 'Formo', value: '#F2A33A,#B8323F,#1D2F8C' },
];

const INKS = ['#F3F5F9', '#F2A33A', '#19A7A1', '#B8323F', '#080C24'];

const FONTS = [
  'Saira Extra Condensed',
  'Bebas Neue',
  'Russo One',
  'Permanent Marker',
  'Pacifico',
  'Unbounded',
];

const PRINTS = [
  { id: 'std', title: 'Oddiy', sub: 'DTF, mat', price: 0 },
  { id: 'glow', title: 'Qorong‘ida yonadi', sub: 'Raqam tunda porlaydi', price: 15000 },
  { id: 'refl', title: 'Reflektiv', sub: 'Chiroqda yaltiraydi', price: 15000 },
  { id: 'gold', title: 'Metallik oltin', sub: 'Folga bosma', price: 20000 },
];

const PATCHES = [
  { id: 'cap', title: 'Kapitan', icon: 'shield-star', where: 'Chap yeng', price: 5000 },
  { id: 'flag', title: 'Bayroq', icon: 'flag', where: 'O‘ng yeng', price: 5000 },
  { id: 'star', title: 'Yulduz', icon: 'star', where: 'Gerb ustida', price: 5000 },
];

export default function StudioScreen({
  auth,
  t,
  onBack,
  onProceedToSize,
}) {
  const toast = useToast();
  const userName = auth?.user?.fullName?.split(' ')[0]?.toUpperCase() || 'AZIZ';

  // Design state
  const [side, setSide] = useState('front');
  const [tool, setTool] = useState('rang'); // rang | matn | orqa | logo | shorts | extra

  // Colors & gradient
  const [mode, setMode] = useState('solid'); // solid | grad
  const [color, setColor] = useState('#0E1A3F');
  const [grad, setGrad] = useState('#F2A33A,#B8323F,#1D2F8C');
  const [gradAngle, setGradAngle] = useState(160);

  // Front Motto
  const [motto, setMotto] = useState('');
  const [mottoSize, setMottoSize] = useState(24);
  const [outline, setOutline] = useState(false);
  const [collarText, setCollarText] = useState('');

  // Back Player & Number
  const [player, setPlayer] = useState(userName);
  const [number, setNumber] = useState('10');
  const [ink, setInk] = useState('#F3F5F9');
  const [font, setFont] = useState('Saira Extra Condensed');

  // Crest / AI Logo
  const [crest, setCrest] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiOptions, setAiOptions] = useState([]);

  // Shorts
  const [hasShorts, setHasShorts] = useState(true);
  const [soColor, setSoColor] = useState('#0E1A3F');
  const [soTrim, setSoTrim] = useState('#F3F5F9');
  const [soInk, setSoInk] = useState('#F3F5F9');
  const [soNum, setSoNum] = useState(true);

  // Extra patches & print
  const [selectedPatches, setSelectedPatches] = useState([]);
  const [selectedPrint, setSelectedPrint] = useState('std');

  // Price calculations
  const printExtra = PRINTS.find((p) => p.id === selectedPrint)?.price || 0;
  const patchesExtra = selectedPatches.length * 5000;
  const gradExtra = mode === 'grad' ? 20000 : 0;
  const mottoExtra = motto.trim() ? 10000 : 0;
  const crestExtra = crest ? 10000 : 0;
  const shortsExtra = hasShorts ? 60000 : 0;

  const unitPrice = 129000 + gradExtra + mottoExtra + crestExtra + patchesExtra + printExtra + shortsExtra;

  const handleMatchShorts = () => {
    setSoColor(mode === 'grad' ? grad.split(',')[0] : color);
    setSoTrim(ink);
    setSoInk(ink);
    toast.show('Shortik ranglari futbolkaga moslandi', 'success');
  };

  const handleAiGenerate = () => {
    if (!aiPrompt.trim()) {
      toast.show('Logo uchun tavsif yozing', 'error');
      return;
    }
    setAiLoading(true);
    setTimeout(() => {
      setAiLoading(false);
      const initials = aiPrompt
        .split(' ')
        .map((w) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 3) || 'FC';
      setAiOptions([
        { id: 1, initials, icon: 'crown', color: '#F2A33A' },
        { id: 2, initials, icon: 'lightning-bolt', color: '#19A7A1' },
        { id: 3, initials, icon: 'star', color: '#B8323F' },
      ]);
      setCrest(initials);
      toast.show('AI logotiplar generatsiya qilindi', 'success');
    }, 1200);
  };

  const togglePatch = (patchId) => {
    if (selectedPatches.includes(patchId)) {
      setSelectedPatches(selectedPatches.filter((p) => p !== patchId));
    } else {
      setSelectedPatches([...selectedPatches, patchId]);
      setSide('front');
    }
  };

  const handleProceed = () => {
    const designConfig = {
      color,
      mode,
      grad: mode === 'grad' ? grad : '',
      gradAngle,
      motto: motto.trim(),
      mottoSize,
      outline,
      collarText: collarText.trim(),
      player: player.trim().toUpperCase(),
      number: number.trim(),
      ink,
      font,
      crest,
      patches: selectedPatches,
      print: selectedPrint,
      hasShorts,
      shorts: hasShorts
        ? {
            color: soColor,
            trim: soTrim,
            ink: soInk,
            number: soNum ? number : '',
          }
        : null,
      unitPrice,
    };

    onProceedToSize?.(designConfig);
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Top Bar */}
          <View style={styles.topBar}>
            {Boolean(onBack) && (
              <Pressable onPress={onBack} hitSlop={10} style={styles.iconBtn}>
                <MaterialCommunityIcons name="arrow-left" size={24} color="#F3F5F9" />
              </Pressable>
            )}
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={styles.topTitle}>Dizayn studiyasi</Text>
              <Text style={styles.topSub}>Noldan o‘z formangizni yarating</Text>
            </View>
            <View style={{ width: 40 }} />
          </View>

          {/* Jersey Visualizer Stage */}
          <View style={styles.stage}>
            <View style={styles.sideToggle}>
              <Pressable
                onPress={() => setSide('front')}
                style={[styles.sideBtn, side === 'front' && styles.sideBtnActive]}
              >
                <Text style={[styles.sideBtnText, side === 'front' && styles.sideBtnTextActive]}>
                  Old
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setSide('back')}
                style={[styles.sideBtn, side === 'back' && styles.sideBtnActive]}
              >
                <Text style={[styles.sideBtnText, side === 'back' && styles.sideBtnTextActive]}>
                  Orqa
                </Text>
              </Pressable>
            </View>

            <View style={styles.visualWrap}>
              <JerseyVisualizer
                color={color}
                trim={ink}
                ink={ink}
                pattern="none"
                grad={mode === 'grad' ? grad : ''}
                gradAngle={gradAngle}
                player={player}
                number={number}
                motto={motto}
                mottoSize={mottoSize}
                outline={outline}
                crest={crest}
                patches={selectedPatches}
                side={side}
                size={200}
                showShorts={hasShorts}
                shorts={{
                  color: soColor,
                  trim: soTrim,
                  ink: soInk,
                  number: soNum ? number : '',
                }}
              />
            </View>
          </View>

          {/* Tools Menu Bar */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.toolsBar}
          >
            {[
              { id: 'rang', label: 'Rang', icon: 'palette' },
              { id: 'matn', label: 'Old yozuv', icon: 'format-text' },
              { id: 'orqa', label: 'Orqa', icon: 'numeric' },
              { id: 'logo', label: 'Logo', icon: 'shield-account' },
              { id: 'shorts', label: 'Shortik', icon: 'tshirt-crew' },
              { id: 'extra', label: 'Boshqa', icon: 'seal' },
            ].map((tItem) => {
              const active = tool === tItem.id;
              return (
                <Pressable
                  key={tItem.id}
                  onPress={() => {
                    setTool(tItem.id);
                    if (tItem.id === 'orqa') setSide('back');
                    if (tItem.id === 'matn' || tItem.id === 'logo') setSide('front');
                  }}
                  style={[styles.toolChip, active && styles.toolChipActive]}
                >
                  <MaterialCommunityIcons
                    name={tItem.icon}
                    size={18}
                    color={active ? colors.accent : colors.muted}
                  />
                  <Text style={[styles.toolLabel, active && styles.toolLabelActive]}>
                    {tItem.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Active Tool Content Card */}
          <View style={styles.card}>
            {/* 1. RANG TOOL */}
            {tool === 'rang' && (
              <View>
                <View style={styles.modeToggle}>
                  <Pressable
                    onPress={() => setMode('solid')}
                    style={[styles.modeBtn, mode === 'solid' && styles.modeBtnActive]}
                  >
                    <Text style={[styles.modeText, mode === 'solid' && styles.modeTextActive]}>
                      Bir rang
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setMode('grad')}
                    style={[styles.modeBtn, mode === 'grad' && styles.modeBtnActive]}
                  >
                    <Text style={[styles.modeText, mode === 'grad' && styles.modeTextActive]}>
                      Gradient (+20 000 so‘m)
                    </Text>
                  </Pressable>
                </View>

                {mode === 'solid' ? (
                  <View style={styles.colorsGrid}>
                    {SOLIDS.map((c) => (
                      <Pressable
                        key={c}
                        onPress={() => setColor(c)}
                        style={[
                          styles.colorSwatch,
                          { backgroundColor: c },
                          color === c && styles.colorSwatchActive,
                        ]}
                      />
                    ))}
                  </View>
                ) : (
                  <View>
                    <View style={styles.gradsGrid}>
                      {GRADS.map((g) => (
                        <Pressable
                          key={g.name}
                          onPress={() => setGrad(g.value)}
                          style={[
                            styles.gradItem,
                            grad === g.value && styles.gradItemActive,
                          ]}
                        >
                          <View
                            style={[
                              styles.gradPreview,
                              {
                                backgroundColor: g.value.split(',')[0],
                              },
                            ]}
                          />
                          <Text
                            style={[
                              styles.gradName,
                              grad === g.value && styles.gradNameActive,
                            ]}
                          >
                            {g.name}
                          </Text>
                        </Pressable>
                      ))}
                    </View>

                    {/* Gradient angle selector */}
                    <Text style={[styles.fieldLabel, { marginTop: 14 }]}>Gradient burchagi: {gradAngle}°</Text>
                    <View style={styles.angleRow}>
                      {[45, 90, 135, 160, 225].map((ang) => (
                        <Pressable
                          key={ang}
                          onPress={() => setGradAngle(ang)}
                          style={[
                            styles.angleChip,
                            gradAngle === ang && styles.angleChipActive,
                          ]}
                        >
                          <Text
                            style={[
                              styles.angleText,
                              gradAngle === ang && styles.angleTextActive,
                            ]}
                          >
                            {ang}°
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                )}
              </View>
            )}

            {/* 2. MATN TOOL */}
            {tool === 'matn' && (
              <View>
                <Text style={styles.fieldLabel}>Ko‘krakdagi yozuv (motto)</Text>
                <TextInput
                  value={motto}
                  onChangeText={setMotto}
                  placeholder="Masalan: Chempion, Olg‘a"
                  placeholderTextColor={colors.caption}
                  maxLength={14}
                  style={styles.input}
                />

                <Text style={[styles.fieldLabel, { marginTop: 14 }]}>
                  Yozuv hajmi: {mottoSize}px
                </Text>
                <View style={styles.stepperRow}>
                  <Pressable
                    onPress={() => setMottoSize(Math.max(16, mottoSize - 2))}
                    style={styles.stepBtn}
                  >
                    <MaterialCommunityIcons name="minus" size={18} color="#F3F5F9" />
                  </Pressable>
                  <Text style={styles.stepVal}>{mottoSize} px</Text>
                  <Pressable
                    onPress={() => setMottoSize(Math.min(36, mottoSize + 2))}
                    style={styles.stepBtn}
                  >
                    <MaterialCommunityIcons name="plus" size={18} color="#F3F5F9" />
                  </Pressable>
                </View>

                {/* Outline Switch */}
                <Pressable
                  onPress={() => setOutline(!outline)}
                  style={styles.switchRow}
                >
                  <Text style={styles.switchTitle}>Qora hoshiya (Outline)</Text>
                  <View style={[styles.switchTrack, outline && styles.switchTrackActive]}>
                    <View style={[styles.switchThumb, outline && styles.switchThumbActive]} />
                  </View>
                </Pressable>
              </View>
            )}

            {/* 3. ORQA TOOL */}
            {tool === 'orqa' && (
              <View>
                <Text style={styles.fieldLabel}>Formadagi ism</Text>
                <TextInput
                  value={player}
                  onChangeText={(t) =>
                    setPlayer(t.replace(/[^A-Za-z' ]/g, '').toUpperCase().slice(0, 10))
                  }
                  placeholder="AZIZ"
                  placeholderTextColor={colors.caption}
                  maxLength={10}
                  autoCapitalize="characters"
                  style={styles.input}
                />

                <Text style={[styles.fieldLabel, { marginTop: 14 }]}>Raqam (1–99)</Text>
                <TextInput
                  value={number}
                  onChangeText={(t) => setNumber(t.replace(/\D/g, '').slice(0, 2))}
                  placeholder="10"
                  placeholderTextColor={colors.caption}
                  keyboardType="number-pad"
                  maxLength={2}
                  style={styles.input}
                />

                {/* Quick numbers */}
                <View style={styles.quickRow}>
                  {['1', '7', '9', '10', '23'].map((n) => (
                    <Pressable
                      key={n}
                      onPress={() => setNumber(n)}
                      style={[styles.quickChip, number === n && styles.quickChipActive]}
                    >
                      <Text style={[styles.quickText, number === n && styles.quickTextActive]}>
                        {n}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                {/* Ink color picker */}
                <Text style={[styles.fieldLabel, { marginTop: 10 }]}>Yozuv va raqam rangi</Text>
                <View style={styles.colorsGrid}>
                  {INKS.map((c) => (
                    <Pressable
                      key={c}
                      onPress={() => setInk(c)}
                      style={[
                        styles.colorSwatch,
                        { backgroundColor: c },
                        ink === c && styles.colorSwatchActive,
                      ]}
                    />
                  ))}
                </View>
              </View>
            )}

            {/* 4. LOGO TOOL */}
            {tool === 'logo' && (
              <View>
                <Text style={styles.fieldLabel}>AI Logo generator</Text>
                <Text style={styles.subHint}>
                  Jamoangiz yoki logotipingiz nomini kiriting — sun’iy intellekt mos gerb chizib beradi
                </Text>
                <View style={styles.aiInputRow}>
                  <TextInput
                    value={aiPrompt}
                    onChangeText={setAiPrompt}
                    placeholder="Masalan: Oltin sher, Burgut"
                    placeholderTextColor={colors.caption}
                    style={styles.aiInput}
                  />
                  <Pressable
                    disabled={aiLoading}
                    onPress={handleAiGenerate}
                    style={styles.aiBtn}
                  >
                    {aiLoading ? (
                      <ActivityIndicator size="small" color="#080C24" />
                    ) : (
                      <MaterialCommunityIcons name="auto-fix" size={20} color="#080C24" />
                    )}
                  </Pressable>
                </View>

                {aiOptions.length > 0 && (
                  <View style={styles.aiOptionsRow}>
                    {aiOptions.map((opt) => (
                      <Pressable
                        key={opt.id}
                        onPress={() => setCrest(opt.initials)}
                        style={[
                          styles.aiOptCard,
                          crest === opt.initials && styles.aiOptCardActive,
                        ]}
                      >
                        <MaterialCommunityIcons name={opt.icon} size={24} color={opt.color} />
                        <Text style={styles.aiOptText}>{opt.initials}</Text>
                      </Pressable>
                    ))}
                  </View>
                )}

                {Boolean(crest) && (
                  <Pressable onPress={() => setCrest('')} style={styles.clearCrestBtn}>
                    <MaterialCommunityIcons name="trash-can-outline" size={16} color="#E8543F" />
                    <Text style={styles.clearCrestText}>Logoni olib tashlash</Text>
                  </Pressable>
                )}
              </View>
            )}

            {/* 5. SHORTS TOOL */}
            {tool === 'shorts' && (
              <View>
                <Pressable
                  onPress={() => setHasShorts(!hasShorts)}
                  style={styles.switchRow}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.switchTitle}>Shortik qo‘shish</Text>
                    <Text style={styles.switchSub}>Futbolka + shortik to‘plami (+60 000 so‘m)</Text>
                  </View>
                  <View style={[styles.switchTrack, hasShorts && styles.switchTrackActive]}>
                    <View style={[styles.switchThumb, hasShorts && styles.switchThumbActive]} />
                  </View>
                </Pressable>

                {hasShorts && (
                  <View style={{ marginTop: 14 }}>
                    <Pressable onPress={handleMatchShorts} style={styles.matchBtn}>
                      <MaterialCommunityIcons name="auto-fix" size={16} color={colors.accent} />
                      <Text style={styles.matchBtnText}>Futbolka rangiga moslashtirish</Text>
                    </Pressable>

                    <Text style={[styles.fieldLabel, { marginTop: 14 }]}>Shortik asosiy rangi</Text>
                    <View style={styles.colorsGrid}>
                      {SOLIDS.map((c) => (
                        <Pressable
                          key={c}
                          onPress={() => setSoColor(c)}
                          style={[
                            styles.colorSwatch,
                            { backgroundColor: c },
                            soColor === c && styles.colorSwatchActive,
                          ]}
                        />
                      ))}
                    </View>

                    <Text style={[styles.fieldLabel, { marginTop: 14 }]}>Hoshiya va chiziqlar</Text>
                    <View style={styles.colorsGrid}>
                      {INKS.map((c) => (
                        <Pressable
                          key={c}
                          onPress={() => setSoTrim(c)}
                          style={[
                            styles.colorSwatch,
                            { backgroundColor: c },
                            soTrim === c && styles.colorSwatchActive,
                          ]}
                        />
                      ))}
                    </View>
                  </View>
                )}
              </View>
            )}

            {/* 6. EXTRA TOOL */}
            {tool === 'extra' && (
              <View>
                <Text style={styles.fieldLabel}>Yamoqlar (+5 000 so‘m/dona)</Text>
                <View style={styles.patchesGrid}>
                  {PATCHES.map((p) => {
                    const active = selectedPatches.includes(p.id);
                    return (
                      <Pressable
                        key={p.id}
                        onPress={() => togglePatch(p.id)}
                        style={[styles.patchCard, active && styles.patchCardActive]}
                      >
                        <MaterialCommunityIcons
                          name={p.icon}
                          size={24}
                          color={active ? colors.accent : colors.muted}
                        />
                        <Text style={[styles.patchTitle, active && styles.patchTitleActive]}>
                          {p.title}
                        </Text>
                        <Text style={styles.patchWhere}>{p.where}</Text>
                      </Pressable>
                    );
                  })}
                </View>

                <Text style={[styles.fieldLabel, { marginTop: 20 }]}>Bosma sifati</Text>
                <View style={styles.printsList}>
                  {PRINTS.map((pr) => {
                    const active = selectedPrint === pr.id;
                    return (
                      <Pressable
                        key={pr.id}
                        onPress={() => setSelectedPrint(pr.id)}
                        style={[styles.printItem, active && styles.printItemActive]}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.printTitle, active && styles.printTitleActive]}>
                            {pr.title}
                          </Text>
                          <Text style={styles.printSub}>{pr.sub}</Text>
                        </View>
                        <Text style={styles.printPrice}>
                          {pr.price ? `+${pr.price.toLocaleString('uz-UZ')} so‘m` : 'Asosiy narx'}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Bottom summary and Proceed button */}
            <View style={styles.bottomBar}>
              <View>
                <Text style={styles.totalLabel}>Bir komplekt narxi</Text>
                <Text style={styles.totalPrice}>
                  {unitPrice.toLocaleString('uz-UZ')} so‘m
                </Text>
              </View>

              <Pressable onPress={handleProceed} style={styles.proceedBtn}>
                <Text style={styles.proceedText}>Davom etish</Text>
                <MaterialCommunityIcons name="arrow-right" size={20} color="#080C24" />
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#050818',
  },
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 110,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    backgroundColor: '#0E1A3F',
    borderWidth: 1,
    borderColor: 'rgba(243, 245, 249, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F3F5F9',
  },
  topSub: {
    fontSize: 11,
    color: '#8D95BD',
    marginTop: 2,
  },
  stage: {
    backgroundColor: '#0E1A3F',
    borderRadius: radii.xl,
    paddingVertical: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(243, 245, 249, 0.12)',
    position: 'relative',
    marginBottom: 14,
  },
  sideToggle: {
    position: 'absolute',
    top: 14,
    left: 14,
    flexDirection: 'row',
    backgroundColor: '#121A42',
    borderRadius: radii.round,
    padding: 2,
    zIndex: 10,
  },
  sideBtn: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: radii.round,
  },
  sideBtnActive: {
    backgroundColor: colors.accent,
  },
  sideBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#A9B0D0',
  },
  sideBtnTextActive: {
    color: '#080C24',
  },
  visualWrap: {
    marginVertical: 4,
  },
  toolsBar: {
    gap: 8,
    paddingBottom: 12,
  },
  toolChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0E1A3F',
    borderRadius: radii.round,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  toolChipActive: {
    borderColor: colors.accent,
    backgroundColor: 'rgba(242, 163, 58, 0.12)',
  },
  toolLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#A9B0D0',
  },
  toolLabelActive: {
    color: colors.accent,
  },
  card: {
    backgroundColor: '#0E1A3F',
    borderRadius: radii.xl,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(243, 245, 249, 0.12)',
  },
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: '#121A42',
    borderRadius: radii.md,
    padding: 3,
    marginBottom: 16,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: radii.sm,
  },
  modeBtnActive: {
    backgroundColor: '#1B2560',
    borderWidth: 1,
    borderColor: colors.accent,
  },
  modeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#A9B0D0',
  },
  modeTextActive: {
    color: colors.accent,
    fontWeight: '700',
  },
  colorsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  colorSwatch: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: 'rgba(243, 245, 249, 0.2)',
  },
  colorSwatchActive: {
    borderColor: colors.accent,
    transform: [{ scale: 1.1 }],
  },
  gradsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  gradItem: {
    width: '31%',
    backgroundColor: '#121A42',
    borderRadius: radii.md,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  gradItemActive: {
    borderColor: colors.accent,
    backgroundColor: 'rgba(242, 163, 58, 0.1)',
  },
  gradPreview: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginBottom: 6,
  },
  gradName: {
    fontSize: 11,
    fontWeight: '700',
    color: '#A9B0D0',
  },
  gradNameActive: {
    color: colors.accent,
  },
  angleRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  angleChip: {
    flex: 1,
    paddingVertical: 8,
    backgroundColor: '#121A42',
    borderRadius: radii.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  angleChipActive: {
    borderColor: colors.accent,
    backgroundColor: 'rgba(242, 163, 58, 0.12)',
  },
  angleText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#A9B0D0',
  },
  angleTextActive: {
    color: colors.accent,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#A9B0D0',
    marginBottom: 6,
  },
  subHint: {
    fontSize: 11,
    color: '#8D95BD',
    marginBottom: 10,
    lineHeight: 16,
  },
  input: {
    backgroundColor: '#121A42',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'rgba(243, 245, 249, 0.14)',
    color: '#F3F5F9',
    fontSize: 15,
    fontWeight: '700',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#121A42',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'rgba(243, 245, 249, 0.14)',
    padding: 6,
  },
  stepBtn: {
    width: 38,
    height: 38,
    borderRadius: radii.sm,
    backgroundColor: '#1B2560',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepVal: {
    fontSize: 15,
    fontWeight: '800',
    color: '#F3F5F9',
  },
  quickRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
    marginBottom: 14,
  },
  quickChip: {
    flex: 1,
    paddingVertical: 7,
    backgroundColor: '#121A42',
    borderRadius: radii.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  quickChipActive: {
    borderColor: colors.accent,
    backgroundColor: 'rgba(242, 163, 58, 0.12)',
  },
  quickText: {
    color: '#A9B0D0',
    fontSize: 13,
    fontWeight: '700',
  },
  quickTextActive: {
    color: colors.accent,
  },
  aiInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  aiInput: {
    flex: 1,
    backgroundColor: '#121A42',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'rgba(243, 245, 249, 0.14)',
    color: '#F3F5F9',
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  aiBtn: {
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiOptionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  aiOptCard: {
    flex: 1,
    backgroundColor: '#121A42',
    borderRadius: radii.md,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  aiOptCardActive: {
    borderColor: colors.accent,
    backgroundColor: 'rgba(242, 163, 58, 0.12)',
  },
  aiOptText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#F3F5F9',
    marginTop: 4,
  },
  clearCrestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    marginTop: 12,
  },
  clearCrestText: {
    color: '#E8543F',
    fontSize: 12,
    fontWeight: '600',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  switchTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F3F5F9',
  },
  switchSub: {
    fontSize: 11,
    color: '#8D95BD',
    marginTop: 2,
  },
  switchTrack: {
    width: 46,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#1B2560',
    padding: 2,
    justifyContent: 'center',
  },
  switchTrackActive: {
    backgroundColor: colors.teal,
  },
  switchThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#F3F5F9',
  },
  switchThumbActive: {
    alignSelf: 'flex-end',
  },
  matchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(242, 163, 58, 0.1)',
    borderRadius: radii.md,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  matchBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.accent,
  },
  patchesGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  patchCard: {
    flex: 1,
    backgroundColor: '#121A42',
    borderRadius: radii.md,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  patchCardActive: {
    borderColor: colors.accent,
    backgroundColor: 'rgba(242, 163, 58, 0.1)',
  },
  patchTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F3F5F9',
    marginTop: 6,
  },
  patchTitleActive: {
    color: colors.accent,
  },
  patchWhere: {
    fontSize: 10,
    color: '#8D95BD',
    marginTop: 2,
  },
  printsList: {
    gap: 8,
  },
  printItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#121A42',
    borderRadius: radii.md,
    padding: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  printItemActive: {
    borderColor: colors.accent,
    backgroundColor: 'rgba(242, 163, 58, 0.1)',
  },
  printTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F3F5F9',
  },
  printTitleActive: {
    color: colors.accent,
  },
  printSub: {
    fontSize: 11,
    color: '#8D95BD',
    marginTop: 2,
  },
  printPrice: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.accent,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(243, 245, 249, 0.1)',
  },
  totalLabel: {
    fontSize: 11,
    color: '#8D95BD',
  },
  totalPrice: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.accent,
  },
  proceedBtn: {
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    paddingVertical: 12,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  proceedText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#080C24',
  },
});
