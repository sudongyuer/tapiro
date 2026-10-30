export const CRAYON_FILTER = `<filter id="crayon" x="-15%" y="-15%" width="130%" height="130%">
<feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="2" seed="3" result="warp"/>
<feDisplacementMap in="SourceGraphic" in2="warp" scale="4.5" xChannelSelector="R" yChannelSelector="G" result="wobble"/>
<feTurbulence type="fractalNoise" baseFrequency="0.6" numOctaves="2" seed="9" result="grain"/>
<feColorMatrix in="grain" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.1 1.45" result="mask"/>
<feComposite in="wobble" in2="mask" operator="in"/>
</filter>`;

export const LINE_STYLE =
  '.ln{fill:none;stroke:#3A2E2A;stroke-width:2.6;stroke-linecap:round;stroke-linejoin:round}';

export const DRAWINGS = {
  parcel: `
<path class="fl" d="M22 46 L60 30 L98 46 L98 88 L60 104 L22 88 Z" fill="#C9935B"/>
<path class="fl" d="M60 62 L98 46 L98 88 L60 104 Z" fill="#B27A45"/>
<path class="fl" d="M22 46 L60 30 L98 46 L60 62 Z" fill="#DDAE78"/>
<path class="fl" d="M41 38 L79 54 L79 63 L41 47 Z" fill="#F0DDB0"/>
<path class="ln" d="M22 46 L60 30 L98 46 L98 88 L60 104 L22 88 Z M22 46 L60 62 L98 46 M60 62 L60 104"/>
<path class="ln" d="M30 68 L44 74 M30 75 L40 79"/>`,
  tea: `
<path class="fl" d="M38 40 L82 40 L76 104 L44 104 Z" fill="#EBD3B4"/>
<path class="fl" d="M40 62 L80 62 L76 104 L44 104 Z" fill="#B97B4E"/>
<path class="fl" d="M33 33 L87 33 L85 42 L35 42 Z" fill="#F7F1E6"/>
<path class="fl" d="M66 8 L71 9 L63 41 L58 40 Z" fill="#E2554B"/>
<circle class="fl" cx="51" cy="95" r="4" fill="#3B2A24"/>
<circle class="fl" cx="60" cy="98" r="4" fill="#3B2A24"/>
<circle class="fl" cx="69" cy="94" r="4" fill="#3B2A24"/>
<circle class="fl" cx="56" cy="88" r="4" fill="#3B2A24"/>
<path class="ln" d="M38 42 L44 104 L76 104 L82 42 M33 33 L87 33 L85 42 L35 42 Z"/>`,
  bag: `
<path class="fl" d="M44 30 C44 12 62 10 66 26 L66 46 L50 46 Z" fill="#E9C58A"/>
<path class="fl" d="M70 22 C80 18 88 24 86 34 C84 42 74 44 70 38 Z" fill="#E2554B"/>
<path class="fl" d="M24 44 L96 44 L90 104 L30 104 Z" fill="#7FA96B"/>
<path class="fl" d="M64 44 L96 44 L90 104 L62 104 Z" fill="#6A9158"/>
<path class="fl" d="M40 66 L80 66 L79 80 L41 80 Z" fill="#F0DDB0"/>
<path class="ln" d="M24 44 L96 44 L90 104 L30 104 Z"/>
<path class="ln" d="M42 52 C42 34 50 32 52 44 M70 52 C70 34 78 32 80 44"/>`,
  food: `
<path class="fl" d="M30 54 C30 36 90 36 90 54 Z" fill="#FBF6EC"/>
<path class="fl" d="M64 46 C70 40 82 42 84 50 L70 54 Z" fill="#E2554B"/>
<path class="fl" d="M34 50 C40 42 52 42 56 50 Z" fill="#7FA96B"/>
<path class="fl" d="M18 54 L102 54 C100 80 82 98 60 98 C38 98 20 80 18 54 Z" fill="#5B8DB8"/>
<path class="fl" d="M60 54 L102 54 C100 80 82 98 60 98 Z" fill="#4C7BA3"/>
<path class="fl" d="M44 98 L76 98 L72 106 L48 106 Z" fill="#4C7BA3"/>
<path class="fl" d="M30 66 C46 72 74 72 90 66 L88 72 C72 78 48 78 32 72 Z" fill="#F0DDB0"/>
<path class="ln" d="M18 54 L102 54 C100 80 82 98 60 98 C38 98 20 80 18 54 Z M44 98 L48 106 L72 106 L76 98"/>
<path class="ln" d="M78 12 L58 50 M90 16 L66 52"/>`,
  medicine: `
<rect class="fl" x="36" y="22" width="40" height="16" rx="4" fill="#E2554B"/>
<path class="fl" d="M32 40 L80 40 L80 102 C80 106 78 108 74 108 L38 108 C34 108 32 106 32 102 Z" fill="#FBF6EC"/>
<path class="fl" d="M60 40 L80 40 L80 102 C80 106 78 108 74 108 L60 108 Z" fill="#E7DFD0"/>
<rect class="fl" x="38" y="56" width="36" height="34" rx="3" fill="#7FA96B"/>
<path class="fl" d="M52 62 L60 62 L60 69 L67 69 L67 77 L60 77 L60 84 L52 84 L52 77 L45 77 L45 69 L52 69 Z" fill="#FBF6EC"/>
<path class="fl" d="M88 76 C92 68 104 70 104 80 L104 94 C104 104 88 104 88 94 Z" fill="#F3C14B"/>
<path class="fl" d="M88 86 L104 86 L104 94 C104 104 88 104 88 94 Z" fill="#E2554B"/>
<path class="ln" d="M36 22 L76 22 L76 38 L36 38 Z M32 40 L80 40 L80 102 C80 106 78 108 74 108 L38 108 C34 108 32 106 32 102 Z"/>
<path class="ln" d="M88 80 C88 68 104 68 104 80 L104 94 C104 104 88 104 88 94 Z M88 86 L104 86"/>`,
  queue: `
<rect class="fl" x="56" y="22" width="46" height="62" rx="6" fill="#FBF6EC"/>
<path class="fl" d="M64 60 L94 60 L94 66 L64 66 Z" fill="#D8D2C6"/>
<path class="fl" d="M64 34 L94 34 L94 50 L64 50 Z" fill="#E2554B"/>
<path class="fl" d="M64 72 L84 72 L84 76 L64 76 Z" fill="#D8D2C6"/>
<path class="fl" d="M16 104 C16 74 52 74 52 104 Z" fill="#5B8DB8"/>
<circle class="fl" cx="34" cy="56" r="12" fill="#E8B08A"/>
<path class="fl" d="M21 54 C20 40 46 38 47 52 C40 47 30 47 21 54 Z" fill="#2E2420"/>
<path class="ln" d="M56 28 C56 24 58 22 62 22 L96 22 C100 22 102 24 102 28 L102 78 C102 82 100 84 96 84 L62 84 C58 84 56 82 56 78 Z"/>
<path class="ln" d="M16 104 C16 74 52 74 52 104"/>`,
  document: `
<path class="fl" d="M28 16 L76 16 L94 34 L94 106 L28 106 Z" fill="#FBF6EC"/>
<path class="fl" d="M76 16 L94 34 L76 34 Z" fill="#E7DFD0"/>
<path class="fl" d="M60 64 L94 64 L94 106 L60 106 Z" fill="#F1EADC"/>
<circle class="fl" cx="72" cy="84" r="14" fill="#E2554B"/>
<circle class="fl" cx="72" cy="84" r="8" fill="#F08A80"/>
<path class="fl" d="M34 8 L44 8 L44 34 C44 40 34 40 34 34 Z" fill="#5B8DB8"/>
<path class="ln" d="M28 16 L76 16 L94 34 L94 106 L28 106 Z M76 16 L76 34 L94 34"/>
<path class="ln" d="M38 50 L82 50 M38 60 L70 60 M38 70 L54 70"/>`,
  move: `
<rect class="fl" x="30" y="58" width="50" height="38" rx="3" fill="#C9935B"/>
<rect class="fl" x="38" y="26" width="38" height="32" rx="3" fill="#DDAE78"/>
<path class="fl" d="M52 26 L62 26 L62 58 L52 58 Z" fill="#F0DDB0"/>
<path class="fl" d="M50 58 L60 58 L60 96 L50 96 Z" fill="#F0DDB0"/>
<path class="ln" d="M30 58 L80 58 L80 96 L30 96 Z M38 26 L76 26 L76 58"/>
<path class="ln" d="M86 20 L86 100 L24 100 M86 100 C90 100 92 104 92 106"/>
<circle class="fl" cx="34" cy="106" r="6" fill="#2E2420"/>
<circle class="fl" cx="78" cy="106" r="6" fill="#2E2420"/>`,
  study: `
<path class="fl" d="M12 50 C32 40 50 42 60 52 C70 42 88 40 108 50 L108 100 C88 92 70 94 60 102 C50 94 32 92 12 100 Z" fill="#4F7FB0"/>
<path class="fl" d="M17 46 C34 38 50 40 60 48 L60 96 C50 88 34 86 17 94 Z" fill="#FBF6EC"/>
<path class="fl" d="M103 46 C86 38 70 40 60 48 L60 96 C70 88 86 86 103 94 Z" fill="#FBF6EC"/>
<path class="ln" d="M24 58 C34 54 44 54 52 58 M24 68 C34 64 44 64 52 68 M68 58 C76 54 86 54 96 58"/>
<path class="fl" d="M78 14 L88 18 L72 62 L62 58 Z" fill="#F3C14B"/>
<path class="fl" d="M62 58 L72 62 L64 70 Z" fill="#3A2E2A"/>
<path class="ln" d="M60 48 L60 96"/>`,
  accompany: `
<path class="fl" d="M24 108 C24 70 60 70 60 108 Z" fill="#7FA96B"/>
<circle class="fl" cx="42" cy="50" r="13" fill="#E8B08A"/>
<path class="fl" d="M28 48 C27 32 57 30 56 46 C48 40 36 40 28 48 Z" fill="#2E2420"/>
<path class="fl" d="M66 108 C66 78 96 78 96 108 Z" fill="#E59A6B"/>
<circle class="fl" cx="81" cy="64" r="11" fill="#F0C29C"/>
<path class="fl" d="M69 64 C66 48 96 46 94 62 C90 54 76 54 69 64 Z" fill="#6B4430"/>
<path class="ln" d="M56 90 C62 86 66 88 70 92"/>`,
  car: `
<path class="fl" d="M12 76 C12 64 20 60 30 58 L44 40 C46 37 50 36 54 36 L80 36 C86 36 90 39 93 44 L102 58 C110 60 110 66 110 76 L110 88 L12 88 Z" fill="#E2554B"/>
<path class="fl" d="M48 44 L58 44 L58 57 L38 57 Z" fill="#CFE3EE"/>
<path class="fl" d="M62 44 L84 44 L92 57 L62 57 Z" fill="#CFE3EE"/>
<circle class="fl" cx="52" cy="53" r="4.5" fill="#2E2420"/>
<circle class="fl" cx="70" cy="52" r="4.5" fill="#6B4430"/>
<circle class="fl" cx="81" cy="52" r="4.5" fill="#2E2420"/>
<circle class="fl" cx="34" cy="90" r="11" fill="#2E2420"/>
<circle class="fl" cx="88" cy="90" r="11" fill="#2E2420"/>
<circle class="fl" cx="34" cy="90" r="4" fill="#D8D2C6"/>
<circle class="fl" cx="88" cy="90" r="4" fill="#D8D2C6"/>
<path class="ln" d="M12 76 C12 64 20 60 30 58 L44 40 C46 37 50 36 54 36 L80 36 C86 36 90 39 93 44 L102 58 C110 60 110 66 110 76 L110 86"/>`,
  other: `
<path class="fl" d="M30 100 C26 76 40 62 60 62 C82 62 94 78 90 100 Z" fill="#F0A35E"/>
<circle class="fl" cx="60" cy="50" r="20" fill="#F0A35E"/>
<path class="fl" d="M42 40 L44 20 L56 32 Z M78 40 L76 20 L64 32 Z" fill="#E08A43"/>
<path class="fl" d="M88 96 C104 94 106 78 98 72" fill="none" stroke="#E08A43" stroke-width="7" stroke-linecap="round"/>
<circle class="fl" cx="53" cy="50" r="2.6" fill="#2E2420"/>
<circle class="fl" cx="67" cy="50" r="2.6" fill="#2E2420"/>
<path class="ln" d="M56 58 C58 60 62 60 64 58"/>`,
};

export function svgFor(id, { size = 512, border = 0 } = {}) {
  const ring = border
    ? `filter:drop-shadow(${border}px 0 0 #fff) drop-shadow(-${border}px 0 0 #fff) drop-shadow(0 ${border}px 0 #fff) drop-shadow(0 -${border}px 0 #fff)`
    : '';
  return `<!doctype html><html><head><style>html,body{margin:0;background:transparent}${LINE_STYLE}
.wrap{width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center}
svg{width:${size - border * 4}px;height:${size - border * 4}px;${ring}}</style></head><body><div class="wrap">
<svg viewBox="0 0 120 120"><defs>${CRAYON_FILTER}</defs><g filter="url(#crayon)">${DRAWINGS[id]}</g></svg>
</div></body></html>`;
}
