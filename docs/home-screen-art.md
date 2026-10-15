# ホーム画面の素材と制作指示

既存のバトル画面内のホームだけを変更。戦闘盤面、技一覧、アカリの通信欄、HPと充電、音声出力は既存の仕様を維持する。

- 原画を参考のドット絵の品質で画像編集。漫画の目、表情、髪の分け目、顔まわりの髪、編み髪、衣装、腕のポーズを参照する。
- ホームのゼロと旧端末は除去。アカリはそのままの絵・大きさで、肘の左余白30pxを15pxにするだけ左へ移動する（480×270基準）。
- 頭上の小物は参考画像のSFスポーツサングラス。青い一枚レンズと白いフレーム。前髪より後ろの頭頂部に寝かせて配置する。
- 両方の手袋はゼロの参考画像と同系統の金色。関節を暗くし、袖口の縁だけ銀色を残す。
- 太い回路の背景全体を右斜め上へ一定方向に連続移動する。左右の往復・回転・逆方向の別レイヤーは廃止。鏡面タイルの接続で画面端を埋め、180秒分の移動でも欠けないことを検証する。
- タイトル「終末のゼロ」とゼロの斜線入り楕円マークを一体のロゴとして画像制作。書体をそのまま置く構成を廃止する。
- 人物・背景・ロゴを分けて描画。ロゴには表面を横切る反射光を付ける。
- ロゴは10px下へ移動した配置を維持。真正面のiPhoneを従来の約1.3倍（高さ122→158px）に拡大し、時計回りの傾きを45°から30°へ緩める。右上の背景とアカリの間に配置。
- iPhoneの上部に10個のアプリアイコン（4＋4＋2）を追加。下部の4個はそのまま。合計14個であり、追加10個にドック4個を含めない。
- 六芒星の開始ボタンは「の」の上へ配置（中心は画面幅65%・高さ46%）。表示は「START」。文字は角ばった斜体・ステンシル風の専用SVGパスで描き、標準フォントや外部フォントには依存しない。
- 開始ボイスは実音声を「エンコードゼロ！」とひと続きに再合成。専用開始SE、転送、DEBUG、TARGETまで既存の演出につなぐ。
- ホーム曲は164BPM・64小節・約93.66秒のアップテンポな循環ループへ更新。冒頭から主旋律・4拍キック・細かいアルペジオを入れ、長い静かな導入は設けない。平均音量の基準は0.16 RMSを維持し、戦闘BGMは変更しない。初回再生はブラウザの自動再生制限に従い最初のタップ後。音量スライダーは共通、開始時はホーム曲を止めて掛け声へ切り替える。

## 配信素材

| 内容 | 保存先 |
| --- | --- |
| アカリ前景 | [title-akari-v81.webp](sandbox:/workspace/scratch/769286318d85/site-source/dist/assets/home/title-akari-v81.webp) |
| 回路背景 | [title-circuit-v81.webp](sandbox:/workspace/scratch/769286318d85/site-source/dist/assets/home/title-circuit-v81.webp) |
| タイトルロゴ | [title-logo-v81.webp](sandbox:/workspace/scratch/769286318d85/site-source/dist/assets/home/title-logo-v81.webp) |
| 14アイコンの正面iPhone（描画時30°回転） | [title-iphone-v83.webp](sandbox:/workspace/scratch/769286318d85/site-source/dist/assets/home/title-iphone-v83.webp) |
| 六芒星STARTボタン | [start-star-v83.svg](sandbox:/workspace/scratch/769286318d85/site-source/dist/assets/home/start-star-v83.svg) |
| アップテンポのホーム曲 | [zero-home-opening-v2.mp3](sandbox:/workspace/scratch/769286318d85/site-source/dist/assets/music/zero-home-opening-v2.mp3) |
| 開始SE | [zero-home-start-v1.wav](sandbox:/workspace/scratch/769286318d85/site-source/dist/assets/music/zero-home-start-v1.wav) |
| 新しい開始ボイス | [encode-zero-v2.wav](sandbox:/workspace/scratch/769286318d85/site-source/dist/assets/akari/encode-zero-v2.wav) |

iPhoneの外観は[Apple公式の現行製品ページ](https://www.apple.com/jp/iphone-18-pro/)および[正面写真](https://www.apple.com/jp/iphone-18-pro/images/overview/product-viewer/size__ufk3tqa1f5e2_large.jpg)を2026年10月15日に確認。SF端末にはしない。電話画像は組み込み画像編集機能で制作し、最新版の原本を `scripts/art-source/title-iphone-v83.png` に保存。配信時のWebPは255×512、153,848バイト。`scripts/package-home-phone.py` は透明な余白の除去とサイズ・形式変換だけを行う。

ホーム曲と専用SEは `scripts/compose-home-opening.py` で事前生成。音源モデルのダウンロード・端末上での合成・外部有料サービスは使用しない。新ボイスは既存のVOICEVOX音源で事前生成する。

原本PNGは `scripts/art-source/title-akari-v81.png`、`title-circuit-v81.png`、`title-logo-v81.png` に保存。人物とロゴのWebPは可逆圧縮。背景のみ品質96で圧縮し、960×540で配信。読み込みモデルや外部実行サービスは追加しない。

再出力：`python scripts/build-home-title.py --characters scripts/art-source/title-akari-v81.png --circuit scripts/art-source/title-circuit-v81.png --logo scripts/art-source/title-logo-v81.png`

## 検証

- 実ゲームの開始、遅延読み込み、開始ボイス、転送、DEBUG、TARGETをテスト。
- 19種類の技、5件のストック、待機技の実行とキャンセル、回数制限、着地、ボス戦、設定の停止・再開をテスト。
- 背景の広範囲が動くこと、180秒分の移動でも右上方向が変わらず四辺が欠けないこと、設定で停止すること、戦闘乱数を消費しないことをテスト。
- ホーム曲のタップ後再生、設定の停止・復帰、音量、専用SE、開始前の停止と遅延デコード時の重複防止を音声出力のテストで確認する。
- ゲームのCanvasからタイトルと演出のフレームを出力して目視確認。ブラウザおよびiPhone実機でのUI表示確認はこの環境では未実施。

## 画像編集と生成の指示

### v83：下部4個を残して10個追加（組み込み画像編集）

原本：`scripts/art-source/title-iphone-v83.png`。下記の指示でv82の端末画像だけを編集。アカリ・ロゴ・背景は画像編集せずそのまま使用する。

```text
Use case: precise-object-edit.
Asset type: transparent pixel-art iPhone sprite for the title screen of 終末のゼロ.
The input image is the EDIT TARGET. Preserve its exact existing front-view iPhone silhouette, thin metal bezel, front camera cutout, blue cyan wallpaper, FOUR dock icons, screen proportions, glass highlights, high-quality crisp pixel-art rendering and upright portrait orientation. Do not draw a new device or rotate it; runtime positioning and rotation are handled separately.
The change is ONLY to add TEN ADDITIONAL ordinary iPhone app icons ABOVE the existing bottom dock. There must be FOURTEEN app icons in the whole image: TEN new icons on the home screen, PLUS the FOUR existing dock icons. The ten do NOT include the four in the dock. Keep all four existing dock icons unchanged.
Arrange the TEN new icons on the upper half of the screen in the normal iPhone four-column grid: FIRST ROW FOUR icons, SECOND ROW FOUR icons, THIRD ROW TWO icons aligned to the first two columns. 4 + 4 + 2 new icons = 10 new icons, plus the 4 dock icons = 14 icons total. Leave a comfortable gap beneath the small top camera cutout.
Ten new icon symbols: Photos (multicolor flower), Camera (camera on gray), Settings (silver gear), Clock (white hands on black), Maps (map/routing), Notes (yellow-white notepad), Calendar (simple red/white calendar tile), Weather (sun/cloud on blue), Files (blue folder on white), Calculator (dark grid with orange operator). Preserve the four existing bottom dock icons Phone, Safari, Messages, Music.
The ten new icons are about the SAME square size as the existing dock icons, evenly spaced with clear gaps. They must be readable at game scale, individually separated and visibly countable. Use the same polished hand-clustered pixels and careful bright color highlights as the input.
No extra app icons beyond these fourteen. No large clock, widgets, badges, labels, words, text, logos, notification panels, floating UI or fictional SF decoration. Keep a realistic current iPhone appearance, not a futuristic gadget.
Preserve genuine alpha transparency everywhere outside the phone and a clean modest margin. No backdrop, cast shadow, people, hands, extra device, captions or watermark. Preserve all other pixels and proportions as closely as possible.
```

### v82：正面の現行iPhone（組み込み画像生成）

```text
Use case: stylized-concept.
Asset type: one transparent-background pixel-art iPhone sprite for the Japanese game 終末のゼロ title screen.
Input 1 is ONLY the pixel craftsmanship/style and palette reference (the approved Akari art). Do not draw Akari or any person.
Input 2 is Apple's official current iPhone 18 Pro front-view product photograph, authoritative for the real device silhouette, thin rounded bezel, display proportions, edge hardware and front camera location.
Draw ONE contemporary real iPhone 18 Pro in an EXACT ORTHOGRAPHIC STRAIGHT-ON FRONT VIEW, UPRIGHT PORTRAIT. Both long edges are parallel and exactly vertical, both short edges exactly horizontal. The front screen is completely square to the camera. No yaw, pitch, foreshortening or three-quarter perspective, no visible back or thick side plane. The runtime will rotate this flat sprite clockwise 45 degrees, so DO NOT rotate it yourself.
Keep it recognizable as a realistic current iPhone, not a science-fiction gadget: thin dark metal frame, softly rounded corners, very narrow even black bezels, small unobtrusive top front camera cutout as in the official reference, subtle glass edge reflections. Display a tasteful real-iPhone-style blue/cyan abstract wallpaper with a minimal row of ordinary rounded app icons and a slim bottom home indicator. No holograms, armor plates, wings, antennae, giant cyber glyphs, or fictional futuristic case.
Render with the same beautiful precise hand-clustered pixel art as input 1: sharp controlled pixel contours, coherent 3-5 tone metal/glass ramps, selective highlights, no blurry painterly gradients. Sufficient carefully drawn detail to look premium beside Akari, but readable when about 60 by 120 logical game pixels. Not a crude block icon, not a photo mosaic. The phone dominates the center of a tall transparent canvas with a clean modest transparent margin. No hands, people, stand, surrounding composition, cast shadow, glow cloud, labels, captions, watermarks or background. Actual alpha transparency.
```

組み込みの画像編集・生成機能を使用。以下は保存した制作指示。前景は原画を参照した画像編集を行い、続けてユーザー指定の除去・形状・配色を修正。背景とロゴはそれぞれ独立した素材として制作した。

### 原画からのピクセルアート編集

```text
Use case: style-transfer.
Asset type: transparent foreground illustration for the commercial-quality Japanese pixel-art game title screen 終末のゼロ.
Input 1 (black-and-white manga): EDIT TARGET. Input 2 (colored pixel illustration): ONLY the pixel craftsmanship, rendering quality and palette reference.
Primary request: faithfully convert the original manga drawing into polished authored pixel art. Do NOT design new people or change the author's drawing into a different anime drawing. Preserve the manga's distinctive eyes, eyebrows, smile, face shape, hair silhouette, sunglasses on top of Akari's head, long thick arcing braid, sailor uniform, armband, and mechanical gloves. Zero remains INSIDE the original tilted rectangular electronic screen, wearing silver headband, gold goggles, black high zip collar and gloves. Do NOT make a second free-standing Zero.
Important pose invariant: in the original manga Akari's arm and gloved hand hang DOWN. Preserve that pose. Do NOT copy the new outstretched open-palm pose of reference 2. Do NOT have her hold the device. Keep the original manga facial expression and anatomy.
Pixel medium: the beautiful clear hand-clustered pixels, careful line contours, coherent 3 to 5 tone material ramps, controlled dithering, strong readable eyes, metallic glove highlights and subtle cyan rim light of input 2. NOT a photograph reduced to a mosaic. NOT blurred or low-resolution auto-tracing. NOT painterly high resolution fake pixels.
Layout: a wide 16:9 foreground composition, Akari large and dominant on the left, head and shoulders fully visible with breathing room, her braid curving through the upper middle. Reposition the original tilted Zero screen as a separate larger element at the right; his face stays clearly readable. Cut off the lower torso at bottom if necessary for a title-screen bust composition. Leave the lower central band of the canvas suitable for a title logo overlay over the torsos, but never erase parts of either face. All of Akari's head and braid fit inside the canvas. Keep the two characters' source poses and geometry; only their layout, pixel rendering and color change.
Colors: black blue hair, ivory skin, cool gray eyes, white/gray blouse, black sailor collar and skirt, muted red tie, silver mechanical gloves; Zero black suit, silver band and hardware, gold yellow goggles; cyan illumination.
Background: genuinely transparent alpha everywhere outside the two existing manga figures and the device. No background, no title, no logo, no buttons, no watermark, no extra characters or props.
```

### アカリのみ・スポーツサングラス

```text
Use case: precise-object-edit.
Asset type: final transparent pixel-art foreground for the Japanese game 終末のゼロ.
Input 1 is the EDIT TARGET, the existing polished pixel-art illustration. Input 2 is ONLY the design reference for the SF SPORTS SUNGLASSES.
Make ONLY these two changes:
1. Completely remove Zero AND the entire electronic device/screen from the right. That right side becomes genuinely transparent. No Zero, no device remnants, no second person.
2. Replace the item on top of Akari's hair with the futuristic wrap-around SPORTS SUNGLASSES of reference 2. They have one broad continuous curved panoramic pale-blue visor lens, angular silver-white frames, a shaped nose bridge and slender futuristic rigid temple arms with small cyan accents. They must clearly read as a PAIR OF SF SPORTS SUNGLASSES pushed UP onto the TOP of her head/hair, not worn over her eyes. The curved lens front and nose bridge are visible above her forehead, with the temple arms extending back into the hair on both sides. Do not make a headband, pilot goggles, swimming goggles, two separated round lenses or an opaque metal strip. Match the shape in reference 2 but render it with exactly input 1's pixel art.
Preserve everything else from input 1, especially Akari's facial shape, eyes, smile, head angle, forward hair locks, thick arcing braid, sailor blouse, red tie, armband, downward arm and mechanical gloves, character proportions, existing line pixels, cluster shading and cyan rim highlights. Do NOT redesign her face, body, pose or hair. Keep her existing large placement on the left and her entire head visible. The right remains empty for a separately composed title logo and moving background.
Maintain the wide 16:9 canvas, beautiful sharp authored pixel-art contours and careful limited color ramps. Full genuine alpha transparency outside Akari including where the old Zero device was. No backdrop, no words, no logos, no other figures or props.
```

### 手袋の色・髪型

```text
Use case: precise-object-edit.
Input 1 is the EDIT TARGET: the existing transparent pixel-art Akari. Input 2 is the AUTHOR'S ORIGINAL MANGA and is authoritative ONLY for Akari's exact hairstyle. Input 3 is ONLY a color reference for the gold mechanical gloves. Input 4 is ONLY the SF sports sunglasses shape reference.
Correct only the following details of input 1:
A. Akari's HAIR must follow input 2 faithfully: the smooth rounded pulled-back black crown, natural central part, relatively flat small hairline arcs at the top of the forehead, and the straight long face-framing locks ending below the jaw. Preserve the author's precise outer silhouette, parting and face-framing shapes from the manga. No big curled-up bangs, no tall M-shaped pompadour, no exaggerated pointed widow's peak, no added spikes. Keep the thick long arcing braided ponytail from the original. Preserve her original smile and eye shapes; do not redesign the face.
B. The SF sports sunglasses are sitting too far forward in input 1. Slide the SAME wraparound sunglasses BACK and UP onto the crown, behind the front hairline, as positioned on top of the hair in input 2. The front parted hair and entire forehead must remain clearly visible in front of the sunglasses, with a band of black crown hair between the lens and the forehead. Render their real perspective as pushed far back on the top of the head. Keep the single continuous pale blue visor lens, silver-white angular frame, sculpted nose bridge and futuristic temple arms of input 4. They must remain recognizable SF sports sunglasses on top of her head, not glasses across her forehead, not a headband, not two separate round goggles. Do not add anything over her eyes.
C. Recolor BOTH visible mechanical gloves/gauntlets to match the mustard-gold/yellow metal gloves in input 3 exactly: ochre gold main armor, warm gold highlights, olive-brown shadow sections and dark articulated finger joints. Keep a narrow silver cuff edge only where appropriate. They must no longer look like silver-gray gloves. Preserve the mechanical glove geometry and the existing downward pose of her hands.
Everything else is locked: same left-side composition, head angle, eyes, smile, body proportions, white sailor blouse, dark collar/skirt, muted red tie, red armband, clean cyan edge accents and high-quality authored pixel clusters. Keep the wide 16:9 transparent canvas and current framing.
Zero and the tablet were removed intentionally and MUST stay absent. Do not copy any character or device from the reference images into the output. Only Akari with corrected hair, the sports sunglasses pushed back on the crown and gold gloves. No background, title, text, logo or new props; actual transparent alpha.
```

### サングラスの位置と角度

```text
Use case: precise-object-edit.
Image 1 is the EDIT TARGET. Image 2 is the original author's manga and shows the correct back-on-the-crown position of the glasses relative to the front hair parting.
Only correct the sunglasses placement in image 1. They are STILL too far forward. Move them clearly BACK onto the upper CROWN and rotate them backwards, lying flatter on top of her hair. Their visor must be strongly foreshortened vertically because it is tilted upwards toward the sky, not hanging down toward the forehead. The existing lenses are roughly 100px tall on this canvas; make the visible lens height roughly HALF that and position the entire pair HIGHER on the crown. Leave a clearly visible broad strip of black hair between the sunglasses' nearest lower edge and BOTH front hair-parting arcs. The glasses must not touch the forehead hairline, the widow's-peak area or the front face-framing locks. This must be an obvious positional and perspective change, not a tiny shift.
Keep them a single continuous pale blue curved SF SPORTS SUNGLASSES visor with the same white angular frame, nose bridge, slim rigid temple arms and small cyan/pink accents. Show the lens and bridge as resting behind the front parted hair on the top rear of the head, matching image 2's placement. Do not turn them into a headband or two goggles. Keep them fully within the canvas; if needed reduce the glasses' overall size slightly to fit on the top of her existing head.
Every other pixel subject detail must stay the same: the newly corrected GOLD gloves, silver cuff rims, exact face, eyes, smile, rounded black hair crown, original manga parting, long straight face-framing locks, long arcing braid, sailor clothes, red armband, body pose, lighting, size and layout. Do not change the hairstyle or expression again. No Zero or tablet. Same wide transparent canvas and high-quality crisp pixel-art rendering. Do not add text, a background, new props or new characters. This is only a sunglasses POSITION and perspective correction.
```

### 背景プレート

```text
Use case: stylized-concept.
Asset type: widescreen animated title-screen BACKGROUND PLATE for an original Japanese cyber pixel-action game. This image will pan as a whole behind character art and a separate title logo.
Input images 1 and 2 are only composition/motif references: the bold full-screen circuit-board backgrounds of GBA title screens. DO NOT reproduce their lettering, logos, numbers, character emblems, trademarks or exact layouts.
Create a dense, designed, powerful 16:9 cyber circuit field. Large diagonal metallic circuit channels and broad angular traces traverse the entire frame; layered raised chip pathways, concentric processor rings and deep dark indigo recessed spaces create strong dimensional depth. The network fills the whole background. It must look like an authored finished game title screen, not sparse stars on a gradient and not a tiny corner decoration. Use large features that remain recognizable on a small phone.
Palette: deep blue/indigo and teal base, electric cyan conductor highlights, restrained warm amber/gold parallel trace inlays. Keep the main central area medium-dark so foreground characters and a bright title will read, but still clearly draw large circuit structures there. Material: crisp pixel art, clean 1-2 pixel edge highlights, carefully stepped diagonals, restrained dithering, GBA-era premium visual direction, strong contrast. No blur, no soft vector-only gradient, no painterly fog.
Composition: full-bleed wide 16:9 image. Continuous large circuit tracks run right through the edges so the asset supports horizontal panning. No text of any kind, no title, no UI, no characters, no isolated stars, no logos, no watermark. This is only the substantial background art.
```

### 専用タイトルロゴ

```text
Use case: logo-brand.
Asset type: an original Japanese pixel-action videogame title LOGO, transparent cutout, intended for a production GBA-style game title screen.
Exact sole text, verbatim: 「終末のゼロ」. Exactly these five Japanese characters in this order: 終 / 末 / の / ゼ / ロ. Do not add quotation marks, subtitles, romaji, numbers, English taglines or trademarks.
Create custom Japanese game-title lettering, not plain typesetting. The lettering has forward-driving slightly oblique angular shapes, cut bevels, a thick near-black/navy outer contour, layered silver/white-to-ice-cyan metallic faces, a slim bright edge and substantial dark blue extrusion. Accents in warm amber and a restrained vermilion slash. The two kanji 終末 and the katakana ゼロ are powerful and legible; the smaller の links them. Keep all five letters on one clear horizontal reading line.
Integrate the game's ZERO emblem into the logo as one cohesive designed object: a large tilted oval zero with a clean diagonal slash, behind the right half of the lettering, metallic silver/cyan with a small amber highlight. A few angular circuit terminals may attach to the silhouette, but no extra symbols floating in unused space. The logo's graphic silhouette is compact, clean and balanced. Preserve legibility at a displayed width of 300 pixels. Use authored crisp pixel-edge detail, controlled 16-bit color ramps and stepped highlights; premium GBA title-logo craftsmanship. No soft blur, no painterly glow fog, no generic plain font appearance, no excessive little decorations.
Canvas: wide horizontal transparent image with fully visible logo and modest clear padding. Genuinely transparent background and counters between letters. NO backdrop, no people, no game mockup, no buttons. This is only the final reusable logo asset.
```
