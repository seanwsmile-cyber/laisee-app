/**
 * Style catalog + AI prompt assembly for laisee (red packet) generation.
 * Aligned with formal red-packet STYLE_PROFILES + worker main-path spirit:
 * style template locked · identity replace · greeting overwrites sample calligraphy · no white backdrop.
 *
 * Dual-mode architecture:
 * - 'pet' (🐾 小動物／毛孩): style01–style08 (8 styles) — breed, coat color, markings & festive pet accessories
 * - 'kids' (👶 小朋友／親子): style09–style13 (5 styles) — one distinct illustration style each (watercolor storybook, 3D animated film, anime, gongbi, paper-cut), natural child proportions, stylized (non-photoreal) child likeness & festive attire
 */

const CACHE = '20261023n';

export const CATEGORIES = {
  pet: {
    id: 'pet',
    nameZh: '小動物／毛孩',
    nameEn: 'Pets & Animals',
  },
  kids: {
    id: 'kids',
    nameZh: '小朋友／親子',
    nameEn: 'Kids & Family',
  },
};

export const STYLES = [
  {
    id: 'style01',
    category: 'pet',
    nameZh: '金光醒獅',
    nameEn: 'Golden Lion',
    captionZh: '醒獅裝扮 × 燈火光軌',
    captionEn: 'Lion-dance costume × light trails',
    maxSubjects: 1,
    image: 'assets/styles/front-01.jpg',
    thumb: `assets/styles/front-01-thumb.jpg?v=${CACHE}`,
    profileKey: 'horse',
    scene:
      'Preserve the dark warm festival setting, softly focused traditional red-and-gold architecture toward the side, hanging red lanterns and sweeping arcs of golden light. Keep small sparks and amber bokeh subordinate to the main art. Use luminous warm rim light and rich shadows with detailed, softly modeled surfaces; maintain colored scenery behind the whole portrait and through every gap.',
    subject:
      'Recreate the original elaborate white-trimmed lion-dance headdress and iridescent embroidered red, turquoise and gold jacket, with fabric ribbons and visible stitching. Each uploaded pet/animal identity keeps its own face, species, breed, coat color, markings and natural anatomy. Adapt headwear around ears, horns or feathers without covering eyes or muzzles/beaks; fit the festive jacket naturally to the animal torso. For multiple pets, use a compact group with individually fitted costumes and separate faces, prioritizing pet identity over the original solo pose.',
    lettering:
      'Match the original clear metallic-gold brush calligraphy: confident thick-to-thin strokes, tapered ends, balanced radicals and open counters; keep gold texture subtle and edges crisp, without glowing blur or thick outline.',
    avoid:
      'No generic mascot, bare replacement where the reference wears a costume, fused headdress and face, photographic rectangle, white studio backdrop, oversized spark trails across faces, human traits on pets or imposed template dog anatomy.',
  },
  {
    id: 'style02',
    category: 'pet',
    nameZh: '牡丹富貴',
    nameEn: 'Peony Fortune',
    captionZh: '牡丹盛放 × 金箔富貴',
    captionEn: 'Blooming peonies × gold-foil fortune',
    maxSubjects: 1,
    image: 'assets/styles/front-02.jpg',
    thumb: `assets/styles/front-02-thumb.jpg?v=${CACHE}`,
    profileKey: 'peony',
    scene:
      'Keep a richly colored crimson field with layered red, cream and pale-gold peonies and chrysanthemums, precisely veined blue-green leaves and slender gold botanical contours. Follow the original dense floral framing and quieter red area, retaining painted petal shading, delicate linework and a refined printed surface. Preserve colored red gaps rather than opening blank white space.',
    subject:
      'Integrate uploaded pet/animal identities with softly painted portrait detail matching the original fine fur/feather texture and floral illustration. Retain recognizable faces, actual species, breed, coat colors and markings, including natural feathers or scales for non-dog pets. Match warm highlights and soft shading; allow leaves to overlap lower contours while all pet faces stay unobstructed. For multiple pets, fit a coherent group at a natural scale without replacing the entire floral border or copying the original solo dog.',
    lettering:
      'Use the original clear antique-gold Chinese brushwork with restrained dry-brush texture, solid main strokes and naturally tapered terminals; preserve readable counters and distinct strokes over red without copying the original word arrangement.',
    avoid:
      'No flower-to-face substitutions, pasted photographs, white panels, unrequested animals, glossy plastic flowers, busy veins crossing eyes or thin gold text disappearing into flower contours.',
  },
  {
    id: 'style03',
    category: 'pet',
    nameZh: '雪庭柿語',
    nameEn: 'Snow Persimmon',
    captionZh: '瑞雪紅柿 × 飛簷大吉',
    captionEn: 'Snowy eaves × ripe persimmons',
    maxSubjects: 1,
    image: 'assets/styles/front-03.jpg',
    thumb: `assets/styles/front-03-thumb.jpg?v=${CACHE}`,
    profileKey: 'persimmon',
    scene:
      'Preserve the crisp winter-blue sky, softly falling snow, snow-covered traditional glazed roof tiles and carved golden roof-ridge ornaments, with a snow-dusted branch of bright orange ripe persimmons hanging from the upper right. Keep the painterly storybook brushwork, warm sunlit snow highlights and rich architectural textures across the entire vertical frame.',
    subject:
      'Place the uploaded pet/animal identity naturally atop the snow-covered traditional roof ridge in a lively, confident pose (or a compact group for multiple pets). Preserve exact species, breed, coat color, markings, ear shapes, tail and facial expression rendered in the same warm, finely textured storybook illustration style as the rooftop scene.',
    lettering:
      'Render the user greeting in warm cream-gold Chinese brush calligraphy along the upper-left sky area with clear, balanced strokes and natural brush terminals that stand out cleanly against the winter-blue sky.',
    avoid:
      'No photographic cutouts, white background halos, replacing the uploaded pet species with the template Shiba Inu when a different animal is uploaded, or obscuring the pet face with branches or snow.',
  },
  {
    id: 'style04',
    category: 'pet',
    nameZh: '醒獅巡遊',
    nameEn: 'Lion Parade',
    captionZh: '醒獅巡遊 × 石板街景',
    captionEn: 'Lion parade × cobblestone street',
    maxSubjects: 1,
    image: 'assets/styles/pack-04.jpg',
    thumb: `assets/styles/pack-04-thumb.jpg?v=${CACHE}`,
    profileKey: 'sample_047',
    scene:
      'Preserve the warm miniature festival street, stone paving, receding traditional facades and hanging red lanterns. Use amber daylight, gentle lantern bokeh, softly modeled architectural detail and warm reflected light, with small golden festive accents in the air. Maintain the original narrow-street depth and tactile storybook atmosphere while keeping the central setting coherent and richly colored.',
    subject:
      'Dress uploaded pet/animal identities in complete red-and-gold brocade jackets and festive collars/trousers with elaborate white lion-dance headdresses above visible pet faces; use soft three-dimensional modeling at natural positions and scale, preserving actual animal species, coat markings, ear shapes, muzzles and count. CRITICAL PAW & LIMB REPLACEMENT: the template reference shows a panda with black paws — you MUST replace ALL visible hands, paws, wrists and feet with paws matching the uploaded pet’s own natural fur color (e.g. white/cream fluffy cat paws for a white cat, golden fur paws for a shiba, etc.).',
    lettering:
      'Prioritize legible original lettering; otherwise use warm pale-gold festive brushwork with controlled variation and clear complete strokes.',
    avoid:
      'No black panda paws/hands/feet on non-panda pets, no panda markings on other species, hidden faces, incomplete costumes, photographic cutouts, white backdrop halos and headdresses fused into heads.',
  },
  {
    id: 'style05',
    category: 'pet',
    nameZh: '紅韻燈籠',
    nameEn: 'Red Lanterns',
    captionZh: '剪紙燈籠 × 亭臺雲影',
    captionEn: 'Papercut lanterns × pavilion clouds',
    maxSubjects: 1,
    image: 'assets/styles/pack-05.jpg',
    refImage: 'assets/styles/pack-05-ref.jpg',
    thumb: `assets/styles/pack-05-thumb.jpg?v=${CACHE}`,
    profileKey: 'sample_018',
    artStyle:
      'UNIFIED WARM GOUACHE & SOFT STORYBOOK ILLUSTRATION FOR THE ENTIRE PET: while the surrounding lanterns, clouds and pavilion are layered paper-cut scenery, the ENTIRE PET (head, face, eyes, muzzle, ears, chest, torso, legs, paws and tail) MUST be painted in ONE single, seamless warm gouache storybook illustration style with smooth brush-painted fur volumes and clean warm outlines — NEVER a realistic/airbrushed head on a paper-cut body, and NEVER spiky paper-cut strips or feather-like scales on the body.',
    scene:
      'Layered red and cream-gold paper-cut festival scenery: lanterns and ornamental corners above, a small pagoda at the right, cream-gold terraced curves across the base and an ornamental greeting plaque. Preserve each background paper layer and its gentle cast shadow.',
    subject:
      'The grey blurred silhouette in the center of Image 1 is only a placement placeholder. Replace it completely with the uploaded pet/animal as ONE cohesive, unified warm gouache storybook illustration from ears to paws: stylized illustrated eyes, soft painted muzzle, and smooth rounded brush-painted fur tufts across BOTH the head and the entire body (chest, belly, legs, paws and tail). Preserve the uploaded pet’s true species, breed, coat color, facial/body markings and anatomy (e.g. a compact fluffy cat body and cat paws for a cat — never a Corgi dog’s wide torso or dog paws). Keep the festive teal-and-red floral bandana around the neck. Head and body must have the exact same brushwork, texture and stylization level.',
    lettering:
      'Use the clear Traditional Chinese brush lettering visible in this revised original: complete radicals, solid readable strokes, open counters and natural tapered terminals. Copy its ink color and brush character, while following the exact user greeting with compact spacing. Never copy sample wording, add decorative pseudo-characters or substitute Simplified forms.',
    avoid:
      'CRITICAL: NO head-vs-body style mismatch (never put a realistic or semi-realistic pet head onto a paper-cut or spiky body), NO jagged/spiky paper-cut fur strips or pine-cone scales on the pet’s chest or body, NO leftover Corgi dog body/shoulders/paws, no white photo rectangle, cutout halo, generic replacement mascot or illegible pseudo-Chinese.',
  },
  {
    id: 'style06',
    category: 'pet',
    nameZh: '金庭暖陽',
    nameEn: 'Golden Courtyard',
    captionZh: '金庭暖陽 × 如意柑橘',
    captionEn: 'Golden courtyard × auspicious citrus',
    maxSubjects: 1,
    image: 'assets/styles/pack-06.jpg',
    thumb: `assets/styles/pack-06-thumb.jpg?v=${CACHE}`,
    profileKey: 'sample_020',
    scene:
      'Keep the warm amber festival-stage atmosphere, luminous golden background, soft red silk drapes and broad curling red ribbons. Use gentle volumetric-looking warm light, plush-friendly shallow depth and restrained distant decorative sparkle. Preserve rich orange-red fabrics, soft fold shading and a cozy theatrical glow; keep structural forms clear rather than dissolving the entire scene into indistinct bokeh.',
    subject:
      'Model every uploaded pet/animal in soft plush-inspired 3D festival illustration with separate recognizable faces, true species anatomy, ear/muzzle shapes and natural coat markings. Adapt the seated cushion-holding role and festive accessories with fabric contact and shadows; exact user scale and placement override the original.',
    lettering:
      'Prioritize legible original type; fallback is matte golden-orange rounded brushwork using the cushion only if that placement fits the greeting area.',
    avoid:
      'No copied panda traits, white backdrop, plastic shine, extra toys or photographic fur.',
  },
  {
    id: 'style07',
    category: 'pet',
    nameZh: '燈火許願',
    nameEn: 'Lantern Wish',
    captionZh: '夜院許願 × 燈火光暈',
    captionEn: 'Night courtyard wish × lantern glow',
    maxSubjects: 1,
    image: 'assets/styles/pack-07.jpg',
    refImage: 'assets/styles/pack-07-ref.jpg',
    thumb: `assets/styles/pack-07-thumb.jpg?v=${CACHE}`,
    profileKey: 'sample_019',
    scene:
      'Preserve a dark navy-and-burgundy festival courtyard with a warm stone floor, distant red architecture, small overhead fireworks and a large glowing red silk lantern above and to the right. Resolve lantern ribs and gold fittings clearly, using amber light pools, soft background bokeh and restrained floating warm specks. Keep a storybook 3D finish and depth without losing the red nighttime atmosphere.',
    subject:
      'The grey silhouette in the lower-left foreground of Image 1 is only a placeholder showing the pose: a chubby upright 3D vinyl/clay collectible figure (Pop Mart / Pixar toy look) standing on two hind legs, one front paw raised holding the glowing lantern stick. Rebuild that figure as ONE complete, unified character from the uploaded pet: head, torso, chest, arms/front legs, paws, hind legs and tail ALL share the uploaded pet’s true fur colour, pattern and markings (e.g. a fluffy white-and-cream Persian becomes white-and-cream from ears to tail tip). Use the same smooth sculpted 3D toy finish with softly stylized fur, big round glossy eyes, oversized head and short limbs for the WHOLE body — NOT a realistic photographed animal, and the head must never look more photographic than the body. Keep the uploaded pet’s species, breed, face shape, ear shape, eye colour and markings. Add the festive red collar with gold bell, with warm lantern light and floor shadows; exact user scale and placement override the original.',
    lettering:
      'Use legible original typography first; fallback is rounded orange-gold brush calligraphy with solid strokes.',
    avoid:
      'No orange tabby stripes or orange fur anywhere unless the uploaded pet is actually orange, no leftover template cat body/limbs/tail, no realistic photo head pasted onto a toy body (head and body must be one consistent style and coat), no kitten conversion for non-cats, extra figures, white backdrop, elongated bodies or glare.',
  },
  {
    id: 'style08',
    category: 'pet',
    nameZh: '煙花螢火',
    nameEn: 'Firework Fireflies',
    captionZh: '竹林螢火 × 煙花夜空',
    captionEn: 'Bamboo fireflies × firework night sky',
    maxSubjects: 2,
    image: 'assets/styles/pack-08.jpg',
    thumb: `assets/styles/pack-08-thumb.jpg?v=${CACHE}`,
    profileKey: 'sample_024',
    scene:
      'Deep navy night sky with celebratory fireworks framing the left and right sides, while keeping a clean, uncluttered dark-navy sky reserve in the upper-center greeting zone so the calligraphy reads with maximum contrast. Bamboo frames both sides, lush small flowers sit below, and the cozy campfire with warm flames and logs sits at center.',
    subject:
      'The seated figures beside the campfire are replacement examples. Use actual uploaded pet/animal identities in those slots and maintain clear species anatomy, breed features, coat markings, soft storybook painted contours and warm firelight on the inward sides. With one pet, replace the left example only and omit the other original figure; with two or more pets, use both sides of the campfire without covering the fire or bridging the gap. Preserve every uploaded animal species without duplication or merged faces.',
    lettering:
      'Render the greeting in bright, luminous warm cream-gold (#FFE89E) Traditional Chinese brush calligraphy centered in the clean upper-center dark-navy sky zone. Keep strokes bold, solid and high-contrast against the dark night sky — never use dark red lettering that collides with or disappears into firework streaks.',
    avoid:
      'No red text overlapping busy firework lines, no white photo rectangle, cutout halo, leftover original panda/child subjects, generic replacement mascot, missing pet, changed background geometry, added unrelated props or illegible pseudo-Chinese.',
  },
  {
    id: 'style09',
    category: 'kids',
    nameZh: '朱紅祥雲',
    nameEn: 'Crimson Lantern',
    captionZh: '手繪水彩繪本 × 祥雲宮燈（單人）',
    captionEn: 'Hand-painted watercolor storybook × palace lantern (solo)',
    maxSubjects: 1,
    image: 'assets/styles/pack-09.jpg',
    refImage: 'assets/styles/pack-09-ref.jpg',
    thumb: `assets/styles/pack-09-thumb.jpg?v=${CACHE}`,
    profileKey: 'kids_watercolor',
    artStyle:
      'WARM HAND-PAINTED WATERCOLOR & GOUACHE STORYBOOK ILLUSTRATION (Studio Ghibli-inspired picture-book look): soft visible brush strokes, gentle paper grain, simple warm painted shading, soft pencil-like outlines. Faces are drawn simply and charmingly in this painted style — small expressive eyes, a tiny nose suggested with one soft stroke, rosy painted cheeks.',
    scene:
      'Preserve the warm hand-painted crimson-and-gold Lunar New Year palace courtyard: vermilion columns painted with loose brushwork, glowing red palace lanterns with gold tassels, swirling golden auspicious clouds, warm amber evening light washes.',
    subject:
      'Paint the uploaded child standing in the center with natural young-child proportions (about 4 heads tall, normal-sized head, real shoulders, arms and legs), wearing a crimson Tang suit with gold cloud embroidery and holding a glowing red palace lantern on a short stick. Keep the child’s real hairstyle, fringe direction, face shape, eye shape and calm closed-mouth expression — but drawn as a painted storybook character, never a photo face.',
    lettering:
      'Warm gold hand-brushed Traditional Chinese calligraphy with crisp edges and open counters in the upper reserved sky area. STRICT TRADITIONAL ORTHOGRAPHY: 財 (never 财), 發 (never 发).',
    avoid:
      'No photorealistic or semi-realistic face, no 3D render look, no oversized head on a tiny body, no doll eyelashes on boys, no Simplified Chinese, no fake wide-open laugh when the photo has closed lips, no white backdrop, no photo rectangle, and never copy the template child’s face.',
  },
  {
    id: 'style10',
    category: 'kids',
    nameZh: '金橘萌寶',
    nameEn: 'Golden Tangerine',
    captionZh: '3D 動畫電影風 × 大桔萌寶（單人）',
    captionEn: '3D animated-film look × lucky tangerine kid (solo)',
    maxSubjects: 1,
    image: 'assets/styles/pack-10.jpg',
    refImage: 'assets/styles/pack-10-ref.jpg',
    thumb: `assets/styles/pack-10-thumb.jpg?v=${CACHE}`,
    profileKey: 'kids_3d_animation',
    artStyle:
      '3D ANIMATED FEATURE-FILM CHARACTER STYLE (Pixar / Disney look, like "Turning Red" or "Luca"): smooth stylized cartoon shading, simplified appealing shapes, large expressive animated eyes, soft clean skin without pores or photographic texture, warm cinematic lighting. Clearly a cartoon character, never a realistic human render.',
    scene:
      'Preserve the luminous golden-amber festival courtyard with flowing red silk ribbons, golden bokeh, warm sunlight rays and shiny antique gold coins scattered on a polished wooden floor.',
    subject:
      'Render the uploaded child as an animated-film character with natural animated-child proportions (about 3.5–4 heads tall, body and limbs in proportion — not a bobble-head), wearing a white-fur-trimmed red-and-gold festive vest, cheerfully holding a big glossy mandarin tangerine with green leaves in both hands. Translate the real child’s hairstyle and fringe, face shape, eye shape and calm closed-mouth expression into the cartoon design. PROPORTION: keep the head no wider than the shoulders, about one quarter of the visible body height, with a visible neck — never a bobble-head toy.',
    lettering:
      'Bold crimson-red Traditional Chinese brush calligraphy with a subtle gold rim in the upper reserved area, strongly contrasting with the golden sky.',
    avoid:
      'No photorealistic skin, pores or real-person face, no uncanny realistic 3D portrait, no tiny body with giant head, no flat 2D clip-art, no fake open-mouth laugh when the photo has closed lips, no white backdrop, no animal anatomy on children, and never copy the template character.',
  },
  {
    id: 'style11',
    category: 'kids',
    nameZh: '醒獅孖寶',
    nameEn: 'Lion Cap Duo',
    captionZh: '日系動漫插畫 × 醒獅帽雙人版（雙人）',
    captionEn: 'Japanese anime illustration × lion-cap duo (2-person)',
    maxSubjects: 2,
    image: 'assets/styles/pack-11.jpg',
    refImage: 'assets/styles/pack-11-ref.jpg',
    thumb: `assets/styles/pack-11-thumb.jpg?v=${CACHE}`,
    profileKey: 'kids_anime',
    artStyle:
      'WARM JAPANESE ANIME ILLUSTRATION (Makoto Shinkai / Kyoto Animation inspired): crisp clean anime linework, cel shading with soft glow, luminous night lighting, expressive anime eyes with highlights, simplified anime nose and mouth.',
    scene:
      'Preserve the deep royal-indigo festival night sky with glowing red lanterns, golden spark trails, softly lit traditional eaves and crimson-and-gold auspicious cloud-and-wave ornaments along the lower border.',
    subject:
      'TWO-PERSON DUO: draw two anime children side by side with natural anime-child proportions (about 4–4.5 heads tall, half-body to knees). If only one person is uploaded, that child is the main figure on the left and a festive anime companion stands beside them. Both wear red-and-gold embroidered Tang jackets and plush lion-dance hats resting on top of their heads (bangs, eyebrows and full faces visible). The uploaded child keeps their hairstyle, fringe direction, face shape and calm closed-mouth expression, drawn in anime style.',
    lettering:
      'Luminous warm cream-gold Traditional Chinese brush calligraphy centered in the upper indigo sky, high contrast and crisp.',
    avoid:
      'No photorealistic or semi-realistic faces, no 3D render, no chibi giant heads, no lion masks covering faces, no merged characters, no switching the indigo night to plain red, no white backdrop, and never copy the template faces.',
  },
  {
    id: 'style12',
    category: 'kids',
    nameZh: '粉桃財神',
    nameEn: 'Peach Blossom Ingot',
    captionZh: '新中式工筆國潮 × 金元寶小財神（單人）',
    captionEn: 'Modern Chinese gongbi illustration × golden ingot kid (solo)',
    maxSubjects: 1,
    image: 'assets/styles/pack-12.jpg',
    refImage: 'assets/styles/pack-12-ref.jpg',
    thumb: `assets/styles/pack-12-thumb.jpg?v=${CACHE}`,
    profileKey: 'kids_gongbi',
    artStyle:
      'MODERN CHINESE GONGBI / GUOCHAO FESTIVE ILLUSTRATION: fine even ink outlines, flat mineral-pigment colour washes with delicate gradients, gold-leaf accents, elegant decorative patterns. Faces are drawn in the gongbi manner — clean ink contour, simple elegant eyes, small nose line, soft blush — never photographic.',
    scene:
      'Preserve the coral-pink peach-blossom courtyard with layered finely outlined blossoms, soft spring light and the ornate cream-and-gold circular moon-gate frame in the center.',
    subject:
      'Inside the moon gate, draw the uploaded child with natural young-child proportions (about 4 heads tall, half-body or full body), wearing a rose-crimson and gold patterned New Year outfit with a small festive cap sitting on top of the hair (fringe and full face visible), holding a golden sycee ingot (金元寶) in front of the chest with both hands. Keep the child’s real hairstyle, fringe direction, face shape, eye shape and calm closed-mouth expression, drawn in gongbi style. GONGBI FACE LOCK: follow the softly blurred painted face in Image 1 — flat pale skin with only a light blush wash, thin even ink contour around face and features, eyes drawn with ink lines, a single small line for the nose; no realistic skin shading, no photographic eyes or lips.',
    lettering:
      'Clean warm cream-gold Traditional Chinese brush calligraphy in the upper coral-pink area above the moon gate. Strictly Traditional forms (學, 業, 進).',
    avoid:
      'No photorealistic face, no 3D render, no oversized head on a tiny body, no leftover girl pigtails when the photo is a boy, no adult beard or mask, no fake open-mouth laugh when the photo has closed lips, no white outer backdrop, and never copy the template child’s face.',
  },
  {
    id: 'style13',
    category: 'kids',
    nameZh: '親子拜年',
    nameEn: 'Jade Arch Duo',
    captionZh: '溫馨手繪繪本 × 翡翠庭園雙人拜年（雙人）',
    captionEn: 'Warm storybook illustration × jade pavilion greeting duo (2-person)',
    maxSubjects: 2,
    image: 'assets/styles/pack-13.jpg',
    refImage: 'assets/styles/pack-13-ref.jpg',
    thumb: `assets/styles/pack-13-thumb.jpg?v=${CACHE}`,
    profileKey: 'kids_jade_storybook',
    artStyle:
      'WARM HAND-PAINTED STORYBOOK & SOFT-GLOW ILLUSTRATION (Studio Ghibli / warm picture-book linework and watercolor-gouache shading): clean delicate hand-drawn outlines, soft warm brush-painted shading, luminous lantern rim light, natural expressive illustrated faces (never photorealistic, never flat paper-cutouts with sticker borders).',
    scene:
      'Preserve the rich jade-emerald and gold carved Chinese garden pavilion archway frame, with a WARM, LUMINOUS LANTERN-LIT COURTYARD INTERIOR visible inside the arch behind the characters (softly glowing warm amber palace corridors, floating golden bokeh and distant red lanterns — NEVER a dark brown or black empty void). Keep the hanging coral-red silk lanterns and blooming pink plum-blossom branches at the upper corners.',
    subject:
      'TWO-PERSON DUO: inside the warm-lit golden arch, paint two children side by side from head to knees (natural 4-head child proportions, natural shoulders and torso, NO die-cut sticker outlines around them) wearing crimson-and-gold embroidered Tang suits with soft white fur trim, making the two-hand New Year greeting gesture (拱手拜年). If only 1 person is uploaded, make the LEFT child the uploaded child (preserving their exact straight hair/fringe parting direction, face shape, almond eye shape and calm closed-mouth expression) and keep the RIGHT figure as a cute festive younger sister/companion with hair buns so they look like a natural brother-and-sister pair (NEVER two identical clones of the same child). If 2 people are uploaded, draw both uploaded people side by side. Render all faces in the exact same warm hand-painted watercolor & gouache storybook illustration style as Image 1 — NO photorealistic skin or pasted photo faces.',
    lettering:
      'Clean metallic warm-gold Traditional Chinese brush calligraphy centered in the upper jade-green area above the arch. Strictly Traditional forms (體, 樂).',
    avoid:
      'No dark brown/black empty void inside the arch, no die-cut paper sticker borders around characters, no stiff identical clone poses, no photorealistic faces, no giant heads on tiny bodies, no blank scroll banner over the arch, no white backdrop, and never copy the template characters’ faces.',
  },
];

export const PET_STYLES = STYLES.filter((s) => s.category === 'pet');
export const KIDS_STYLES = STYLES.filter((s) => s.category === 'kids');

export function getStylesByCategory(category = 'pet') {
  const cat = category === 'kids' ? 'kids' : 'pet';
  return STYLES.filter((s) => s.category === cat);
}

export function getStyleMaxSubjects(styleId) {
  const s = STYLE_BY_ID[styleId];
  return s?.maxSubjects || 1;
}

const STYLE_BY_ID = Object.fromEntries(STYLES.map((s) => [s.id, s]));

const HARD_BACKGROUND =
  'HARD BACKGROUND REQUIREMENT: NO WHITE BACKDROP. Extend the selected colored scenery or pattern behind the entire subject and to all four canvas edges. Remove the entire source-photo backdrop, including white/near-white fields, corners and gaps between limbs, hair, wings and clothing. No rectangular photo insert, white mat, border, sticker halo, flat white patch or transparent hole. Where the original uses pale paper, retain its motifs on a visibly tinted gold, peach, sage or blue field harmonizing with that design, never blank white or near-white. White fur and intentional white costume details are allowed; so are actual white petals and snow details, but never treat them as permission for a white studio background.';

const PET_SUBJECT_IDENTITY =
  'SUBJECT IDENTITY AND COUNT (PETS & ANIMALS MODE) — highest priority above template characters: Image 2 (and any further identity images) supply the ONLY pet/animal identity. Preserve every clearly intended foreground animal or multiple pets. Keep the exact intended subject count: no missing pet, duplicate, merged face or blended identity. For each animal preserve its actual species, breed when recognizable, muzzle/beak, ear shape and carriage, eye shape and color, coat/feathers/scales texture, fur color, facial/body markings and distinctive anatomy. A dog remains that exact dog breed; a cat remains that exact cat; a bird keeps wings and a beak; a rabbit keeps its long ears; a hamster/reptile keeps its true anatomy — never add feline features or universal paws to other species. Do not infer species from the style name or original template animal. Stylize these pet identities in the selected medium without replacing them with a generic mascot.';

const PET_ANATOMY_ADAPTATION =
  'PET ANATOMY AND FESTIVE ACCESSORY ADAPTATION: fit all uploaded pets together with visible separate faces and natural spacing. Template pose, costume and accessories are artistic references, subordinate to pet count and actual species. Adapt paws, hooves, wings, fins and body stance to actual animal anatomy. Fit festive accessories (lion-dance headdress, embroidered brocade jacket, red bandana, collar with gold bell or auspicious cushion) naturally around the pet’s ears, neck and torso without covering eyes or muzzles.';

const PET_STYLE_LOCKED =
  'STYLE-LOCKED CHARACTER REPLACEMENT: Image 1 is the master for rendering technique, composition, pose, head-to-body proportions, accessories and lighting. Keep that artwork\'s visual language throughout. Image 2+ supplies pet identity cues ONLY, including SPECIES, breed, coat colors, markings and breed-specific anatomy. Never copy any source-photo background or photographic rendering into a stylized design. Identity takes priority over the original animal anatomy: a dog remains a dog, never a kitten; a cat remains a cat; a bird or rabbit keeps its true species. If the master is a 3D collectible, plush illustration, painting or paper-cut print, render the replacement pet in exactly that same medium.';

const KIDS_SUBJECT_IDENTITY =
  'SUBJECT IDENTITY AND COUNT (KIDS & FAMILY ILLUSTRATED MODE) — highest priority above template characters: Image 2 (and any further identity images) supply the ONLY child/human identity. Completely discard the template character’s face and hair in Image 1. Preserve every clearly intended foreground child, baby, toddler or family member and keep them recognizable THROUGH STYLIZATION: hairstyle, hair colour and exact fringe/parting direction, face shape and cheek fullness, eye shape (single/double eyelid feel), eyebrow shape, skin tone, and authentic expression (CRITICAL: if the child has closed lips, a gentle pout or a calm gaze in the photo, keep that closed-mouth expression — NEVER substitute a wide-open laughing mouth). Likeness comes from these features, NOT from photographic realism.';

const KIDS_ANATOMY_ADAPTATION =
  'KIDS NATURAL PROPORTIONS AND FESTIVE COSTUME: draw children with natural young-child proportions — about 3.5 to 4.5 heads tall, head size in natural proportion to shoulders and torso, real neck, arms, hands and legs. NEVER a giant head on a tiny 2-head doll body, and never a bobble-head. Dress them in the festive Lunar New Year attire and props described for this design (Tang suit, lantern, tangerine, gold ingot or lion-dance hat). Never give children animal paws, fur or tails.';

const KIDS_STYLE_LOCKED =
  'STYLE-LOCKED ILLUSTRATED CHARACTER (NOT A PHOTO FACE): Image 1 is the master for art style, background, palette, lighting, props, costume and composition. The child must be fully redrawn in exactly the same illustration medium as Image 1 and the ART STYLE below — face, hair, skin, hands and clothes all in one consistent stylized rendering. STRICTLY NO photorealistic or semi-realistic face, no real skin pores, no photographic eyes, no pasted or blended photo head. A parent should recognize their child from hairstyle, face shape, eyes and expression, as in a good commissioned illustration.';

/**
 * Build a filled image-model prompt for a style (worker main-path spirit, simplified).
 * Splits prompt rules between 'pet' (animal breed/coat/accessories) and 'kids' (facial likeness/chibi ratio/festive kids attire).
 * @param {{ styleId: string, category?: 'pet'|'kids', greeting?: string, surname?: string, message?: string, tweak?: string }} opts
 * @returns {string}
 */
export function buildPacketPrompt({ styleId, category, greeting = '', surname = '', message = '', tweak = '' } = {}) {
  const style = STYLE_BY_ID[styleId] || STYLES[0];
  const resolvedCategory = category || style.category || 'pet';
  const isKids = resolvedCategory === 'kids';
  const g = String(greeting || '').trim() || '恭喜發財';
  const sn = String(surname || '').trim();
  const msg = String(message || '').trim();
  const tw = String(tweak || '').trim();

  const lines = [
    'Create one finished full-bleed Lunar New Year red-envelope (利是封) FRONT artwork, composed directly in the narrow portrait ratio requested by the API (1:2 or 9:16), for a final 3.5×6.75 inch trim (14:27). A small centered crop will fit the final trim without stretching or adding borders. Keep the outer 5% at the top and bottom and outer 7% at the left and right as expendable colored background only. Keep complete subjects, faces, ears and all lettering further inside: at least 7% from the top and bottom and 10% from the left and right. These safety margins override reference-template framing. No envelope mockup, folds, frames, cut marks or watermarks.',
    '',
    `TARGET AUDIENCE MODE: ${isKids ? 'KIDS & FAMILY (小朋友／親子專區 — recognizable child likeness drawn in a stylized illustration style, natural child proportions, festive New Year kids clothing)' : 'PETS & ANIMALS (小動物／毛孩專區 — focus on exact animal species, breed, coat color/markings, and festive pet accessories)'}.`,
    '',
    'REFERENCE PRIORITY: the uploaded identities and count are fixed; the chosen greeting content overrides reference wording. Image 1 sets visual medium, composition and lettering treatment. Style descriptions explain how to execute that look, never permission to copy template species or invent a new scene. Where a description differs from the visible original, follow the original, subject to these constraints and the no-white-backdrop requirement.',
    '',
    HARD_BACKGROUND,
    '',
    'PRIMARY TASK: reinterpret the complete ORIGINAL artwork in Image 1, using it as the visual master. The finished subject must look drawn, painted or modeled by that same artist inside that artwork. This is a unified artwork, not a photo collage. Image 2 (and optional further images) are likeness references to redraw, never rectangular image layers to paste. Remove all source-photo backgrounds, straight crop edges, screenshot UI; continue the approved scenery naturally up to each subject silhouette.',
    '',
    'Image 1 = STYLE TEMPLATE (visual master): lock layout, ornaments, colors, lighting and overall composition. Do NOT invent a new scene from scratch.',
    isKids
      ? 'Image 2+ = SUBJECT IDENTITY only (child / baby / family member). MANDATORY CHARACTER REPLACEMENT: the softly blurred figure(s) in Image 1 are placeholder slots — redraw the real child from Image 2 there as an illustrated character in the art style of Image 1, keeping Image 2’s hairstyle and fringe direction, face shape, eye shape, cheek fullness and exact mouth expression (if lips are closed in Image 2, keep lips closed).'
      : 'Image 2+ = SUBJECT IDENTITY only (pet / animal). Keep species, breed, coat color, markings and face faithful; species and anatomy come from these photos, not from the template animal.',
    '',
    isKids ? KIDS_SUBJECT_IDENTITY : PET_SUBJECT_IDENTITY,
    '',
    isKids ? KIDS_ANATOMY_ADAPTATION : PET_ANATOMY_ADAPTATION,
    '',
    isKids ? KIDS_STYLE_LOCKED : PET_STYLE_LOCKED,
    '',
  ];

  if (style.profileKey === 'horse') {
    lines.push(
      'MANDATORY LION-DANCE COSTUME for both cats and dogs (and other uploaded pets): a detailed lion-dance headdress framing the visible pet face and ears, plus an iridescent embroidered festive jacket covering shoulders and chest, with matching ribbons and gold trim. A bare-fur chest or a collar alone is not acceptable. Preserve reference costume detail; do not enlarge the portrait only to imitate the original framing.',
      ''
    );
  }

  lines.push(
    `STYLE-SPECIFIC ART DIRECTION (${style.profileKey || style.id}):`,
    ...(style.artStyle ? [`ART STYLE (mandatory for the whole image, including every face): ${style.artStyle}`] : []),
    `SCENE, PALETTE AND MATERIAL: ${style.scene}`,
    `SUBJECT INTEGRATION: ${style.subject}`,
    `STYLE-SPECIFIC DEFECTS TO AVOID: ${style.avoid}`,
    '',
    `GREETING TEXT (mandatory): Render EXACTLY this Traditional Chinese greeting once: "${g}". In the UPPER reserved calligraphy area of the template (classic HK laisee top plaque — never the bottom), REPLACE any baked-in sample greeting calligraphy already on Image 1. Do not leave the old template text visible; fully overwrite it. Match brush treatment from Image 1 and this LETTERING brief.`,
    `LETTERING ART DIRECTION (${style.profileKey || style.id}): ${style.lettering}`,
    'CHINESE GLYPH QUALITY: complete Traditional Chinese (繁體中文) forms only — strictly use Traditional radicals (e.g. 財 with 貝 never 财/贝, 發 never 发, 樂 never 乐, 進 never 进, 體 never 体, 聰 never 聪, 滿 never 满, 長 never 长). No Simplified substitutions, invented radicals, fuzzy gold glow or thick outline rescue. Remove all original template wording so only this greeting remains once. No empty/blank scroll plaque plates left behind; keep brush calligraphy floating cleanly on the design.',
    'Draw no extra words, logos, watermarks, numbers or placeholder marks beyond the exact requested greeting.',
    'Use the selected design palette, clear print-friendly edges and depth. Extend the scene continuously to all four edges: no white canvas, white margins, blank panels, transparent holes or photo-background remnants.',
    'FINAL IMAGE CHECK BEFORE RETURNING: verify every requested character has complete correct strokes; verify every intended subject retains its identity and has no straight photo-crop edge, white backdrop or pasted-photo panel; verify colored artwork reaches every edge.'
  );

  if (msg) {
    lines.push(
      `Also place the short message "${msg}" elegantly just below the greeting in the upper reserved area (still replacing any conflicting template text there).`
    );
  }
  if (tw) {
    lines.push(
      `User revision (within the subject-identity, exact-greeting and no-white-backdrop requirements): ${tw}. The supplied greeting remains the exact text content; lettering style follows Image 1.`
    );
  }

  return lines.join('\n');
}
