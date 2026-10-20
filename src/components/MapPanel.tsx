import { createElement, useEffect, useMemo, useRef } from 'react';
import { Platform, StyleSheet, View, useColorScheme } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { radius, useTheme } from '../theme';
import type { Coords } from '../types';

export type MapPoint = {
  id: string;
  lat: number;
  lng: number;
  label: string;
  kind: 'pharmacy' | 'hospital' | 'emergency';
};

type Props = {
  points: MapPoint[];
  user: Coords | null;
  selectedId?: string;
  onSelect: (id: string) => void;
  height?: number;
};

/**
 * Ücretsiz ve anahtarsız harita: Leaflet + CARTO altlığı, bir WebView içinde.
 * Google Haritalar API anahtarı (ve faturalandırma hesabı) gerektirmez. Altlık, uygulamanın
 * sıcak renklerine uysun diye hafif sepya filtreyle ısıtılır.
 */
export function MapPanel({ points, user, selectedId, onSelect, height = 420 }: Props) {
  const t = useTheme();
  const dark = useColorScheme() === 'dark';
  const html = useMemo(() => buildHtml(dark, t), [dark, t]);
  const webRef = useRef<WebView>(null);
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const readyRef = useRef(false);
  const payload = JSON.stringify({ points, user, selectedId: selectedId ?? null });
  const payloadRef = useRef(payload);
  payloadRef.current = payload;

  const push = () => {
    if (!readyRef.current) return;
    const js = `window.setData(${payloadRef.current}); true;`;
    if (Platform.OS === 'web') (frameRef.current?.contentWindow as unknown as { eval?: (s: string) => void })?.eval?.(js);
    else webRef.current?.injectJavaScript(js);
  };

  useEffect(push, [payload]);

  const onMessage = (raw: string) => {
    try {
      const m = JSON.parse(raw) as { type: string; id?: string };
      if (m.type === 'ready') {
        readyRef.current = true;
        push();
      } else if (m.type === 'select' && m.id) onSelect(m.id);
    } catch {}
  };

  // Web (yalnızca önizleme/ekran görüntüsü için) iframe ile aynı sayfayı kullanır.
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const h = (e: MessageEvent) => typeof e.data === 'string' && e.source === frameRef.current?.contentWindow && onMessage(e.data);
    window.addEventListener('message', h);
    return () => window.removeEventListener('message', h);
  });

  return (
    <View style={[styles.wrap, { height, borderColor: t.border, backgroundColor: t.bgAccent }]}>
      {Platform.OS === 'web' ? (
        createElement('iframe', {
          ref: frameRef,
          srcDoc: html,
          style: { border: 0, width: '100%', height: '100%' },
          title: 'Harita',
        })
      ) : (
        <WebView
          ref={webRef}
          originWhitelist={['*']}
          source={{ html }}
          onMessage={(e: WebViewMessageEvent) => onMessage(e.nativeEvent.data)}
          style={{ backgroundColor: t.bgAccent }}
          setSupportMultipleWindows={false}
          nestedScrollEnabled
        />
      )}
    </View>
  );
}

function buildHtml(dark: boolean, t: ReturnType<typeof useTheme>) {
  const tiles = dark
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
  const filter = dark ? 'sepia(0.35) brightness(0.95)' : 'sepia(0.28) saturate(1.1) hue-rotate(-8deg)';
  return `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css">
<style>
html,body,#map{margin:0;height:100%;background:${t.bgAccent};font-family:-apple-system,Roboto,sans-serif}
.leaflet-tile-pane{filter:${filter}}
.pin{width:30px;height:30px;border-radius:50% 50% 50% 4px;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;box-shadow:0 3px 8px rgba(80,50,30,.3);border:2px solid #fff;transition:transform .2s}
.pin span{transform:rotate(45deg);color:#fff;font-weight:800;font-size:15px;line-height:1}
.pin.sel{transform:rotate(-45deg) scale(1.3)}
.me{width:16px;height:16px;border-radius:50%;background:#3E8EDE;border:3px solid #fff;box-shadow:0 0 0 6px rgba(62,142,222,.25)}
.leaflet-control-attribution{font-size:9px;background:rgba(255,255,255,.7)!important}
.leaflet-popup-content{font-weight:600;color:${t.text};margin:10px 12px}
</style></head><body><div id="map"></div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"></script>
<script>
var send=function(m){m=JSON.stringify(m);if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(m);else parent.postMessage(m,'*')};
var colors={pharmacy:'${t.primary}',hospital:'#B07A5A',emergency:'${t.danger}'};
var glyph={pharmacy:'+',hospital:'H',emergency:'+'};
var map=L.map('map',{zoomControl:false,attributionControl:true}).setView([39,35],6);
L.tileLayer('${tiles}',{maxZoom:19,subdomains:'abcd',attribution:'© OpenStreetMap © CARTO'}).addTo(map);
var layer=L.layerGroup().addTo(map),fitted=false,lastIds='';
window.setData=function(d){
  layer.clearLayers();var b=[];
  d.points.forEach(function(p){
    var sel=p.id===d.selectedId;
    var icon=L.divIcon({className:'',iconSize:[30,30],iconAnchor:[15,30],
      html:'<div class="pin'+(sel?' sel':'')+'" style="background:'+colors[p.kind]+'"><span>'+glyph[p.kind]+'</span></div>'});
    var m=L.marker([p.lat,p.lng],{icon:icon,zIndexOffset:sel?1000:0}).addTo(layer);
    m.on('click',function(){send({type:'select',id:p.id})});
    if(sel)m.bindTooltip(p.label,{direction:'top',offset:[0,-30],permanent:true});
    b.push([p.lat,p.lng]);
  });
  if(d.user){L.marker([d.user.latitude,d.user.longitude],{icon:L.divIcon({className:'',html:'<div class="me"></div>',iconSize:[16,16]}),interactive:false}).addTo(layer);b.push([d.user.latitude,d.user.longitude]);}
  var ids=d.points.map(function(p){return p.id}).join(',');
  if(b.length&&ids!==lastIds){lastIds=ids;
    var near=d.user?b.slice(0,Math.min(6,b.length)).concat([[d.user.latitude,d.user.longitude]]):b;
    map.fitBounds(near,{padding:[40,40],maxZoom:15,animate:fitted});fitted=true;}
  var s=d.points.find(function(p){return p.id===d.selectedId});
  if(s&&fitted)map.panTo([s.lat,s.lng],{animate:true});
};
send({type:'ready'});
</script></body></html>`;
}

const styles = StyleSheet.create({
  wrap: { borderRadius: radius.lg, overflow: 'hidden', borderWidth: 1 },
});
