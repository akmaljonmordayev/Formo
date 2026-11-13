import React, { forwardRef, useImperativeHandle, useMemo, useRef } from 'react';
import { View } from 'react-native';

let WebView = null;
try {
  ({ WebView } = require('react-native-webview')); // eslint-disable-line global-require
} catch {
  WebView = null;
}

// Leaflet + OpenStreetMap kartasi (API kalit kerak emas); ilova uslubiga mos qorong'i filtr bilan
const LEAFLET = 'https://unpkg.com/leaflet@1.9.4/dist';
const TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

const zoomFor = (region) => Math.max(3, Math.min(18, Math.log2(360 / (region.longitudeDelta || 0.08))));

// Xarita foni: qorong'i mavzuda plitkalar teskari ranglanadi, yorug'da — OSM'ning o'z ranglari
const BG = { dark: '#0b0f2a', light: '#e8ecf4' };

function html(region, dark) {
  const bg = dark ? BG.dark : BG.light;
  const tileFilter = dark ? '.leaflet-tile-pane{filter:invert(1) hue-rotate(200deg) brightness(.95) contrast(.9) saturate(.6)}' : '';
  const attribution = dark
    ? '.leaflet-control-attribution{font-size:9px;background:rgba(5,8,24,.6)!important;color:#8d95bd}.leaflet-control-attribution a{color:#8d95bd}'
    : '.leaflet-control-attribution{font-size:9px}';
  return `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<link rel="stylesheet" href="${LEAFLET}/leaflet.css">
<style>html,body,#map{margin:0;width:100%;height:100%;background:${bg}}
${tileFilter}
${attribution}</style>
</head><body><div id="map"></div>
<script src="${LEAFLET}/leaflet.js"></script>
<script>
(function(){
  var send=function(m){window.ReactNativeWebView&&window.ReactNativeWebView.postMessage(JSON.stringify(m));};
  if(!window.L){send({type:'error'});return;}
  var map=L.map('map',{zoomControl:false,attributionControl:true})
    .setView([${region.latitude},${region.longitude}],${zoomFor(region).toFixed(2)});
  L.tileLayer('${TILES}',{maxZoom:19,attribution:'&copy; OpenStreetMap'}).addTo(map);
  var gesture=false;
  map.on('dragstart',function(){gesture=true;send({type:'drag'});});
  map.getContainer().addEventListener('touchstart',function(e){if(e.touches.length>1)gesture=true;},{passive:true});
  map.on('click',function(e){send({type:'press',latitude:e.latlng.lat,longitude:e.latlng.lng});});
  map.on('moveend',function(){
    var c=map.getCenter(),b=map.getBounds();
    send({type:'region',latitude:c.lat,longitude:c.lng,latitudeDelta:b.getNorth()-b.getSouth(),longitudeDelta:b.getEast()-b.getWest(),isGesture:gesture});
    gesture=false;
  });
  window.formoFly=function(lat,lng,zoom,ms){gesture=false;map.flyTo([lat,lng],zoom,{duration:(ms||450)/1000});};
  send({type:'ready'});
})();
</script></body></html>`;
}

/**
 * Android uchun xarita: react-native-maps Android'da Google Maps kalitini talab qiladi va kalitsiz release
 * build manzil ekranida crash qiladi. Bu komponent WebView ichida Leaflet (OpenStreetMap) bilan ishlaydi.
 * MapView'ning manzil tanlash ekrani ishlatadigan qismi bilan mos: initialRegion, onPress, onPanDrag,
 * onRegionChangeComplete(region, { isGesture }) va ref.animateToRegion(region, ms).
 * `dark` — xarita ranglari (birinchi chizishda; standart — qorong'i).
 */
const LeafletMap = forwardRef(function LeafletMap(
  { initialRegion, onPress, onPanDrag, onRegionChangeComplete, style, dark = true },
  ref,
) {
  const webRef = useRef(null);
  // Faqat birinchi chizishdagi markaz — keyin xarita o'zi boshqaradi
  const source = useMemo(() => ({ html: html(initialRegion, dark) }), []); // eslint-disable-line react-hooks/exhaustive-deps
  const background = { backgroundColor: dark ? BG.dark : BG.light };

  useImperativeHandle(ref, () => ({
    animateToRegion(region, ms = 450) {
      const { latitude, longitude } = region;
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;
      webRef.current?.injectJavaScript(
        `window.formoFly&&window.formoFly(${latitude},${longitude},${zoomFor(region).toFixed(2)},${Number(ms) || 450});true;`,
      );
    },
  }));

  const onMessage = (event) => {
    let msg;
    try {
      msg = JSON.parse(event.nativeEvent.data);
    } catch {
      return;
    }
    if (msg.type === 'press') onPress?.({ nativeEvent: { coordinate: { latitude: msg.latitude, longitude: msg.longitude } } });
    else if (msg.type === 'drag') onPanDrag?.();
    else if (msg.type === 'region') {
      const { latitude, longitude, latitudeDelta, longitudeDelta, isGesture } = msg;
      onRegionChangeComplete?.({ latitude, longitude, latitudeDelta, longitudeDelta }, { isGesture: Boolean(isGesture) });
    }
  };

  if (!WebView) return <View style={[background, style]} />;

  return (
    <WebView
      ref={webRef}
      style={[background, style]}
      source={source}
      originWhitelist={['*']}
      // Faqat shu ichki sahifa — havolalar (OSM atributsiyasi) ilova ichida ochilmaydi
      onShouldStartLoadWithRequest={(req) => req.url.startsWith('about:') || req.url.startsWith('data:')}
      setSupportMultipleWindows={false}
      javaScriptEnabled
      domStorageEnabled
      scrollEnabled={false}
      bounces={false}
      overScrollMode="never"
      onMessage={onMessage}
    />
  );
});

export default LeafletMap;
