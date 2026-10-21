import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, {
  Path,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
  ClipPath,
  G,
  Rect,
  Circle,
  Text as SvgText,
} from 'react-native-svg';

/**
 * JerseyVisualizer — SVG football kit visualizer matching the Formo reference design.
 * Renders high-fidelity shirts and shorts with patterns, collars, cuffs, gradients,
 * captain badge, country flag, championship stars, custom typography and numbers.
 */

const SHIRT_BODY =
  'M62 12 L84 4 Q100 16 116 4 L138 12 L192 42 L174 84 L152 74 L152 202 Q100 208 48 202 L48 74 L26 84 L8 42 Z';

const SHIRT_TANK =
  'M68 8 L84 4 Q100 18 116 4 L132 8 Q134 52 158 72 L158 202 Q100 208 42 202 L42 72 Q66 52 68 8 Z';

const SHORTS_BODY =
  'M22 6 L138 6 L150 104 Q124 112 94 108 L80 46 L66 108 Q36 112 10 104 Z';

export default function JerseyVisualizer({
  color = '#0E1A3F',
  trim = '#F3F5F9',
  ink = '#F3F5F9',
  pattern = 'none',
  grad = '',
  gradAngle = 135,
  player = 'AZIZ',
  number = '10',
  motto = '',
  mottoSize = 24,
  outline = false,
  crest = '',
  patches = [],
  sleeve = 'short',
  side = 'front',
  size = 200,
  showShorts = false,
  shorts = null,
  style,
}) {
  const uid = React.useId ? React.useId().replace(/:/g, '') : `k${Math.random().toString(36).slice(2, 7)}`;
  const isFront = side === 'front';
  const isTank = sleeve === 'none';
  const bodyPath = isTank ? SHIRT_TANK : SHIRT_BODY;

  const gradColors = grad ? String(grad).split(',').map((c) => c.trim()).filter(Boolean) : null;
  const hasGrad = Boolean(gradColors && gradColors.length > 1);

  // Gradient coordinates from angle
  const rad = ((gradAngle - 90) * Math.PI) / 180;
  const x1 = Math.max(0, Math.min(1, 0.5 - Math.cos(rad) * 0.5));
  const y1 = Math.max(0, Math.min(1, 0.5 - Math.sin(rad) * 0.5));
  const x2 = Math.max(0, Math.min(1, 0.5 + Math.cos(rad) * 0.5));
  const y2 = Math.max(0, Math.min(1, 0.5 + Math.sin(rad) * 0.5));

  const fillColor = hasGrad ? `url(#${uid}-grad)` : color;

  // Pattern overlays
  const renderPattern = () => {
    if (pattern === 'stripes') {
      return [56, 88, 120].map((x, i) => (
        <Rect key={`st-${i}`} x={x} y={0} width={16} height={210} fill={trim} opacity={0.88} />
      ));
    }
    if (pattern === 'sash') {
      return (
        <Path
          key="sash"
          d="M20 30 L60 0 L200 170 L200 210 L170 210 Z"
          fill={trim}
          opacity={0.88}
        />
      );
    }
    if (pattern === 'hoops') {
      return [100, 150].map((y, i) => (
        <Rect key={`ho-${i}`} x={0} y={y} width={200} height={22} fill={trim} opacity={0.88} />
      ));
    }
    return null;
  };

  // Patches
  const patchList = Array.isArray(patches) ? patches : String(patches || '').split(',').filter(Boolean);

  const renderPatches = () => {
    if (!isFront) return null;
    return (
      <G key="patches">
        {patchList.includes('cap') && !isTank && (
          <G transform="rotate(-62, 178, 60)">
            <Rect x={162} y={53} width={32} height={14} rx={2} fill="#F2A33A" stroke="#080C24" strokeWidth={1} />
            <SvgText x={178} y={64} textAnchor="middle" fontWeight="800" fontSize={11} fill="#080C24">
              C
            </SvgText>
          </G>
        )}
        {patchList.includes('flag') && !isTank && (
          <G transform="rotate(62, 22, 60)">
            <Rect x={9} y={53} width={26} height={5} fill="#19A7A1" />
            <Rect x={9} y={58} width={26} height={1} fill="#B8323F" />
            <Rect x={9} y={59} width={26} height={4} fill="#F3F5F9" />
            <Rect x={9} y={63} width={26} height={1} fill="#B8323F" />
            <Rect x={9} y={64} width={26} height={5} fill="#4CAF6A" />
            <Rect x={9} y={53} width={26} height={16} fill="none" stroke="#080C24" strokeWidth={0.8} />
          </G>
        )}
        {patchList.includes('star') && (
          <G>
            {[68, 76, 84].map((x, i) => (
              <Path
                key={`star-${i}`}
                d={`M${x} 36 l1.6 3.4 3.7.4-2.8 2.5.8 3.7-3.3-1.9-3.3 1.9.8-3.7-2.8-2.5 3.7-.4z`}
                fill="#F2A33A"
                stroke="#080C24"
                strokeWidth={0.5}
              />
            ))}
          </G>
        )}
        {patchList.includes('cup') && (
          <G>
            <Circle cx={100} cy={172} r={13} fill="#F2A33A" stroke="#080C24" strokeWidth={1.2} />
            <Circle cx={100} cy={172} r={10} fill="none" stroke="#080C24" strokeWidth={0.6} strokeDasharray="1.5 1.5" />
            <Path d="M94 165 h12 v3 a6 6 0 0 1 -12 0 z M99 174 h2 v3 h3 v2 h-8 v-2 h3 z" fill="#080C24" />
          </G>
        )}
      </G>
    );
  };

  // Shorts details
  const soColor = shorts?.color || color;
  const soTrim = shorts?.trim || trim;
  const soInk = shorts?.ink || ink;
  const soNum = shorts?.number ?? (showShorts ? number : '');

  const shirtHeight = Math.round((size * 210) / 200);
  const shortsHeight = Math.round((size * 116) / 200 * 0.72);
  const shortsWidth = Math.round((size * 160) / 200 * 0.72);

  return (
    <View style={[styles.wrapper, { width: size }, style]}>
      {/* SHIRT */}
      <Svg viewBox="0 0 200 210" width={size} height={shirtHeight} style={styles.svg}>
        <Defs>
          <ClipPath id={`${uid}-clip`}>
            <Path d={bodyPath} />
          </ClipPath>

          <SvgLinearGradient id={`${uid}-shade`} x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#000000" stopOpacity={0.22} />
            <Stop offset="0.25" stopColor="#000000" stopOpacity={0} />
            <Stop offset="0.75" stopColor="#000000" stopOpacity={0} />
            <Stop offset="1" stopColor="#000000" stopOpacity={0.22} />
          </SvgLinearGradient>

          {hasGrad && (
            <SvgLinearGradient id={`${uid}-grad`} x1={x1} y1={y1} x2={x2} y2={y2}>
              {gradColors.map((col, i) => (
                <Stop
                  key={`stop-${i}`}
                  offset={gradColors.length > 1 ? i / (gradColors.length - 1) : 0}
                  stopColor={col}
                />
              ))}
            </SvgLinearGradient>
          )}
        </Defs>

        {/* Base fill */}
        <Path d={bodyPath} fill={fillColor} />

        {/* Pattern & shading inside clip */}
        <G clipPath={`url(#${uid}-clip)`}>
          {renderPattern()}

          {/* Sleeve Cuffs */}
          {!isTank && (
            <G>
              <Path d="M26 84 L8 42 L14 38 L32 80 Z" fill={trim} />
              <Path d="M174 84 L192 42 L186 38 L168 80 Z" fill={trim} />
            </G>
          )}

          {/* Shading */}
          <Rect x={0} y={0} width={200} height={210} fill={`url(#${uid}-shade)`} />
        </G>

        {/* Outer border & collar */}
        <Path d={bodyPath} fill="none" stroke="rgba(243,245,249,0.36)" strokeWidth={1.8} />

        {/* Collar neckline */}
        <Path
          d={isFront ? 'M84 4 Q100 26 116 4' : 'M84 4 Q100 14 116 4'}
          fill="none"
          stroke={trim}
          strokeWidth={5}
          strokeLinecap="round"
        />

        {/* FRONT DETAILS */}
        {isFront && (
          <G>
            {/* Front small number on chest */}
            {Boolean(number) && (
              <SvgText
                x={126}
                y={64}
                textAnchor="middle"
                fontWeight="800"
                fontSize={24}
                fill={ink}
              >
                {number}
              </SvgText>
            )}

            {/* Crest badge on chest */}
            {Boolean(crest) && (
              <G>
                <Path d="M66 46 L86 46 L86 62 Q76 72 66 62 Z" fill={trim} stroke={ink} strokeWidth={1} />
                <SvgText
                  x={76}
                  y={59}
                  textAnchor="middle"
                  fontWeight="800"
                  fontSize={9}
                  fill={color === '#F3F5F9' ? '#080C24' : color}
                >
                  {crest.slice(0, 3)}
                </SvgText>
              </G>
            )}

            {/* Patches */}
            {renderPatches()}

            {/* Front motto text */}
            {Boolean(motto) && (
              <SvgText
                x={100}
                y={128}
                textAnchor="middle"
                fontWeight="700"
                fontSize={mottoSize || 24}
                fill={ink}
                stroke={outline ? '#080C24' : undefined}
                strokeWidth={outline ? 1.2 : undefined}
              >
                {motto}
              </SvgText>
            )}
          </G>
        )}

        {/* BACK DETAILS */}
        {!isFront && (
          <G>
            {/* Player name */}
            {Boolean(player) && (
              <SvgText
                x={100}
                y={66}
                textAnchor="middle"
                fontWeight="800"
                fontSize={22}
                fill={ink}
                letterSpacing={2}
              >
                {String(player).toUpperCase()}
              </SvgText>
            )}

            {/* Large number */}
            {Boolean(number) && (
              <SvgText
                x={100}
                y={158}
                textAnchor="middle"
                fontWeight="900"
                fontSize={90}
                fill={ink}
              >
                {number}
              </SvgText>
            )}
          </G>
        )}
      </Svg>

      {/* OPTIONAL SHORTS */}
      {showShorts && (
        <View style={[styles.shortsContainer, { width: shortsWidth, marginTop: -Math.round(size * 0.08) }]}>
          <Svg viewBox="0 0 160 116" width={shortsWidth} height={shortsHeight} style={styles.svg}>
            <Defs>
              <ClipPath id={`${uid}-shclip`}>
                <Path d={SHORTS_BODY} />
              </ClipPath>
            </Defs>

            {/* Base fill */}
            <Path d={SHORTS_BODY} fill={soColor} />

            {/* Trims inside clip */}
            <G clipPath={`url(#${uid}-shclip)`}>
              {/* Waistband */}
              <Rect x={0} y={0} width={160} height={14} fill={soTrim} />
              {/* Side stripes */}
              <Path d="M22 6 L10 104 L18 106 L29 6 Z" fill={soTrim} />
              <Path d="M138 6 L150 104 L142 106 L131 6 Z" fill={soTrim} />
              {/* Shading */}
              <Rect x={0} y={0} width={160} height={116} fill="rgba(0,0,0,0.12)" opacity={0.6} />
            </G>

            {/* Outer border & crotch seam */}
            <Path d={SHORTS_BODY} fill="none" stroke="rgba(243,245,249,0.36)" strokeWidth={1.8} />
            <Path d="M80 14 L80 46" stroke="rgba(0,0,0,0.25)" strokeWidth={1.5} />

            {/* Shorts number */}
            {Boolean(soNum) && (
              <SvgText x={42} y={92} textAnchor="middle" fontWeight="800" fontSize={26} fill={soInk}>
                {soNum}
              </SvgText>
            )}
          </Svg>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  svg: {
    overflow: 'visible',
  },
  shortsContainer: {
    alignItems: 'center',
  },
});
