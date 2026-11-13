import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import { View } from 'react-native';

const LEAFLET = 'https://unpkg.com/leaflet@1.9.4/dist';
const zoomFor = (region) => Math.max(3, Math.min(18, Math.log2(360 / (region.longitudeDelta || 0.08))));

/**
 * Veb uchun xarita (ilova faqat Android/iOS'da chiqadi — bu `expo start --web` da ekranlarni ko'rish uchun):
 * react-native-maps vebda ishlamaydi, shuning uchun Leaflet iframe ichida. Interfeysi native xarita bilan bir xil:
 * initialRegion, onPress, onPanDrag, onRegionChangeComplete(region, { isGesture }), ref.animateToRegion.
 */
const PlatformMap = forwardRef(function PlatformMap({ initialRegion, onPress, onPanDrag, onRegionChangeComplete, style, dark = true }, ref) {
  const frame = useRef(null);
  const handlers = useRef({});
  handlers.current = { onPress, onPanDrag, onRegionChangeComplete };

  const srcDoc = useMemo(
    () => `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="${LEAFLET}/leaflet.css">
<style>html,body,#map{margin:0;width:100%;height:100%;background:${dark ? '#0b0f2a' : '#e8ecf4'}}
${dark ? '.leaflet-tile-pane{filter:invert(1) hue-rotate(200deg) brightness(.95) contrast(.9) saturate(.6)}' : ''}</style></head>
<body><div id="map"></div><script src="${LEAFLET}/leaflet.js"></script><script>
var send=function(m){parent.postMessage(Object.assign({source:'formo-map'},m),'*');};
var map=L.map('map',{zoomControl:false}).setView([${initialRegion.latitude},${initialRegion.longitude}],${zoomFor(initialRegion).toFixed(2)});
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap'}).addTo(map);
var gesture=false;
map.on('dragstart',function(){gesture=true;send({type:'drag'});});
map.on('click',function(e){send({type:'press',latitude:e.latlng.lat,longitude:e.latlng.lng});});
map.on('moveend',function(){var c=map.getCenter();send({type:'region',latitude:c.lat,longitude:c.lng,isGesture:gesture});gesture=false;});
window.addEventListener('message',function(e){var d=e.data||{};if(d.type==='fly'){gesture=false;map.flyTo([d.latitude,d.longitude],d.zoom,{duration:.45});}});
</script></body></html>`,
    // Faqat birinchi chizishda — keyin xarita o'zi boshqaradi
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useEffect(() => {
    const onMessage = (event) => {
      const msg = event.data;
      if (!msg || msg.source !== 'formo-map' || event.source !== frame.current?.contentWindow) return;
      const h = handlers.current;
      if (msg.type === 'press') h.onPress?.({ nativeEvent: { coordinate: { latitude: msg.latitude, longitude: msg.longitude } } });
      else if (msg.type === 'drag') h.onPanDrag?.();
      else if (msg.type === 'region') {
        h.onRegionChangeComplete?.({ latitude: msg.latitude, longitude: msg.longitude }, { isGesture: Boolean(msg.isGesture) });
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  useImperativeHandle(ref, () => ({
    animateToRegion(region) {
      frame.current?.contentWindow?.postMessage({ type: 'fly', latitude: region.latitude, longitude: region.longitude, zoom: zoomFor(region) }, '*');
    },
  }));

  return (
    <View style={style}>
      <iframe ref={frame} title="map" srcDoc={srcDoc} style={{ border: 0, width: '100%', height: '100%' }} />
    </View>
  );
});

export default PlatformMap;
