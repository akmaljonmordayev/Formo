import React, { useId } from 'react';
import Svg, { ClipPath, Defs, G, LinearGradient, Path, Rect, Stop, Text as SvgText } from 'react-native-svg';
import { fonts } from '../../constants/theme';

/**
 * 2D futbol formasi — "Formo Prototip" dizaynidagi `Shirt` / `Shorts`
 * komponentlarining react-native-svg ko'chirmasi (o'sha viewBox va yo'llar).
 * Faqat chizadi: ekran joylashuvi va API mantiqidan mustaqil.
 *
 * Shirt props:
 *   color, ink (yozuv), trim (yoqa/manjet/naqsh), grad: [from, to] | null, gradAngle
 *   side: 'front' | 'back', player (orqada ism), number, crest (oldinda gerb matni)
 *   pattern: 'none' | 'stripes' | 'sash' | 'hoops', patches: ['cap' | 'flag' | 'star']
 *   textStyle: { fontWeight, fontStyle, letterSpacing } (studiya shrifti), width
 *   glow: true — neon yozuv (rangli porlash + oq o'zak)
 */
const BODY = 'M62 12 L84 4 Q100 16 116 4 L138 12 L192 42 L174 84 L152 74 L152 202 Q100 208 48 202 L48 74 L26 84 L8 42 Z';
const STAR = 'l1.6 3.4 3.7.4-2.8 2.5.8 3.7-3.3-1.9-3.3 1.9.8-3.7-2.8-2.5 3.7-.4z';

// useId ":r1:" ko'rinishida — SVG url(#...) uchun xavfsiz belgilarga keltiramiz
const useSvgId = (prefix) => prefix + useId().replace(/[^a-zA-Z0-9]/g, '');

function textProps(textStyle, family) {
  const plain = textStyle?.fontWeight === '600';
  return {
    fontFamily: plain ? fonts.bodySemi : family,
    fontStyle: textStyle?.fontStyle === 'italic' ? 'italic' : undefined,
    letterSpacing: textStyle?.letterSpacing,
  };
}

/**
 * Yozuv: oddiy yoki neon. Neon — ink rangidagi ikki yumshoq "porlash" qatlami (keng shaffof chiziq)
 * va ustida oq o'zak; SVG filtrlarisiz, shuning uchun telefonlarda arzon chiziladi.
 */
function Ink({ glow, color, fontSize, children, ...props }) {
  if (!glow) {
    return (
      <SvgText fontSize={fontSize} fill={color} {...props}>
        {children}
      </SvgText>
    );
  }
  return (
    <G>
      <SvgText fontSize={fontSize} {...props} fill={color} fillOpacity={0.25} stroke={color} strokeOpacity={0.22} strokeWidth={fontSize * 0.24} strokeLinejoin="round">
        {children}
      </SvgText>
      <SvgText fontSize={fontSize} {...props} fill={color} stroke={color} strokeOpacity={0.5} strokeWidth={fontSize * 0.1} strokeLinejoin="round">
        {children}
      </SvgText>
      <SvgText fontSize={fontSize} {...props} fill="#FFFFFF" stroke={color} strokeWidth={Math.max(0.6, fontSize * 0.02)}>
        {children}
      </SvgText>
    </G>
  );
}

function Pattern({ pattern, trim }) {
  if (pattern === 'stripes') {
    return [56, 88, 120].map((x) => <Rect key={`st${x}`} x={x} y={0} width={16} height={210} fill={trim} opacity={0.9} />);
  }
  if (pattern === 'sash') return <Path d="M20 30 L60 0 L200 170 L200 210 L170 210 Z" fill={trim} opacity={0.9} />;
  if (pattern === 'hoops') {
    return [100, 150].map((y) => <Rect key={`ho${y}`} x={0} y={y} width={200} height={22} fill={trim} opacity={0.9} />);
  }
  return null;
}

export function Shirt({
  color = '#0E1A3F',
  ink = '#F3F5F9',
  trim,
  grad,
  gradAngle = 135,
  side = 'back',
  player = '',
  number = '',
  crest = '',
  pattern = 'none',
  patches = [],
  textStyle,
  glow = false,
  width = 200,
}) {
  const id = useSvgId('shirt');
  const front = side === 'front';
  const trimColor = trim || ink;
  const gradient = Array.isArray(grad) && grad.length > 1 ? grad : null;
  const name = String(player || '').trim();
  const num = String(number || '').trim();
  const tp = textProps(textStyle, fonts.numeric);

  return (
    <Svg width={width} height={(width * 210) / 200} viewBox="0 0 200 210">
      <Defs>
        <LinearGradient id={`${id}g`} x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#000" stopOpacity={0.22} />
          <Stop offset="0.25" stopColor="#000" stopOpacity={0} />
          <Stop offset="0.75" stopColor="#000" stopOpacity={0} />
          <Stop offset="1" stopColor="#000" stopOpacity={0.22} />
        </LinearGradient>
        {gradient && (
          <LinearGradient id={`${id}f`} x1="0" y1="0" x2="1" y2="0" gradientTransform={`rotate(${gradAngle - 90} 0.5 0.5)`}>
            {gradient.map((stop, i) => (
              <Stop key={`${stop}${i}`} offset={i / (gradient.length - 1)} stopColor={stop} />
            ))}
          </LinearGradient>
        )}
        <ClipPath id={`${id}c`}>
          <Path d={BODY} />
        </ClipPath>
      </Defs>

      {/* Yerdagi soya — kartada "suzib" turishi uchun */}
      <Path d="M48 204 Q100 214 152 204" stroke="rgba(0,0,0,0.35)" strokeWidth={6} strokeLinecap="round" fill="none" />

      <Path d={BODY} fill={gradient ? `url(#${id}f)` : color} />
      <G clipPath={`url(#${id}c)`}>
        <Pattern pattern={pattern} trim={trimColor} />
        {/* Yeng manjetlari */}
        <Path d="M26 84 L8 42 L14 38 L32 80 Z" fill={trimColor} />
        <Path d="M174 84 L192 42 L186 38 L168 80 Z" fill={trimColor} />
        {/* Yon soyalar (hajm) */}
        <Rect x={0} y={0} width={200} height={210} fill={`url(#${id}g)`} />
      </G>
      <Path d={BODY} fill="none" stroke="rgba(243,245,249,0.38)" strokeWidth={2} />
      {/* Yoqa: oldida V-chuqurroq, orqada sayoz */}
      <Path
        d={front ? 'M84 4 Q100 26 116 4' : 'M84 4 Q100 14 116 4'}
        fill="none"
        stroke={trimColor}
        strokeWidth={5}
        strokeLinecap="round"
      />

      {front ? (
        <G>
          {Boolean(num) && (
            <Ink glow={glow} color={ink} x={126} y={64} textAnchor="middle" fontSize={24} {...tp}>
              {num}
            </Ink>
          )}
          {Boolean(crest) && (
            <G>
              <Path d="M66 46 L86 46 L86 62 Q76 72 66 62 Z" fill={trimColor} stroke={ink} strokeWidth={1} />
              <SvgText x={76} y={59} textAnchor="middle" fontSize={9} fill={color} fontFamily={fonts.numeric}>
                {String(crest).slice(0, 3).toUpperCase()}
              </SvgText>
            </G>
          )}
          {patches.includes('cap') && (
            <G transform="rotate(-62 178 60)">
              <Rect x={162} y={53} width={32} height={14} rx={2} fill="#F2A33A" stroke="#080C24" strokeWidth={1} />
              <SvgText x={178} y={64} textAnchor="middle" fontSize={12} fill="#080C24" fontFamily={fonts.numeric}>C</SvgText>
            </G>
          )}
          {patches.includes('flag') && (
            <G transform="rotate(62 22 60)">
              <Rect x={9} y={53} width={26} height={5} fill="#19A7A1" />
              <Rect x={9} y={58} width={26} height={1} fill="#B8323F" />
              <Rect x={9} y={59} width={26} height={4} fill="#F3F5F9" />
              <Rect x={9} y={63} width={26} height={1} fill="#B8323F" />
              <Rect x={9} y={64} width={26} height={5} fill="#4CAF6A" />
              <Rect x={9} y={53} width={26} height={16} fill="none" stroke="#080C24" strokeWidth={0.8} />
            </G>
          )}
          {patches.includes('star') &&
            [68, 76, 84].map((x) => (
              <Path key={`star${x}`} d={`M${x} 36 ${STAR}`} fill="#F2A33A" stroke="#080C24" strokeWidth={0.5} />
            ))}
        </G>
      ) : (
        <G>
          {Boolean(name) && (
            <Ink
              glow={glow}
              color={ink}
              x={100}
              y={66}
              textAnchor="middle"
              fontSize={name.length > 9 ? 16 : 22}
              {...textProps(textStyle, fonts.numericBold)}
              letterSpacing={textStyle?.letterSpacing ?? 2}
            >
              {name.toUpperCase()}
            </Ink>
          )}
          {Boolean(num) && (
            <Ink glow={glow} color={ink} x={100} y={158} textAnchor="middle" fontSize={90} {...tp}>
              {num}
            </Ink>
          )}
        </G>
      )}
    </Svg>
  );
}

/** Dizayndagi `Shorts`: chap pochada raqam. */
export function Shorts({ color = '#F3F5F9', trim = '#1D2F8C', ink, number = '', glow = false, textStyle, width = 160 }) {
  const id = useSvgId('shorts');
  const body = 'M22 6 L138 6 L150 104 Q124 112 94 108 L80 46 L66 108 Q36 112 10 104 Z';
  const num = String(number || '').trim();
  return (
    <Svg width={width} height={(width * 116) / 160} viewBox="0 0 160 116">
      <Defs>
        <ClipPath id={`${id}c`}>
          <Path d={body} />
        </ClipPath>
      </Defs>
      <Path d={body} fill={color} />
      <G clipPath={`url(#${id}c)`}>
        <Rect x={0} y={0} width={160} height={15} fill={trim} />
        <Path d="M22 6 L10 104 L18 106 L29 6 Z" fill={trim} />
        <Path d="M138 6 L150 104 L142 106 L131 6 Z" fill={trim} />
        <Rect x={0} y={0} width={160} height={116} fill="rgba(0,0,0,0.12)" opacity={0.6} />
      </G>
      <Path d={body} fill="none" stroke="rgba(243,245,249,0.38)" strokeWidth={2} />
      <Path d="M80 15 L80 46" stroke="rgba(0,0,0,0.25)" strokeWidth={1.5} />
      {Boolean(num) && (
        <Ink glow={glow} color={ink || trim} x={42} y={92} textAnchor="middle" fontSize={28} {...textProps(textStyle, fonts.numeric)}>
          {num}
        </Ink>
      )}
    </Svg>
  );
}

/** Studiya yamog'i (features/studio PATCHES.sym) -> dizayndagi yamoq turi. */
export function patchKind(sym) {
  return { C: 'cap', UZ: 'flag', '★': 'star' }[sym] || null;
}
