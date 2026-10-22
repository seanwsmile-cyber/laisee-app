/**
 * Style catalog + AI prompt assembly for laisee (red packet) generation.
 * Aligned with formal red-packet STYLE_PROFILES + worker main-path spirit:
 * style template locked · identity replace · greeting overwrites sample calligraphy · no white backdrop.
 *
 * Dual-mode architecture:
 * - 'pet' (🐾 小動物／毛孩): style01–style08 (8 styles) — breed, coat color, markings & festive pet accessories
 * - 'kids' (👶 小朋友／親子): style09–style13 (5 styles) — print-friendly clean flat/2D chibi, child facial likeness & simple festive attire
 */

const CACHE = '20261022j';

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
    image: 'assets/styles/pack-04.jpg',
    thumb: `assets/styles/pack-04-thumb.jpg?v=${CACHE}`,
    profileKey: 'sample_047',
    scene:
      'Preserve the warm miniature festival street, stone paving, receding traditional facades and hanging red lanterns. Use amber daylight, gentle lantern bokeh, softly modeled architectural detail and warm reflected light, with small golden festive accents in the air. Maintain the original narrow-street depth and tactile storybook atmosphere while keeping the central setting coherent and richly colored.',
    subject:
      'Dress uploaded pet/animal identities in complete red-and-gold brocade jackets and festive collars/trousers with elaborate white lion-dance headdresses above visible pet faces; use soft three-dimensional modeling at natural positions and scale, preserving actual animal species, coat markings, ear shapes, muzzles and count.',
    lettering:
      'Prioritize legible original lettering; otherwise use warm pale-gold festive brushwork with controlled variation and clear complete strokes.',
    avoid:
      'Avoid panda markings on other species, hidden faces, incomplete costumes, photographic cutouts, white backdrop halos and headdresses fused into heads.',
  },
  {
    id: 'style05',
    category: 'pet',
    nameZh: '紅韻燈籠',
    nameEn: 'Red Lanterns',
    captionZh: '剪紙燈籠 × 亭臺雲影',
    captionEn: 'Papercut lanterns × pavilion clouds',
    image: 'assets/styles/pack-05.jpg',
    thumb: `assets/styles/pack-05-thumb.jpg?v=${CACHE}`,
    profileKey: 'sample_018',
    scene:
      'Layered red and cream-gold paper-cut festival scenery: lanterns and ornamental corners above, a small pagoda at the right, cream-gold terraced curves across the base and an ornamental greeting plaque. Preserve each paper layer and its gentle cast shadow.',
    subject:
      'The example is a corgi dog with clear ears, muzzle, white chest and red festive bandana. Replace that example with the uploaded pet/animal while preserving the actual species, breed, coat color, facial markings and count. Keep the festive red bandana/collar accessory adapted to the pet. Use warm outlined gouache forms and restrained paper-cut shading. User scale and placement override sample pose; preserve all uploaded pets without duplication or merged faces.',
    lettering:
      'Use the clear Traditional Chinese brush lettering visible in this revised original: complete radicals, solid readable strokes, open counters and natural tapered terminals. Copy its ink color and brush character, while following the exact user greeting with compact spacing. Never copy sample wording, add decorative pseudo-characters or substitute Simplified forms.',
    avoid:
      'No white photo rectangle, cutout halo, leftover original subjects, generic replacement mascot, missing pet, changed background geometry, added unrelated props or illegible pseudo-Chinese. Keep the original medium consistent across the entire subject and scenery.',
  },
  {
    id: 'style06',
    category: 'pet',
    nameZh: '金庭暖陽',
    nameEn: 'Golden Courtyard',
    captionZh: '金庭暖陽 × 如意柑橘',
    captionEn: 'Golden courtyard × auspicious citrus',
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
    image: 'assets/styles/pack-07.jpg',
    thumb: `assets/styles/pack-07-thumb.jpg?v=${CACHE}`,
    profileKey: 'sample_019',
    scene:
      'Preserve a dark navy-and-burgundy festival courtyard with a warm stone floor, distant red architecture, small overhead fireworks and a large glowing red silk lantern above and to the right. Resolve lantern ribs and gold fittings clearly, using amber light pools, soft background bokeh and restrained floating warm specks. Keep a storybook 3D finish and depth without losing the red nighttime atmosphere.',
    subject:
      'Model every uploaded pet/animal as a charming large-headed storybook collectible while retaining its exact species, breed, coat color, facial markings and separate identity. Adapt the lantern-string paw/wing gesture, festive red collar and gold bell accessory with matching shadows; exact user scale and placement override the original.',
    lettering:
      'Use legible original typography first; fallback is rounded orange-gold brush calligraphy with solid strokes.',
    avoid:
      'No kitten conversion for non-cats, extra figures, white backdrop, photographic fur, elongated bodies or glare.',
  },
  {
    id: 'style08',
    category: 'pet',
    nameZh: '煙花螢火',
    nameEn: 'Firework Fireflies',
    captionZh: '竹林螢火 × 煙花夜空',
    captionEn: 'Bamboo fireflies × firework night sky',
    image: 'assets/styles/pack-08.jpg',
    thumb: `assets/styles/pack-08-thumb.jpg?v=${CACHE}`,
    profileKey: 'sample_024',
    scene:
      'Deep navy night with blue/gold fireworks, bamboo framing both sides, lush small flowers below and the existing campfire with its flames and logs at center. Preserve the campfire location and size precisely.',
    subject:
      'The seated figures beside the campfire are replacement examples. Use actual uploaded pet/animal identities in those slots and maintain clear species anatomy, breed features, coat markings, soft storybook painted contours and warm firelight on the inward sides. With one pet, replace the left example only and omit the other original figure; with two or more pets, use both sides of the campfire without covering the fire or bridging the gap. Preserve every uploaded animal species without duplication or merged faces.',
    lettering:
      'Use the clear Traditional Chinese brush lettering visible in this revised original: complete radicals, solid readable strokes, open counters and natural tapered terminals. Copy its ink color and brush character, while following the exact user greeting with compact spacing. Never copy sample wording, add decorative pseudo-characters or substitute Simplified forms.',
    avoid:
      'No white photo rectangle, cutout halo, leftover original panda/child subjects, generic replacement mascot, missing pet, changed background geometry, added unrelated props or illegible pseudo-Chinese. Keep the original medium consistent across the entire subject and scenery.',
  },
  {
    id: 'style09',
    category: 'kids',
    nameZh: 'Q版童趣',
    nameEn: 'Chibi Kids',
    captionZh: '簡約紅底祥雲 × 易印扁平Q版',
    captionEn: 'Clean red & gold clouds × print-ready chibi',
    image: 'assets/styles/pack-09.jpg',
    thumb: `assets/styles/pack-09-thumb.jpg?v=${CACHE}`,
    profileKey: 'chibi_kids',
    scene:
      'Preserve a clean, print-friendly flat 2D Lunar New Year red-packet background: solid rich crimson-red field (#b52a2d), simple bold-lined flat golden auspicious cloud motifs, and a clean gold hairline border frame. Keep large, uncluttered color blocks with zero tiny bokeh sparks or complex gradients so it prints crisply in CMYK.',
    subject:
      'Reimagine every uploaded child or family member as a cute 2.5-head flat/cel-shaded chibi human character with bold clean outlines and simple flat color shading while keeping recognizable facial features (eye shape, brows, cheeks, smile, hairstyle, fringe and glasses if worn), apparent age and exact person count. Dress them in a clean, simple red-and-gold tang suit (bold flat gold trim, no tiny micro-embroidery) holding a simple round red lantern with human hands.',
    lettering:
      'Clean solid-gold Chinese brush calligraphy with crisp edges, solid flat gold fill and open counters in the upper reserved plaque area — no blurry glow or complex metallic noise.',
    avoid:
      'No complex 3D bokeh, tiny intricate embroidery, muddy gradients, busy background clutter, photoreal paste-ins, white studio backdrop, photo rectangle, animal ears/paws on children or leftover template characters.',
  },
  {
    id: 'style10',
    category: 'kids',
    nameZh: '二頭身寶貝',
    nameEn: '2-Head Baby',
    captionZh: '大桔賀歲 × 簡約二頭身寶貝',
    captionEn: 'Lucky tangerine × clean 2-head baby',
    image: 'assets/styles/pack-10.jpg',
    thumb: `assets/styles/pack-10-thumb.jpg?v=${CACHE}`,
    profileKey: 'chibi_baby',
    scene:
      'Preserve a clean, uncluttered print-friendly vermilion-red background with a simple flat gold border frame and a few clean flat gold coin accents. Keep backgrounds solid and print-ready without tiny sparkles, heavy gradients or cluttered props.',
    subject:
      'Reimagine uploaded baby, toddler, child or family identities as true 2-head baby/toddler chibi human characters in a clean 2D flat/storybook vector style with bold outlines and soft chubby cheeks, preserving each child’s recognizable face shape, eyes, hairstyle, skin tone, expression and exact count. Dress them in a simple red-and-gold festive baby vest holding one large, clean-shaped orange lucky tangerine (大桔) with distinct human hands.',
    lettering:
      'Clean solid-gold rounded brush lettering with crisp print-ready edges in the upper reserved greeting area.',
    avoid:
      'No overly complex props, tiny busy patterns, tall realistic bodies, white backdrop, photographic paste-in, photo mat, merged faces, animal anatomy on children or leftover template subjects.',
  },
  {
    id: 'style11',
    category: 'kids',
    nameZh: '醒獅萌娃',
    nameEn: 'Lion Cap Kid',
    captionZh: '簡約醒獅帽 × 紅金波浪紋',
    captionEn: 'Simple lion cap × clean gold waves',
    image: 'assets/styles/pack-11.jpg',
    thumb: `assets/styles/pack-11-thumb.jpg?v=${CACHE}`,
    profileKey: 'chibi_lion_kid',
    scene:
      'Preserve a clean, print-ready solid crimson-red background with simple flat golden wave curves along the bottom edge and a clean gold border line. Maintain large, flat print-friendly color areas with no noisy textures or tiny floating particles.',
    subject:
      'Reimagine every uploaded child or family member as a cute 2.5-head flat/2D chibi human character wearing a simplified, bold-lined cute white-and-red lion-dance cap resting on top of the head (keeping the child’s entire face, eyebrows, eyes, smile and hair bangs clearly visible) and a clean red festive jacket with simple flat gold trim. Preserve each child’s exact facial likeness, hairstyle and person count.',
    lettering:
      'Crisp solid-gold brush calligraphy centered in the upper reserved greeting area, high contrast and print-friendly.',
    avoid:
      'No overly ornate multi-layered lion bristles, no covering the child’s face or hair, no busy background buildings, no white backdrop, no photorealistic cutouts or animal paws on children.',
  },
  {
    id: 'style12',
    category: 'kids',
    nameZh: '小財神寶貝',
    nameEn: 'Fortune Ingot Kid',
    captionZh: '簡約金元寶 × 招財喜慶童裝',
    captionEn: 'Clean gold ingot × festive fortune outfit',
    image: 'assets/styles/pack-12.jpg',
    thumb: `assets/styles/pack-12-thumb.jpg?v=${CACHE}`,
    profileKey: 'chibi_fortune_kid',
    scene:
      'Preserve a clean, print-friendly solid crimson-red background with simple flat gold corner ornaments and a minimal gold frame. Avoid cluttered piles of coins or complex lighting gradients so the design prints cleanly.',
    subject:
      'Reimagine every uploaded child or family member as a cute 2.5-head flat/2D chibi human character with bold clean outlines, wearing a simple red-and-gold New Year outfit and a small round red mandarin cap (leaving hair bangs and full face visible), holding a single large, clean-shaped golden ingot (金元寶) in front of the chest with human hands. Preserve each child’s recognizable face, smile, glasses if worn, and exact count.',
    lettering:
      'Clean solid-gold Chinese brush calligraphy with crisp strokes in the upper reserved greeting area.',
    avoid:
      'No adult beard or adult god-of-wealth mask, no cluttered background props, no micro-patterns, no white backdrop, no photographic paste-in or animal features.',
  },
  {
    id: 'style13',
    category: 'kids',
    nameZh: '桃花迎春',
    nameEn: 'Blossom Frame Kid',
    captionZh: '簡約金圓框 × 桃花拜年萌娃',
    captionEn: 'Simple gold medallion × blossom greeting',
    image: 'assets/styles/pack-13.jpg',
    thumb: `assets/styles/pack-13-thumb.jpg?v=${CACHE}`,
    profileKey: 'chibi_blossom_kid',
    scene:
      'Preserve a clean, print-ready solid crimson-red background featuring a simple flat gold circular medallion ring in the center and a few clean, flat five-petal pink peach blossoms on the side. Keep all shapes simple, bold and uncluttered for clean commercial printing.',
    subject:
      'Reimagine every uploaded child or family member as a cute 2.5-head flat/2D chibi human character framed by the gold medallion, making a cheerful two-hand Lunar New Year greeting gesture (拱手拜年) in a clean simple red-and-gold festive outfit. Preserve each child’s recognizable facial features, hairstyle, expression and exact person count.',
    lettering:
      'Clean solid-gold Chinese brush calligraphy centered in the upper reserved greeting area above the medallion.',
    avoid:
      'No dense realistic floral branches, no complex shading or bokeh, no branches crossing the child’s face, no white backdrop, no photorealistic cutouts or animal anatomy.',
  },
];

export const PET_STYLES = STYLES.filter((s) => s.category === 'pet');
export const KIDS_STYLES = STYLES.filter((s) => s.category === 'kids');

export function getStylesByCategory(category = 'pet') {
  const cat = category === 'kids' ? 'kids' : 'pet';
  return STYLES.filter((s) => s.category === cat);
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
  'SUBJECT IDENTITY AND COUNT (KIDS & FAMILY CHIBI MODE) — highest priority above template characters: Uploaded photo references supply the ONLY child/human identity. Preserve every clearly intended foreground child, baby, toddler or family member. Keep the exact intended person count: no missing child, duplicate, merged face or blended identity. Preserve each child’s recognizable facial features — face shape, chubby cheeks, eye shape and spacing, eyebrows, nose, natural smile/expression, skin tone, hairstyle, fringe, hair accessories and glasses if worn — along with apparent age and relative height order. Do not turn children into animals or generic stock dolls. Do not infer species from the style name or original template animal. Stylize each child in the selected cute chibi medium while keeping their individual likeness unmistakable.';

const KIDS_ANATOMY_ADAPTATION =
  'KIDS CHIBI PROPORTION AND FESTIVE CLOTHING ADAPTATION: reimagine uploaded children/family members with adorable chibi proportions (2–3 head chibi for Chibi Kids, true 2-head baby/toddler chibi for 2-Head Baby) with soft rounded limbs, visible human hands and fingers, and proper shoes. Dress every child in modest, festive Lunar New Year kids attire (embroidered red-and-gold tang suit, festive qipao, padded winter vest, auspicious collar or lion-dance cap framing the face without hiding eyebrows or hair). Never give children animal paws, fur, tails or adult model bodies.';

const KIDS_STYLE_LOCKED =
  'STYLE-LOCKED CHARACTER REPLACEMENT (PRINT-FRIENDLY CLEAN CHIBI): Keep a clean, uncluttered, print-ready 2D flat/cel-shaded Lunar New Year chibi visual language throughout (solid crimson-red background, bold clean outlines, simple flat color blocks, minimal flat gold motifs, zero tiny bokeh or complex micro-embroidery so it prints cleanly in CMYK). Uploaded photos supply child/family facial identity cues ONLY (facial landmarks, hairstyle, age and expression). Never copy any source-photo background or paste a photorealistic head onto a cartoon body; redraw face, hair, hands and simple festive clothing together in one unified, clean print-ready chibi illustration style.';

/**
 * Build a filled image-model prompt for a style (worker main-path spirit, simplified).
 * Splits prompt rules between 'pet' (animal breed/coat/accessories) and 'kids' (facial likeness/chibi ratio/festive kids attire).
 * @param {{ styleId: string, category?: 'pet'|'kids', greeting?: string, message?: string, tweak?: string }} opts
 * @returns {string}
 */
export function buildPacketPrompt({ styleId, category, greeting = '', message = '', tweak = '' } = {}) {
  const style = STYLE_BY_ID[styleId] || STYLES[0];
  const resolvedCategory = category || style.category || 'pet';
  const isKids = resolvedCategory === 'kids';
  const g = String(greeting || '').trim() || '恭喜發財';
  const msg = String(message || '').trim();
  const tw = String(tweak || '').trim();

  const lines = [
    'Create one finished full-bleed Lunar New Year red-envelope (利是封) FRONT artwork, portrait 3.5×6.75 inch (API aspect 2:3), ready for flat printing. No envelope mockup, folds, frames, cut marks or watermarks.',
    '',
    `TARGET AUDIENCE MODE: ${isKids ? 'KIDS & FAMILY (小朋友／親子 Q版專區 — focus on child facial likeness, cute chibi head-to-body proportions, and festive New Year kids clothing)' : 'PETS & ANIMALS (小動物／毛孩專區 — focus on exact animal species, breed, coat color/markings, and festive pet accessories)'}.`,
    '',
    'REFERENCE PRIORITY: the uploaded identities and count are fixed; the chosen greeting content overrides reference wording. Image 1 sets visual medium, composition and lettering treatment. Style descriptions explain how to execute that look, never permission to copy template species or invent a new scene. Where a description differs from the visible original, follow the original, subject to these constraints and the no-white-backdrop requirement.',
    '',
    HARD_BACKGROUND,
    '',
    'PRIMARY TASK: reinterpret the complete ORIGINAL artwork in Image 1, using it as the visual master. The finished subject must look drawn, painted or modeled by that same artist inside that artwork. This is a unified artwork, not a photo collage. Image 2 (and optional further images) are likeness references to redraw, never rectangular image layers to paste. Remove all source-photo backgrounds, straight crop edges, screenshot UI; continue the approved scenery naturally up to each subject silhouette.',
    '',
    'Image 1 = STYLE TEMPLATE (visual master): lock layout, ornaments, colors, lighting and overall composition. Do NOT invent a new scene from scratch.',
    isKids
      ? 'Image 2+ = SUBJECT IDENTITY only (child / baby / family member). Keep facial features, hairstyle and expression faithful in cute chibi proportions; never copy the template character identity.'
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
    `SCENE, PALETTE AND MATERIAL: ${style.scene}`,
    `SUBJECT INTEGRATION: ${style.subject}`,
    `STYLE-SPECIFIC DEFECTS TO AVOID: ${style.avoid}`,
    '',
    `GREETING TEXT (mandatory): Render EXACTLY this Traditional Chinese greeting once: "${g}". In the UPPER reserved calligraphy area of the template (classic HK laisee top plaque — never the bottom), REPLACE any baked-in sample greeting calligraphy already on Image 1. Do not leave the old template text visible; fully overwrite it. Match brush treatment from Image 1 and this LETTERING brief.`,
    `LETTERING ART DIRECTION (${style.profileKey || style.id}): ${style.lettering}`,
    'CHINESE GLYPH QUALITY: complete Traditional Chinese forms only — no Simplified substitutions, invented radicals, fuzzy gold glow or thick outline rescue. Remove all original template wording so only this greeting remains once. No spring-couplet parchment plate unless Image 1 already has one; keep brush calligraphy floating on the design.',
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
