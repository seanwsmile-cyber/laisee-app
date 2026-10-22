# e-print AI 利是封 — 做圖 Prompt 一覽

> 來源：`/workspace/red-packet/server/` 實際程式碼（verbatim）。
> 模型：OpenRouter `bytedance-seed/seedream-5-0-lite`（`https://openrouter.ai/api/v1/images`）

## 簡短說明

- **API**：`POST https://openrouter.ai/api/v1/images`，`model: bytedance-seed/seedream-5-0-lite`
- **兩條主路徑**（見 `worker.js` ~L119）：
  1. **主路徑 A：目錄款式／樣式** — `style !== 'simple'` 或非自選相片風格時，組裝一大段 `prompt` 陣列（含 `styleBrief`、`letteringBrief`、賀詞 brief、特殊修復 brief 等）。
  2. **主路徑 B：自選相片風格** — 當 `style === 'simple' && photoRenderStyle !== undefined && !removeSubject && !backgroundOnly` 時，改呼叫 `buildPhotoStylePrompt(...)`（`photo-style-prompts.js`）。
- 另有 **removeSubject** 分支：只刪前景主體、重建背景，不走完整做圖。

---

## 主路徑 A：目錄款式／樣式

條件：非「simple + photoRenderStyle」自選相片路徑；且非 `removeSubject`。

### removeSubject 分支（簡述）

當 `removeSubject` 為真時，prompt 為以下字串以換行接合（verbatim）：

```
Edit Image 1, an existing red-envelope FRONT illustration. Remove all main foreground people, pets, animals and their worn costumes completely.
Seamlessly reconstruct the environment hidden behind those subjects, continuing nearby scenery, textures, lighting and decorative patterns.
Remove ALL existing greetings, Chinese characters, calligraphy, letters, numbers, logos and watermarks. Seamlessly fill their former areas with the surrounding background. Keep the existing background composition, palette, decorative flowers and lanterns unchanged as closely as possible. Do not introduce any new subjects or lettering.
Return only the flat full-bleed edited FRONT, same framing and portrait proportion 89:172. No transparency, blank holes, mockups, borders, folds or diecut lines.
NO WHITE BACKDROP: reconstruct colored scene content across every removed area, including all four edges. Never fill removals with white paper, near-white empty patches or a rectangular photo mat. Preserve intentional white flowers, snow, clothing and decorative details as objects, not a background fill.
BACKGROUND RESTORATION MATERIAL (${style}): ${styleBrief(style,{backgroundOnly:true})} Apply this only to reconstructing the existing scene; do not add a focal animal, person or greeting from the reference.
There is no back artwork in this input. The application preserves the original back separately; do not generate or change a back.
```

### 完整組裝模板（主陣列，`.filter(Boolean).join('\n')`）

以下為 `worker.js` L129–180 主陣列各行（含條件式說明）。佔位符如 `${style}`、`${greetingText}`、`Image N`、`${identityReferences}` 等依執行時變數填入；條件為假時該行會被 `filter(Boolean)` 去掉。

```
[condition: always]
Create one finished full-bleed Lunar New Year red-envelope FRONT artwork, portrait ratio 89:172, ready for flat printing. No envelope mockup, folds, frames or cut marks.

[condition: if identityFirst (hasOriginal||hasTemplate) && !backgroundOnly && !removeSubject && hasStyleRepair(style)]
${identityFirst ? styleRepairBrief(style,{originalIndex,hasTemplate,hasOriginal}) : ''}

[condition: if !backgroundOnly]
${!backgroundOnly ? peopleSeriesBrief(style) : ''}

[condition: always]
REFERENCE PRIORITY: ${backgroundOnly ? 'background-only mode means no foreground subjects, even if they appear in the original reference; ' : 'the uploaded identities and count are fixed; '}the chosen greeting content and exact Step 3 subject/glyph geometry override reference placement. The original sets visual medium and lettering treatment; the clean background sets scenery. Style descriptions explain how to execute that look, never permission to add missing motifs, copy template species or override user positions. Where a description differs from the visible original, follow the original, subject to these constraints and the no-white-backdrop requirement.

[condition: if style === 'custom' && !backgroundOnly && !removeSubject]
CUSTOM STYLE SUBJECT LOCK: the uploaded style reference must never become the finished protagonist. Redraw ${identityReferences} as the sole foreground subject(s)—preserve species, breed, markings, face shape, body type and recognizable pose cues from the upload. Discard the style reference's depicted animal/person identity, pose silhouette, collar, costume character and face even when that reference is a finished red-packet sample. Style reference = look only; user photo = who appears.

[condition: always]
HARD BACKGROUND REQUIREMENT: NO WHITE BACKDROP. Extend the selected colored scenery or pattern behind the entire subject and to all four canvas edges. Remove the entire source-photo backdrop, including white/near-white fields, corners and gaps between limbs, hair, wings and clothing. No rectangular photo insert, white mat, border, sticker halo, flat white patch or transparent hole. Where the original uses pale paper, retain its motifs on a visibly tinted gold, peach, sage or blue field harmonizing with that design, never blank white or near-white. White fur and intentional white costume details are allowed; so are actual white petals and snow details, but never treat them as permission for a white studio background. This requirement overrides pale-background wording in references and revisions.

[condition: if originalIndex && !backgroundOnly]
PRIMARY TASK: reinterpret the complete ORIGINAL artwork in Image ${originalIndex}, using it as the visual master. The finished subject must look drawn, painted or modeled by that same artist inside that artwork. This is a unified artwork, not a photo collage. ${identityReferences} ${hasSecondary ? 'are likeness references' : 'is a likeness reference'} to redraw, never rectangular image layers to paste. Remove all source-photo backgrounds, straight crop edges, screenshot UI, arrows and mouse cursors; continue the approved scenery naturally up to each subject silhouette. The subject placement box is invisible guidance, not a rectangular photo window.

[condition: if !backgroundOnly]
SUBJECT IDENTITY AND COUNT — highest priority above template characters and style-specific pose shorthand: inspect ${identityReferences} and preserve every clearly intended foreground subject, including one person, two people, any animal species, several pets or a person with an animal. ${hasSecondary ? 'The intended count is the total foreground subjects across BOTH photos, not automatically two: each photo may contain a person, animal or entire family/group. Preserve one distinct role/group per source photo; never omit either source group, blend faces between photos or use one photo as an alternate angle of the other.' : ''} Exclude incidental distant bystanders, posters and background objects. Keep the exact intended subject count: no missing subject, duplicate, merged face or blended identity. For two people preserve each individual face, age appearance, hairstyle, skin tone and distinguishing features separately, with their relative left/right order${hasSecondary ? ' within each source group' : ''}. Do not turn people into animals. For each animal preserve its actual species, breed when recognizable, muzzle/beak, ears, eye shape, coat/feathers/scales, markings and distinctive anatomy. A bird keeps wings and a beak, a rabbit its ears, a reptile its scales; never add feline features or universal paws. Do not infer species from the style name or original template animal. Stylize these identities in the selected medium without replacing them with a generic mascot.

[condition: if !backgroundOnly]
GROUP AND ANATOMY ADAPTATION: ${hasSecondary ? 'all uploaded foreground subjects form the complete composition inside the approved group area, with each source photo keeping its separate assigned role and placement below' : 'all uploaded foreground subjects share the approved subject box as one group'}. Fit them together with visible separate faces and natural spacing, reducing their scale proportionately instead of dropping or duplicating anyone. Keep their individual identities and relative order; do not force two people into a single figure silhouette. Template pose, head/body ratio, costume and accessories are artistic references, subordinate to count and species. Adapt hands, paws, hooves, wings, fins and body stance to actual anatomy; use a natural supported pose when the original action is impossible. For people adapt a toy or animal costume into appropriate human festive clothing/headwear with faces visible. For other species adapt or omit unsuitable costume parts without adding limbs. Specific style wording such as paw, fur, seated figure or focal diner describes the template role, never a requirement to change the uploaded anatomy or number.

[condition: if !backgroundOnly]
FAMILY PHOTO: preserve all intended family members, including children and older adults, with their own recognizable faces, apparent ages and relative height relationships. Preserve original left/right order and front/back rows where practical${hasSecondary ? ' within each photo group; keep the two photo groups in their assigned first/left and second/right roles' : ''}. When a narrow subject area cannot fit full bodies clearly, use a compact waist-up group portrait with gently staggered rows inside the approved area, prioritizing distinct unobstructed faces over copying the template solo pose. Do not remove a family member to make space, merge faces, repeat the same face, add strangers or hide faces behind costume, lanterns or lettering. Keep the greeting at its approved coordinates; adjust the group pose within its own box instead. Do not invent facial details for a person whose face is obscured in the source.

[condition: if originalIndex && !backgroundOnly]
STYLE-LOCKED CHARACTER REPLACEMENT: Image ${originalIndex} is the master for rendering technique, composition, ${identityFirst ? 'accessories and lighting. The AUDIT REPAIR defines the replacement pose and natural age-appropriate body proportions; never inherit toy or animal anatomy' : 'pose, head-to-body proportions, accessories and lighting'}. Keep that artwork's visual language throughout. ${identityReferences} ${hasSecondary ? 'supply' : 'supplies'} identity cues ONLY, including SPECIES and breed-specific anatomy. Never copy any source-photo background or photographic rendering into a stylized design. Preserve each subject's characteristic muzzle, ears, eye shape, facial markings and tail while adapting the pose and body stylization. Identity takes priority over the original animal anatomy: a dog remains a dog, never a kitten; a cat remains a cat; a person remains human. ${identityFirst ? 'Use the repaired style rendering defined above consistently across the whole figure; template toy proportions never override natural facial identity or human anatomy.' : 'If the master is a 3D toy, chibi character, painting or paper illustration, render the replacement in exactly that same medium.'}

[condition: always (ternary on backgroundOnly)]
[backgroundOnly branch] Create a background-only design with the requested greeting. Do not add any people or animals; Image 1 is the clean background, not an identity reference.
[else] ${identityReferences} ${hasSecondary ? 'are the ONLY identity references for all intended subjects; the original design, cleaned background, lettering guide and previous artwork are never identity sources' : 'is the ONLY identity reference for the main person or pet'}. Transfer recognizable facial markings, breed, colors and distinctive features into the original design characters. Adapt eyes, head and body to the ORIGINAL design proportions; do not force photorealism to preserve identity. Remove every source photo background completely, including white areas between limbs and around fur. Do not paste a rectangular photo or a white cutout halo into the artwork. Use coherent anatomy within the selected stylization.

[condition: template Image 2 branch]
[style==='simple'] (empty)
[hasTemplate && backgroundOnly] Image 2 is the approved background. Preserve its scenery and decorations; ${greetingText ? 'add only the requested greeting' : 'draw no lettering'}, no people or animals.
[hasTemplate && preserveTemplateBackground===true] Image 2 is the APPROVED BACKGROUND, with its previous subject already removed. It controls scenery, framing, palette and decorations only. ${identityFirst ? 'The AUDIT REPAIR controls character pose, proportions and unified rendering; this clean scene supplies no character anatomy.' : 'It does not override the ORIGINAL design character style, pose or proportions.'} Replace the removed character with ${hasSecondary ? `all intended subjects from ${identityReferences}, each in their assigned role and area` : 'a newly rendered character carrying Image 1 identity'}, in the ORIGINAL design style. Do not paste the photographed subjects into this scene. The application preserves the back separately.
[hasTemplate && style==='custom'] Image 2 is a STYLE-ONLY reference for medium, palette, decorative motifs, lighting and lettering brush—never for subject identity. Do NOT copy, trace or restore any person, animal, face, breed, pose, collar, costume species or mascot shown in Image 2. ${identityReferences} supply the only subject identity and natural pose to redraw in that style; keep Step 3 subject geometry. Borrow festive clothing/headwear treatment only when it fits the uploaded anatomy. Replace any reference wording with the requested greeting. Remove logos and watermarks.
[hasTemplate else] Image 2 is the DESIGN AND ART STYLE reference. Closely preserve its composition of background motifs, illustration technique, palette and lighting. Place and scale the uploaded subjects using the approved Step 3 geometry; adapt the original pose and costume to their actual species and count. Transfer appropriate clothing, headwear, embroidery and accessories without copying template faces or breeds. Make only minimal local background adjustments for the reserved greeting area. Replace the reference wording with the requested greeting while preserving its lettering style. Remove logos and watermarks.
[!hasTemplate] (empty)

[condition: if !backgroundOnly]
If the subject is human, keep them fully clothed in modest festive clothing; NO shirtless people or nudity. For pets, identity preservation does not mean preserving an unclothed torso: when the reference wears a costume, dress the pet in that costume, adapted to its anatomy, while keeping its face recognizable.

[condition: if !backgroundOnly && style === 'horse']
MANDATORY LION-DANCE COSTUME for both cats and dogs: a detailed lion-dance headdress framing the visible face, plus an iridescent embroidered festive jacket covering shoulders and chest, with matching ribbons and gold trim. A bare-fur chest or a collar alone is not acceptable. Preserve the reference costume detail within the user-approved Step 3 subject area; do not move or enlarge the portrait to imitate the original framing.

[condition: always]
STYLE-SPECIFIC ART DIRECTION (${style}): ${styleBrief(style,{backgroundOnly})}${identityFirst ? ' The AUDIT REPAIR above supersedes any conflicting pose, body ratio or rendering shorthand in this profile; preserve this profile’s scene motifs.' : ''}

[condition: if originalIndex]
[backgroundOnly] Image ${originalIndex} is the ORIGINAL DESIGN AND LETTERING reference for scenery, material and palette${greetingText ? ', plus the requested greeting brush treatment' : ' only; ignore all original lettering'}. Never restore its people, animals or costumes. Keep the approved background clear of foreground subjects.
[!backgroundOnly] Image ${originalIndex} is the ORIGINAL DESIGN AND LETTERING reference. Match its visual medium, lighting, costume detail and rendering quality. Adapt pose and body proportions to the uploaded identities and count; user-approved subject geometry overrides original scale and framing. ${greetingText ? (fillColor ? 'Match its calligraphic stroke treatment, brush texture, character proportions and finish only; do NOT copy its ink or gold lettering color—the user-selected fill below is mandatory.' : 'Match its calligraphic stroke treatment, brush texture, character proportions, ink/gold color and finish.') : 'Remove its original wording; draw no lettering.'} ${hasTemplate && hasOriginal ? "When Image 2 is cleaned, recover the character's original visual treatment from this image." : 'Use this image for the original visual treatment, never as a source of subject identities.'} Replace the reference animal identity with the species, breed, facial structure, markings and colors from ${identityReferences}; costume is transferable, species is not. ${hasSecondary ? 'Never retain or add template people or animals; only the two source photos supply subject identities. ' : ''}User subject and greeting coordinates override original placement.

[condition: greeting ternary]
Render EXACTLY this Traditional Chinese greeting once: ${JSON.stringify(greetingText)}. Place it ${textArea}, arranged as ${letteringLayout}. Preserve every character in the supplied order, with no substitutions, omissions or duplicated words.
[no greeting] No greeting was requested: remove existing words and draw no lettering.

[condition: always (empty if no text)]
${traditionalGreetingBrief(greetingText)}

[condition: if greetingText]
${greetingText ? compactGreetingBrief(layout.glyphs,dir,greetingNudgeX) : ''}

[condition: if greetingText]
${greetingText ? greetingAlignmentBrief(layout.glyphs,greetingNudgeX) : ''}

[condition: if greetingText]
EXACT STEP 3 LETTER POSITIONS: coordinates are relative to the final FRONT, origin at top-left, x rightward, y downward. ${exactLettering}. Match each glyph center and size independently. Boxes define the intended visible letter scale, not merely a maximum area in which to place tiny text. Original lettering controls brush style only, never these positions or sizes. Do not regroup, reorder, recenter or improvise a triangular cluster.

[condition: if greetingText]
VISIBLE LETTER SIZE AND SPACING: make the greeting large and prominent at its approved centers. The visible ink of each normal square Chinese character should occupy 90-100% of its glyph-box height, with natural calligraphic width and no extra inset padding. For naturally flat characters, apply this target to their width and retain correct proportions; never distort their anatomy to fill a square. Scale the whole glyph uniformly, including its strokes, rather than simply making a small glyph bolder. Preserve the existing center-to-center distances so larger letters leave tighter clear gaps; do not spread the row across a wider area, add tracking, shrink letters for decorative breathing room or borrow the original reference lettering size. Keep every stroke inside its own box and neighboring characters separate. The original still supplies the brush treatment, not the website font.

[condition: if greetingText]
LETTERING ART DIRECTION (${style}): ${letteringBrief(style)} If the original has legible Chinese lettering, retain its brush treatment and finish${fillColor ? ', but ignore its ink/gold color—use the USER-SELECTED LETTERING COLOR instead' : ''}; use this direction when lettering is absent or unreadable. Correct Traditional Chinese anatomy, the chosen text and the exact per-glyph boxes always override ornamental flourishes.

[condition: if greetingText && fillColor]
USER-SELECTED LETTERING COLOR (MANDATORY): paint every greeting stroke in solid ${fillColor} only. This exact hex fill overrides every competing instruction—original reference ink/gold, style lettering brief, sample typography color and any gold default. Do not render warm-gold, butter-gold or metallic gold when this color is set; keep brush treatment and texture, change only the fill.

[condition: if greetingText && onBanner]
SPRING-COUPLET BANNER PLATE: At the exact Step 3 letter positions, paint an illustrated cream/beige parchment 春聯／直幅條幅 (spring-couplet scroll) sized tightly to the greeting glyphs with modest margins. Write every character ON that parchment plate—not floating alone on the festive scene. A thin dark reddish-brown border is OK; an optional subtle hanging string at the top is fine. Festive scenery (lanterns, firecrackers, soft bokeh) may remain around the banner. Do not cover the main subject face. This is an integrated illustrated couplet plate in the artwork, not a flat opaque UI chip, white label sticker, or blank solid rectangle pasted on top.

[condition: if greetingText && !onBanner]
No spring-couplet parchment plate: keep brush calligraphy floating on the design without adding a banner, scroll, or text panel behind the letters.

[condition: if greetingText]
CHINESE GLYPH QUALITY: exactly ${Array.from(greetingText).length} complete characters, in the supplied sequence ${Array.from(greetingText).map(...)}. Copy the requested Traditional Chinese forms exactly: no Simplified substitutions, invented radicals, missing dots, duplicate strokes, merged characters, mirror writing or rotated glyphs. Keep each character upright with a balanced visual center inside its assigned glyph box. Brush tips may taper but primary strokes must stay solid, sharp and printable; preserve open counters and consistent visual weight. No extreme cursive shorthand, fuzzy gold glow, glitter noise, inflated 3D bevels or clipping. ${onBanner ? 'Contrast comes from the cream parchment couplet plate behind the letters; keep only a thin couplet border—do not add a separate white UI label or thick outline.' : 'For busy scenery reduce competing detail locally using the SAME background color and texture; never add a white label, solid rectangular text panel or a thick outline to rescue contrast.'} Remove all original template wording so only this greeting remains once.

[condition: if hasGuide]
Image ${guideIndex} is a LETTER POSITION GUIDE, a geometry-only diagram on a plain neutral field. Numbered boxes correspond to Character 1, Character 2, etc. in EXACT STEP 3 LETTER POSITIONS; each cross marks that character's center. Use only box locations, sizes and spacing, never their numbers, crosses, outlines or neutral field as artwork. This guide supplies NO font, ink color, stroke weight or brush treatment. If a cached older guide contains Chinese glyphs, ignore their shapes and use only their locations. Draw the requested Chinese character in each numbered area, never the index number.

[condition: if greetingText]
LETTERING SOURCE PRIORITY: the user's greeting supplies the exact characters; STEP 3 coordinates${hasGuide ? ` and Image ${guideIndex}` : ''} supply placement and nominal size only; ${originalIndex ? `the legible lettering in the ORIGINAL reference Image ${originalIndex}` : 'the style-specific lettering art direction'} supplies the final brush style. The website font is a POSITION GUIDE ONLY. Redraw the requested text with that clear, refined calligraphic treatment, natural thick-to-thin strokes, tapered ends and open readable inner spaces. Do not trace or imitate the website positioning font, its heavy preview weight, jagged raster edges, stroke outline or text box. A different word or row arrangement in the original must not change the chosen greeting or its approved positions. If the original lettering is absent or unreadable, use the style-specific lettering art direction, never the preview font.

[condition: always]
Draw no extra words, logos, watermarks, numbers or placeholder marks beyond the exact requested greeting.

[condition: always]
Use the selected design palette, clear print-friendly edges and depth. Extend the scene continuously to all four edges: no white canvas, white margins, blank panels, transparent holes or photo-background remnants. A calm greeting area must retain the scene color and texture, not become a white box. White fur and intentional white costume details are allowed.

[condition: if previousImage]
Image ${previousIndex} is the PREVIOUS GENERATED ARTWORK. Preserve only details consistent with the selected design and the user revision. ${backgroundOnly ? 'Remove any foreground subjects and correct white background remnants and composition drift' : 'Correct missing costume, white background remnants and composition drift'}; these are defects, not details to preserve. ${greetingText ? 'Replace its old lettering with the current requested greeting in the ORIGINAL reference lettering style.' : 'Remove its old lettering and draw no new words.'}

[condition: if !backgroundOnly && subjectPlacement]
USER-APPROVED SUBJECT PLACEMENT, measured on the FRONT only: left ${subjectPlacement.x}%, top ${subjectPlacement.y}%, width ${subjectPlacement.width}%, height ${subjectPlacement.height}%. Fit the complete intended subject or entire multi-subject group, including costumes, within this area, ${identityFirst ? 'using the AUDIT REPAIR pose and natural age-appropriate anatomy' : 'adapting the ORIGINAL design body stylization and pose'} while preserving each uploaded identity and species. Its center is ${subjectPlacement.x + subjectPlacement.width / 2}% from the left and ${subjectPlacement.y + subjectPlacement.height / 2}% from the top. ${identityFirst ? 'Fit the repaired figure proportionately; do not stretch it, enlarge the face, copy template toy proportions or exceed the box.' : 'Do not stretch, enlarge or replace a short stylized character with a tall realistic animal to fill this box.'} Keep this placement even when the background has no subject or the previous artwork placed it elsewhere. Do not automatically recenter the subject. These coordinates describe the subject, not the greeting; do not draw a box or translucent photo overlay.

[condition: if hasSecondary]
TWO-PHOTO IDENTITY ROLES: Photo 1 (Image 1) supplies the first/left subject or entire group; Photo 2 (Image ${secondaryIndex}) supplies the second/right subject or entire group. Keep each photo's intended subjects separate and recognizable; never swap the two groups, merge their faces, drop either group or add template subjects. ${subjectPlacements ? ... : 'No individual boxes were supplied: arrange Photo 1 in the left role and Photo 2 in the right role within the approved group subject box, or the subject area of the selected composition when no group box is supplied.'} The individual boxes control each source group's placement; the overall subject box is their group area. Preserve relative order within each photo group and use compact rows when needed to keep every face visible. These subject roles never change the exact Step 3 greeting coordinates or sizes; do not draw the boxes, photo backgrounds or a photo collage.

[condition: if refinementText]
User revision (within the subject-identity, exact-greeting and no-white-backdrop requirements): ${refinementText}. The supplied greeting remains the exact text content; lettering style follows the ORIGINAL design reference.

[condition: if !backgroundOnly]
${peopleCartoonBrief(style)}

[condition: if !backgroundOnly]
${lionAnatomyBrief(style)}

[condition: always]
FINAL IMAGE CHECK BEFORE RETURNING: ${greetingText ? 'verify every requested character has complete correct strokes, matches its own approved center and visible-ink size, and has not been reduced to small widely spaced text; ' : 'verify there are no letters; '}${backgroundOnly ? 'verify no foreground people or animals remain; ' : 'verify every intended subject retains its identity and has no straight photo-crop edge, white backdrop or pasted-photo panel; '}verify colored artwork reaches every edge. Correct these defects in the same image before returning it.

```

`styleBrief(style)` 輸出格式：

```
SCENE, PALETTE AND MATERIAL: ${profile.scene}
SUBJECT INTEGRATION: ${profile.subject}   // omitted if backgroundOnly
STYLE-SPECIFIC DEFECTS TO AVOID: ${profile.avoid}
```

`letteringBrief(style)` = 該款式 `STYLE_PROFILES[style].lettering`。

`letteringLayout`（依 `dir`）：
- `vertical` → `one vertical column, top to bottom`
- `double` / `stagger` → `two staggered columns: characters 1,3,5 in the LEFT column and 2,4,6 in the RIGHT column; right column shifted downward; read in input order across each pair. Follow the exact per-character centers and sizes below; keep each glyph within its own box so neighboring strokes never touch. Do not collapse the columns into a triangular cluster or an aligned 2-by-2 square`
- else → `one horizontal row, left to right`

---

## 主路徑 B：自選相片風格

條件：`style === 'simple' && photoRenderStyle !== undefined && !removeSubject && !backgroundOnly`。
函式：`buildPhotoStylePrompt`（`photo-style-prompts.js`）。

### 三種 media（renderStyle）

#### `natural`

```
NATURAL REALISM: preserve realistic facial structure, age, expression, skin texture, animal anatomy and individual markings. Use natural lighting and believable materials. No beauty filters, skin whitening, plastic skin, enlarged doll eyes or generic idealized faces.
```

#### `cartoon`

```
FLAT HAND-DRAWN CARTOON: use confident organic ink contours, deliberate flat color shapes and restrained two-tone cel shading. Simplify detail deliberately while keeping each individual recognizable. Draw both subject and environment in the same medium. No glossy 3D, plastic toys, airbrushed semi-realistic portraits, beauty-filter faces, photorealistic skin or generic big-eyed mascots. Preserve characteristic facial proportions, hairstyles, muzzle shape, ears and distinctive markings.
```

#### `watercolor`

```
HAND-PAINTED WATERCOLOR: use layered translucent colored washes, visible brush variation, subtle pigment blooms and warm paper grain. Keep faces, eyes and distinctive markings readable with controlled ink accents. Paint the subject and environment together, with continuous colored washes reaching all edges. No white paper border, blank white backdrop, muddy faces, photographic cutouts, glossy 3D or airbrushed beauty-filter portraits.
```

### `buildPhotoStylePrompt` 完整輸出模板

各行以換行接合（條件為假則省略）。verbatim 自 `photo-style-prompts.js`：

```
[if greeting] ${greetingAlignmentBrief(glyphs,nudge)}
Create one finished full-bleed red-envelope FRONT, upright portrait ratio 89:172. Return only flat artwork: no envelope mockup, folds, cutting guides, frames, borders, UI, mouse cursor or inset photo.
USER-SELECTED MEDIUM: ${media[renderStyle]}

[if background==='original']
PRESERVE ORIGINAL PHOTO SETTING: Image 1 is BOTH the identity and environment reference. Retain its recognizable scenery, important objects, relative placement, perspective and palette. Reinterpret that SAME scene and every intended subject together in the selected drawing medium. Do not replace the environment with a red studio backdrop, lantern street, underwater scene or unrelated festival setting. Extend the source scene naturally only where needed to fill the portrait crop. Preserve clothing, poses and real accessories; do not invent festive costumes.
[else festive]
FESTIVE BACKGROUND: Image 1 supplies subject identities, NOT the setting. Remove its source backdrop and replace it with a continuous warm festive-red field, subtle tonal depth and restrained gold decorative accents near the edges. Keep clear colored space behind the greeting. Integrate subjects naturally with matching illumination and the selected medium. No white rectangles, source-background remnants, sticker outlines or cutout halos.

IDENTITY AND COUNT: preserve every intended foreground person and animal. One person, two people, any animal species, several pets and family groups are supported. Keep each recognizable face, age, hairstyle, skin tone, breed, muzzle/beak, ears, coat/feathers/scales and distinctive markings. Keep relative order and individual height relationships; children and older adults retain their ages. No omitted or duplicated subjects, merged faces, changed species, generic mascot substitutions or extra companions. Keep clear separate faces and anatomically coherent hands, paws, wings, fins and limbs. Preserve the source pose where possible; use compact rows when needed to fit a family without hiding faces.

[if hasSecondary]
Image ${secondaryIndex} supplies a second subject/group. Preserve ALL intended subjects across both photos, first group left and second group right, without mixing identities. Image 1 supplies the setting when original-background mode is selected.

NO WHITE BACKDROP: color and scene texture must reach all four edges and continue through gaps between limbs and hair. For original-background mode preserve the actual scenery and objects, but tint blank white studio fields to a warm pale color consistent with that scene. White fur, clothing, petals, foam and snow remain intentional objects; never add blank white margins, paper mats or transparent holes.

[if subjectPlacement]
Keep the intended subject/group within the approved front region: left ${subjectPlacement.x}%, top ${subjectPlacement.y}%, width ${subjectPlacement.width}%, height ${subjectPlacement.height}%. This is a placement limit, not a visible box or an instruction to stretch the figure. Preserve comfortable separation from the greeting.

[if greeting]
LETTERING: write exactly ${JSON.stringify(greeting)}, exactly ${[...greeting].length} complete Traditional Chinese characters, with no extras. ${positions} These coordinates control position and size only. Use refined ${color ? `brush calligraphy in solid ${color}` : 'warm-gold brush calligraphy'} with clear radicals, balanced strokes, readable counters and complete dots. Keep the characters large and compact without touching or drifting from their centers. Do not imitate the website's preview font. Preserve original character order.${color ? ` USER-SELECTED LETTERING COLOR: paint every greeting stroke in solid ${color}; this exact fill overrides default gold.` : ''}${onBanner ? ' SPRING-COUPLET BANNER PLATE: paint an illustrated cream/beige parchment 春聯／直幅條幅 tightly behind these glyphs (sized to the lettering boxes, not elongated past them); write the characters ON that plate (thin dark border OK); festive scenery may remain around it; do not cover the subject face; not a flat UI chip or white label.' : ' No spring-couplet parchment plate: keep the calligraphy floating on the design without a banner behind the letters.'}
[else] No greeting was requested. Draw no lettering.

[if greeting] ${traditionalGreetingBrief(greeting)}
[if greeting] ${compactGreetingBrief(glyphs,dir,nudge)}
[if hasGuide] Image ${guideIndex} is a LETTER POSITION GUIDE only. Its numbered boxes correspond to the exact character sequence above; never draw the boxes or numbers and do not copy its font. It is not a scenery or identity reference.
[if previousImage] Image ${previousIndex} is previous artwork for revision only. Current background choice, selected drawing medium, uploaded identities and exact greeting override that previous version.
[if refinement] User refinement within these requirements: ${refinement}
FINAL CHECK: all intended subjects remain recognizable; the selected environment and medium agree throughout; every requested Traditional character is correct and in its approved position; colored artwork reaches every edge. Do not repeat existing source-photo lettering in addition to the requested greeting.
```

---

## 各款式 STYLE_PROFILES

共 **65** 個 key（`style-prompts.js`）。欄位英文原文如下。

### `simple`

- **id**: `simple`
- **SCENE**: Use a continuous festive-red tonal field, with a subtle warm-red gradient and fine matte print texture. Keep the background visually quiet and evenly colored through every silhouette gap and to all four edges. Use soft diffuse illumination with restrained warm highlights; do not invent a room, landscape, floral arrangement or festival props.
- **SUBJECT**: Preserve the uploaded portrait's natural facial structure, expression, skin, fur, feathers or scales with clean softly blended contours. Retain recognizable clothing and markings; remove the source setting completely. For two people or a family, keep separate unobstructed faces and original relative order in a compact portrait. Use Step 3 positions and scale; match light across the group without whitening skin, changing age or replacing identities with mascots.
- **LETTERING**: Use clear warm-gold regular-script brushwork with natural tapered ends, moderate stroke weight and open counters on red; favor readable handwritten character structure over rigid block type.
- **AVOID**: No white or cream backdrop, rectangular photo insert, cutout halo, new lanterns, buildings, branches, unwanted figures, beauty-filter faces or decorative clutter.

### `horse`

- **id**: `horse`
- **SCENE**: Preserve the dark warm festival setting, softly focused traditional red-and-gold architecture toward the side, hanging red lanterns and sweeping arcs of golden light. Keep small sparks and amber bokeh subordinate to the main art. Use luminous warm rim light and rich shadows with detailed, softly modeled surfaces; maintain colored scenery behind the whole portrait and through every gap.
- **SUBJECT**: Recreate the original elaborate white-trimmed lion-dance headdress and iridescent embroidered red, turquoise and gold jacket, with fabric ribbons and visible stitching. Each uploaded identity keeps its own face, species, markings and natural anatomy. Adapt headwear around ears or hair without covering eyes or muzzles; adapt festive clothing for people and unusual animals. For a pair or family, use a compact group with individually fitted costumes and separate faces inside Step 3 placement, prioritizing identity over the original solo pose.
- **LETTERING**: Match the original clear metallic-gold brush calligraphy: confident thick-to-thin strokes, tapered ends, balanced radicals and open counters; keep gold texture subtle and edges crisp, without glowing blur or thick outline.
- **AVOID**: No generic mascot, bare replacement where the reference wears a costume, fused headdress and face, photographic rectangle, white studio backdrop, oversized spark trails across faces or imposed template dog anatomy.

### `peony`

- **id**: `peony`
- **SCENE**: Keep a richly colored crimson field with layered red, cream and pale-gold peonies and chrysanthemums, precisely veined blue-green leaves and slender gold botanical contours. Follow the original dense floral framing and quieter red area, retaining painted petal shading, delicate linework and a refined printed surface. Preserve colored red gaps rather than opening blank white space.
- **SUBJECT**: Integrate uploaded identities with softly painted portrait detail matching the original fine fur and floral illustration. Retain recognizable faces and actual species, including natural skin or feathers for non-dog subjects. Match warm highlights and soft shading; allow leaves to overlap lower contours while all faces stay unobstructed. For two people or a family, fit a coherent group at the approved Step 3 scale without replacing the entire floral border or copying the original solo dog.
- **LETTERING**: Use the original clear antique-gold Chinese brushwork with restrained dry-brush texture, solid main strokes and naturally tapered terminals; preserve readable counters and distinct strokes over red without copying the original word arrangement.
- **AVOID**: No flower-to-face substitutions, pasted photographs, white panels, unrequested animals, glossy plastic flowers, busy veins crossing eyes or thin gold text disappearing into flower contours.

### `cat`

- **id**: `cat`
- **SCENE**: Recreate the illustrated winter roof under a clear powder-blue sky, orange persimmons on dark snow-dusted branches entering from the upper right, and green glazed roof tiles running diagonally above a warm terracotta wall. Keep irregular snow caps, small drifting flakes, circular tile ends and gold roof details. Use warm hand-painted outlines with cool daylight and gentle texture; snow remains a depicted object against visibly blue sky.
- **SUBJECT**: Render the uploaded identities in the same softly painted storybook medium, keeping actual species, facial structure and individual markings. Adapt the walking or attentive rooftop pose to natural anatomy and the approved Step 3 area, with convincing contact and shared lighting. A person remains human; a bird keeps wings and beak. Fit a pair or family into a compact group with visible faces instead of stretching them into the template animal silhouette.
- **LETTERING**: Follow the original butter-gold upright brush lettering, gently varied stroke width and clean flowing tips; use solid readable strokes against blue, keeping Step 3 arrangement independently of the original vertical word.
- **AVOID**: No copied dog or cat anatomy, white sky, photographic fur patch, melted roof geometry, duplicated persimmon clusters, branches through faces or cropped-off intended family members.

### `custom`

- **id**: `custom`
- **SCENE**: Read the uploaded style reference as the scene master: identify its dominant and accent colors, illustration or photographic medium, motif hierarchy, lighting direction, surface texture and depth. Preserve those visual relationships and decorative objects. Continue the approved scenery without importing motifs from another style. If the reference paper is white, use a visibly tinted hue harmonizing with its palette while retaining the motifs.
- **SUBJECT**: Redraw every intended uploaded identity from the user photo in the style-reference medium. Remove source-photo surroundings, screenshot marks and straight crop edges. Never copy the style reference's depicted person, animal, breed, face, pose, collar or mascot—even when that reference is a finished red-packet sample. Keep each uploaded face, species and marking recognizable; adapt festive clothing only when it fits the uploaded anatomy. For a couple or family, use coherent compact grouping with separate faces. Exact Step 3 subject scale and greeting positions override the reference's original placement.
- **LETTERING**: Use legible style-reference Chinese lettering solely for brush treatment, stroke contrast and finish; ignore its ink/gold color when the user selected a greeting color. If absent or unreadable, choose restrained regular-script brushwork matching the artwork with complete clear Traditional Chinese strokes.
- **AVOID**: No pasting or restoring the style-reference protagonist, arbitrary festival scenery, pasted source-photo boxes, white or transparent background, copied original wording, logos, template identities, guide marks or typography borrowed from the website preview.

### `sample_001`

- **id**: `sample_001`
- **SCENE**: Saturated magenta paper with pale-gold fish-scale details, curved cut-paper waves and corner flowers. Preserve the airy middle, uninterrupted fuchsia ink and fine printed grain.
- **SUBJECT**: Use a recognizable seated animal or compact human portrait in a warm ink-and-gouache print style, with simple cut-paper shadows and clearly outlined eyes. The dog example indicates the replacement area, never a compulsory species. User Step 3 scale and placement override sample pose; preserve one person, two people, any animal species or all recognizable family members without duplication or merged faces.
- **LETTERING**: Use the clear Traditional Chinese brush lettering visible in this revised original: complete radicals, solid readable strokes, open counters and natural tapered terminals. Copy its ink color and brush character, while following the exact user greeting and Step 3 coordinates and compact spacing. Never copy sample wording, add decorative pseudo-characters or substitute Simplified forms.
- **AVOID**: No white photo rectangle, cutout halo, leftover original subjects, generic replacement mascot, missing family member, changed background geometry, added unrelated props or illegible pseudo-Chinese. Keep the original medium consistent across the entire subject and scenery.

### `sample_002`

- **id**: `sample_002`
- **SCENE**: Golden-yellow repeating semicircular wave print with bold green diagonal corner ribbons, cobalt wave crests and gold outlines. Keep these geometric bands in their exact locations.
- **SUBJECT**: Two example animals stand side by side with clear, separate faces. Replace with the actual uploaded identities and count, preserving their relative order. Use warm colored-pencil outlines and simple matte shaded shapes; one subject uses the shared area, two source photos keep separate slots. User Step 3 scale and placement override sample pose; preserve one person, two people, any animal species or all recognizable family members without duplication or merged faces.
- **LETTERING**: Use the clear Traditional Chinese brush lettering visible in this revised original: complete radicals, solid readable strokes, open counters and natural tapered terminals. Copy its ink color and brush character, while following the exact user greeting and Step 3 coordinates and compact spacing. Never copy sample wording, add decorative pseudo-characters or substitute Simplified forms.
- **AVOID**: No white photo rectangle, cutout halo, leftover original subjects, generic replacement mascot, missing family member, changed background geometry, added unrelated props or illegible pseudo-Chinese. Keep the original medium consistent across the entire subject and scenery.

### `sample_003`

- **id**: `sample_003`
- **SCENE**: Keep a saturated festive-red printed field with a diagonal cascade of rectangular firecrackers, bright cyan, yellow, coral and green wrappers, and fine gold cords. Surround the cascade with small geometric flowers, starbursts and restrained gold speckles, leaving calm red space between decorations. Maintain crisp outlined shapes, subtle red paper texture and evenly lit flat poster color.
- **SUBJECT**: Illustrate every uploaded animal, person, couple or family with simplified outlines and compact color blocks, preserving separate identities. Meet irregular contours with continuous red; exact Step 3 positions and scale override the original.
- **LETTERING**: Prefer legible original typography; otherwise use warm-gold festive brush lettering with solid cores at Step 3 glyph positions.
- **AVOID**: No realistic courtyard, smoke clouds, debris, white backing or excessive decorative clutter.

### `sample_004`

- **id**: `sample_004`
- **SCENE**: Use a muted lavender textile field threaded with fine parallel vertical lines and large interwoven pink Chinese-knot ribbons. Preserve alternating over-and-under ribbon geometry, subtle mauve tonal panels, tiny hanging floral ornaments and restrained gold accents. Keep the surface flat and delicately printed, with measured spacing and a gentle woven texture rather than shiny dimensional satin.
- **SUBJECT**: Repaint every uploaded animal, person, couple or family with delicate flat contours and mauve-pink textile shading, preserving individual faces. Continue lavender through silhouette gaps; exact Step 3 positions and scale override the original.
- **LETTERING**: Use legible original typography first; fallback is deep-plum regular-script brush lettering, cleanly separated at Step 3 glyph positions.
- **AVOID**: No tangled knots, ribbon-shaped character strokes, white backing, glossy plastic or heavy outlines.

### `sample_005`

- **id**: `sample_005`
- **SCENE**: Preserve a visibly warm peach paper field with a calm open upper area, small salmon floral marks and a restrained thin antique-gold ornamental frame. Position the red patterned rice bowl and dotted rice mound low in the original design, with slender horizontal chopsticks beneath. Use simple printed shapes, fine decorative food detail and quiet paper grain under even warm light.
- **SUBJECT**: Illustrate every uploaded animal, person, couple or family with warm simplified shading and recognizable separate faces, clothing or markings. Blend contours into peach paper; exact Step 3 positions and scale override the original.
- **LETTERING**: Prefer readable original typography; otherwise use deep-vermilion traditional brush strokes with complete counters at Step 3 glyph positions.
- **AVOID**: No white backdrop, realistic kitchen, photographic food, shiny porcelain or low-contrast text.

### `sample_006`

- **id**: `sample_006`
- **SCENE**: Maintain a deep Chinese-red printed field with restrained concentric and geometric line textures, an ornate thin gold medallion and angular gold chopsticks. Keep the richly patterned blue porcelain noodle bowl low in frame, framed by cobalt-blue ornamental panels and fine curling wave borders. Use controlled red, cobalt, pink and antique-gold inks, flat decorative shading and crisp etched details.
- **SUBJECT**: Render every uploaded animal, person, couple or family in refined poster linework and warm printed shading, preserving distinct identities and species. Merge into red; exact Step 3 positions and scale override the original.
- **LETTERING**: Prioritize legible original type; fallback is readable antique-gold seal-inspired regular lettering at Step 3 glyph positions.
- **AVOID**: No archaic substitutions, white backing, realistic rooms, photographic noodles or excessive embossing.

### `sample_007`

- **id**: `sample_007`
- **SCENE**: Create a vintage Cantonese tea print on deep vermilion with subtle circular tonal ornaments and a narrow warm-gold vertical accent. Retain the black rounded teapot in the upper-left area, its suspended small cups, fine chopsticks and the bamboo dim-sum steamers clustered below. Use hand-painted printed shading, delicate bamboo bands and finely resolved food details within the tall restaurant composition.
- **SUBJECT**: Paint every uploaded animal, person, couple or family in warm vintage inks with distinct recognizable faces and natural anatomy. Integrate illustrated contact shadows and contours; exact Step 3 positions and scale override the original.
- **LETTERING**: Use readable original lettering first; otherwise choose warm pale-gold rounded brush characters at Step 3 glyph positions.
- **AVOID**: No photographic food, modern interiors, extra diners, white backing or muddy teapot silhouettes.

### `sample_008`

- **id**: `sample_008`
- **SCENE**: Preserve the stacked Hong Kong shopfront collage: a forest-green facade, warm brown surrounding field, thin gold building outlines and saturated red, yellow and green illuminated sign panels. Keep the dense vertical architecture, small awnings, window grids and vintage printed surface. Treat incidental sign areas as nonverbal graphic blocks; retain controlled ink glow without flooding the composition with neon haze.
- **SUBJECT**: Redraw every uploaded animal, person, couple or family in detailed retro-print marks with separate recognizable faces and warm sign illumination. Integrate contours into the facade; exact Step 3 positions and scale override the original.
- **LETTERING**: Prefer legible original stroke style; fallback is warm-gold sign-painter lettering with restrained neon edging at Step 3 glyph positions.
- **AVOID**: No readable shop names, Latin fragments, white backdrop, futuristic skyline or neon haze.

### `sample_009`

- **id**: `sample_009`
- **SCENE**: Use a textured emerald-to-forest-green paper field with fine antique-gold cloud contours sweeping across the upper area and restrained curling gold flourishes below. Preserve the tonal green ornamental pattern, embossed-print character and generous dark-green intervals. Keep gold lines finely etched with subtle relief and controlled highlights, maintaining the original tall, elegant green-and-gold composition without turning it into a landscape.
- **SUBJECT**: Adapt every uploaded animal, person, couple or family into fine gold contours and low relief, preserving species and individual faces. Blend into green paper; exact Step 3 positions and scale override the original.
- **LETTERING**: Prioritize legible original typography; otherwise use antique-gold regular-script lettering with solid readable cores at Step 3 glyph positions.
- **AVOID**: No template horse anatomy or hooves imposed on other species; preserve real hooves when present in the upload. No extra animals, white backing, chrome or realistic scenery.

### `sample_010`

- **id**: `sample_010`
- **SCENE**: Preserve the dark vermilion paper field with fine antique-gold etching, restrained cloud curls, geometric lattice bands and layered architectural eaves across the lower section. Keep the upper red space relatively open and the ornamental outlines precise. Use flat warm-gold ink and subtle paper grain, with enough red separation between fine lines to retain the original refined decorative print.
- **SUBJECT**: Adapt every uploaded animal, person, couple or family into gold-etched contours and red-gold shading, preserving natural anatomy and separate faces. Integrate into continuous red; exact Step 3 positions and scale override the original.
- **LETTERING**: Use legible original typography first; fallback is matte-gold brush calligraphy with medium-bold complete strokes at Step 3 glyph positions.
- **AVOID**: No template animal identity imposed through dragon anatomy or scales. Preserve real scales when present in the upload; no extra mythical figures, white backing, metallic blur or crowded lattice.

### `sample_011`

- **id**: `sample_011`
- **SCENE**: Bright vermilion flat print with tiny gold fireworks, a hanging lantern near the upper right, oranges, a small coin pouch and a gold platform near the base. Preserve the props and quiet red greeting space.
- **SUBJECT**: Use playful two-dimensional hand-inked cartoon drawing: confident dark contours, broad flat cream/red/black shapes, minimal shadow. Preserve the uploaded face, markings, species and count without copying the example calico patches or forcing a cat body. User Step 3 scale and placement override sample pose; preserve one person, two people, any animal species or all recognizable family members without duplication or merged faces.
- **LETTERING**: Use the clear Traditional Chinese brush lettering visible in this revised original: complete radicals, solid readable strokes, open counters and natural tapered terminals. Copy its ink color and brush character, while following the exact user greeting and Step 3 coordinates and compact spacing. Never copy sample wording, add decorative pseudo-characters or substitute Simplified forms.
- **AVOID**: No white photo rectangle, cutout halo, leftover original subjects, generic replacement mascot, missing family member, changed background geometry, added unrelated props or illegible pseudo-Chinese. Keep the original medium consistent across the entire subject and scenery.

### `sample_012`

- **id**: `sample_012`
- **SCENE**: Maintain an even pastel-pink illustrated paper field scattered with tiny white daisies, a few small black flower marks, delicate white sparkles and warm mandarins with green leaves. Preserve the sparse floating arrangement and generous pink breathing room between motifs. Keep fruit softly shaded and flowers simply drawn, with gentle diffuse light and a warm, tender portrait-print atmosphere.
- **SUBJECT**: Softly illustrate every uploaded animal, person, couple or family with individually recognizable faces, gently resolved fur, hair and clothing. Blend fine contours and lighting into pink; exact Step 3 positions and scale override the original.
- **LETTERING**: Prefer legible original typography; fallback is deep-rose softly brushed lettering with crisp complete strokes at Step 3 glyph positions.
- **AVOID**: No invented pets, copied cat markings, white backing, harsh flash or sticker outlines.

### `sample_013`

- **id**: `sample_013`
- **SCENE**: Use a saturated subtly textured red poster field enclosed by a thin gold rectangular ornament with round corner terminals. Retain the antique circular coin near the upper design, scattered small gold coin accents and a large shaded orange with a crisp green leaf below. Balance rich citrus shading against the otherwise flat printed red surface and precise restrained gold details.
- **SUBJECT**: Repaint every uploaded animal, person, couple or family with warm poster shading and separate recognizable faces. Match the orange's modeled finish and continuous red surroundings; exact Step 3 positions and scale override the original.
- **LETTERING**: Prioritize legible original typography; otherwise use bold black brush calligraphy with broad cores and tapered tips at Step 3 glyph positions.
- **AVOID**: No new lantern scenery, white backing, gold glare, crowded coins or faint strokes.

### `sample_014`

- **id**: `sample_014`
- **SCENE**: Soft antique-gold watercolor paper, subtle clouds and lattice patterns, a red diamond near the top and white/yellow daffodils framing the sides and base. Preserve colored gold wash between the flowers.
- **SUBJECT**: Paint uploaded identities with warm watercolor shading, delicate pencil contours and recognizable facial features. Integrate a seated animal or compact portrait into the central opening without displacing the daffodil border. User Step 3 scale and placement override sample pose; preserve one person, two people, any animal species or all recognizable family members without duplication or merged faces.
- **LETTERING**: Use the clear Traditional Chinese brush lettering visible in this revised original: complete radicals, solid readable strokes, open counters and natural tapered terminals. Copy its ink color and brush character, while following the exact user greeting and Step 3 coordinates and compact spacing. Never copy sample wording, add decorative pseudo-characters or substitute Simplified forms.
- **AVOID**: No white photo rectangle, cutout halo, leftover original subjects, generic replacement mascot, missing family member, changed background geometry, added unrelated props or illegible pseudo-Chinese. Keep the original medium consistent across the entire subject and scenery.

### `sample_015`

- **id**: `sample_015`
- **SCENE**: Keep a mustard-gold textile ground densely patterned with interlocking purple peonies, burnt-orange lilies, magenta small flowers and crisp green branching stems. Preserve finely outlined petal segments, flat botanical silhouettes and small gold print details within the blossoms. Maintain lively vertical floral density while allowing narrow gold channels between forms; use even printed color with no dimensional lighting or photographic depth.
- **SUBJECT**: Render every uploaded animal, person, couple or family in fine botanical-print contours and flat identity colors, preserving separate recognizable faces. Integrate surrounding foliage naturally; exact Step 3 positions and scale override the original.
- **LETTERING**: Prefer legible original typography; otherwise use deep-purple upright regular-script strokes with substantial cores at Step 3 glyph positions.
- **AVOID**: No 3D flowers, watercolor wash, white backing, facial foliage or photographic fur.

### `sample_016`

- **id**: `sample_016`
- **SCENE**: Use a visibly pale-yellow geometric textile field with overlapping circular fans and pointed leaf segments in dusty pink, mauve, black and warm gold. Preserve thin black arcs, fine radial hatching, small checker or star-like subdivisions and deliberate gaps of yellow paper. Keep the linked circular rhythm sharp and orderly, with a flat printed finish and consistent line weight throughout.
- **SUBJECT**: Stylize every uploaded animal, person, couple or family with crisp contours and geometric hatching, preserving natural anatomy and separate recognizable faces. Integrate into yellow; exact Step 3 positions and scale override the original.
- **LETTERING**: Prioritize readable original typography; fallback is compact black regular-script brush lettering with clean printed edges at Step 3 glyph positions.
- **AVOID**: No white backdrop, warped grids, facial patterns, metallic depth or faint yellow lettering.

### `sample_017`

- **id**: `sample_017`
- **SCENE**: Paint a winter roof scene with a pale-blue sky, softly scattered snowflakes, curved green glazed tiles carrying irregular snow caps and a warm orange-red wall beneath. Retain ripe orange persimmons and bare dark branches arching overhead from the upper edge. Use visible illustrative contours, lightly textured hand-painted shading and cool daylight balanced by warm fruit and architectural colors.
- **SUBJECT**: Paint every uploaded animal, person, couple or family with warm shading, natural anatomy and separate recognizable faces. Integrate roof contact and upward attention where compatible; exact Step 3 positions and scale override the original.
- **LETTERING**: Prefer legible original typography; otherwise use dark near-black upright brush characters with complete strokes at Step 3 glyph positions.
- **AVOID**: No copied feline anatomy, white sky, photographic fur, melted tiles or obscured faces.

### `sample_018`

- **id**: `sample_018`
- **SCENE**: Layered red and cream-gold paper-cut festival scenery: lanterns and ornamental corners above, a small pagoda at the right, cream-gold terraced curves across the base and an ornamental greeting plaque. Preserve each paper layer and its gentle cast shadow.
- **SUBJECT**: The example is a corgi dog with clear ears, muzzle, white chest and red festive bandana. Replace that example with the uploaded animal or person while preserving the actual identity and count. Use warm outlined gouache forms and restrained paper-cut shading, never a generic human beauty portrait. User Step 3 scale and placement override sample pose; preserve one person, two people, any animal species or all recognizable family members without duplication or merged faces.
- **LETTERING**: Use the clear Traditional Chinese brush lettering visible in this revised original: complete radicals, solid readable strokes, open counters and natural tapered terminals. Copy its ink color and brush character, while following the exact user greeting and Step 3 coordinates and compact spacing. Never copy sample wording, add decorative pseudo-characters or substitute Simplified forms.
- **AVOID**: No white photo rectangle, cutout halo, leftover original subjects, generic replacement mascot, missing family member, changed background geometry, added unrelated props or illegible pseudo-Chinese. Keep the original medium consistent across the entire subject and scenery.

### `sample_019`

- **id**: `sample_019`
- **SCENE**: Preserve a dark navy-and-burgundy festival courtyard with a warm stone floor, distant red architecture, small overhead fireworks and a large glowing red silk lantern above and to the right. Resolve lantern ribs and gold fittings clearly, using amber light pools, soft background bokeh and restrained floating warm specks. Keep a storybook 3D finish and depth without losing the red nighttime atmosphere.
- **SUBJECT**: Model every uploaded animal, person, couple or family as compact large-headed chibi collectibles, retaining separate identities. Adapt the lantern-string gesture, red collar and gold bell with matching shadows; exact Step 3 positions and scale override the original.
- **LETTERING**: Use legible original typography first; fallback is rounded orange-gold brush calligraphy with solid strokes at Step 3 glyph positions.
- **AVOID**: No kitten conversion, extra figures, white backdrop, photographic fur, elongated bodies or glare.

### `sample_020`

- **id**: `sample_020`
- **SCENE**: Keep the warm amber festival-stage atmosphere, luminous golden background, soft red silk drapes and broad curling red ribbons. Use gentle volumetric-looking warm light, plush-friendly shallow depth and restrained distant decorative sparkle. Preserve rich orange-red fabrics, soft fold shading and a cozy theatrical glow; keep structural forms clear rather than dissolving the entire scene into indistinct bokeh.
- **SUBJECT**: Model every uploaded animal, person, couple or family in soft plush with separate recognizable faces and natural species traits. Adapt the seated cushion-holding role with fabric contact and shadows; exact Step 3 positions and scale override the original.
- **LETTERING**: Prioritize legible original type; fallback is matte golden-orange rounded brushwork at Step 3 glyph positions, using the cushion only if approved there.
- **AVOID**: No copied panda traits, white backdrop, plastic shine, extra toys or photographic fur.

### `sample_021`

- **id**: `sample_021`
- **SCENE**: Build a soft 3D storybook winter setting with a turquoise sky, fine drifting snow and a diagonal roof edge of green glazed tiles thickly capped with tactile white snow. Retain orange persimmons on dark overhead branches, gentle frost highlights and a warm-red wall below. Use diffuse cool daylight, rounded material transitions and subtle ambient shadows while keeping the sky visibly turquoise.
- **SUBJECT**: Softly model every uploaded animal, person, couple or family with separate recognizable faces and natural anatomy. Adapt upward attention and roof contact with cool daylight; exact Step 3 positions and scale override the original.
- **LETTERING**: Prefer readable original typography; fallback is warm pale-gold painted brush lettering with robust complete strokes at Step 3 glyph positions.
- **AVOID**: No feline conversion, extra companions, white sky, plastic fur or face-crossing branches.

### `sample_022`

- **id**: `sample_022`
- **SCENE**: Dark plum and deep-blue festive night with a spiral of orange-gold light, small sparks and a warmly lit ground. Keep the original light path around the subject and preserve the dark greeting space.
- **SUBJECT**: Keep each uploaded face clearly visible inside a white-trimmed lion-dance hood, with colorful embroidered fabric and flowing ribbons. The hood is clothing, not a replacement lion head. Human uploads require an entirely human torso, arms and hands inside fitted festive clothing; animal uploads retain their own species, muzzle, limbs and markings. Render fine fur only on actual animals and the costume trim; render human skin, hair and luminous fabric naturally without plastic gloss. User Step 3 scale and placement override sample pose; preserve one person, two people, any animal species or all recognizable family members without duplication or merged faces.
- **LETTERING**: Use the clear Traditional Chinese brush lettering visible in this revised original: complete radicals, solid readable strokes, open counters and natural tapered terminals. Copy its ink color and brush character, while following the exact user greeting and Step 3 coordinates and compact spacing. Never copy sample wording, add decorative pseudo-characters or substitute Simplified forms.
- **AVOID**: No white photo rectangle, cutout halo, leftover original subjects, generic replacement mascot, missing family member, changed background geometry, added unrelated props or illegible pseudo-Chinese. Keep the original medium consistent across the entire subject and scenery.

### `sample_023`

- **id**: `sample_023`
- **SCENE**: Maintain the velvety dark-crimson festival setting with warm hanging red lanterns, restrained gold accents, softly receding courtyard architecture and scattered white snow or confetti. Preserve the low viewpoint, tactile pale snow at ground level and warm diffuse red lighting. Keep the background softly modeled with readable decorative structure, allowing the crimson wall and gentle golden sparkle to carry the festive mood.
- **SUBJECT**: Model every uploaded animal, person, couple or family with soft rounded surfaces, separate recognizable faces and identity markings. Adapt playful leaning or seating with contact shadows; exact Step 3 positions and scale override the original.
- **LETTERING**: Prioritize readable original typography; otherwise use textured antique-gold bold regular-script brush characters at Step 3 glyph positions.
- **AVOID**: No invented companions, copied panda patches, white backing, plastic shine or fused limbs.

### `sample_024`

- **id**: `sample_024`
- **SCENE**: Deep navy night with blue/gold fireworks, bamboo framing both sides, lush small flowers below and the existing campfire with its flames and logs at center. Preserve the campfire location and size precisely.
- **SUBJECT**: The large seated panda at left and smaller child at right are replacement examples. Use actual uploaded identities in those separate slots and maintain clear facial detail, soft storybook painted contours and warm firelight on the inward sides. With one source, replace the left example only and omit the other original figure; with two sources, use both slots. Do not cover the fire or bridge the gap with bodies. User Step 3 scale and placement override sample pose; preserve one person, two people, any animal species or all recognizable family members without duplication or merged faces.
- **LETTERING**: Use the clear Traditional Chinese brush lettering visible in this revised original: complete radicals, solid readable strokes, open counters and natural tapered terminals. Copy its ink color and brush character, while following the exact user greeting and Step 3 coordinates and compact spacing. Never copy sample wording, add decorative pseudo-characters or substitute Simplified forms.
- **AVOID**: No white photo rectangle, cutout halo, leftover original subjects, generic replacement mascot, missing family member, changed background geometry, added unrelated props or illegible pseudo-Chinese. Keep the original medium consistent across the entire subject and scenery.

### `sample_025`

- **id**: `sample_025`
- **SCENE**: Create the deep-navy screen-printed firework bouquet, anchored by a large orange radial burst toward the upper left. Layer smaller coral, cream and pale-blue stars and bursts on long fine stems, with curling pale-blue waves along the lower edge. Preserve the asymmetrical upward rhythm, deliberate dark gaps and crisp flat ink shapes, allowing subtle print grain without photographic glow.
- **SUBJECT**: Redraw every uploaded animal, person, couple or family with crisp graphic contours, restrained warm-cool shading and recognizable separate faces. Let navy pattern meet silhouettes naturally; exact Step 3 positions and scale override the original.
- **LETTERING**: Prioritize readable original typography; otherwise use pale warm-gold screen-printed brush lettering with crisp complete edges at Step 3 glyph positions.
- **AVOID**: No realistic explosions, white backdrop, tangled rays, foil text or face-crossing firework lines.

### `sample_026`

- **id**: `sample_026`
- **SCENE**: Preserve a bright miniature 3D lotus garden with a turquoise stream threading between oversized glossy green lotus leaves, small pink-and-white blossoms and vivid grassy patches. Retain the small red pavilion and delicate tea setting as clear miniature landmarks. Use soft sunlit highlights, rounded leaf volumes and shallow garden depth, keeping the water route and distinct foreground leaf or island surfaces readable.
- **SUBJECT**: Model every uploaded animal, person, couple or family as small garden figurines with separate recognizable faces and species traits. Integrate footing and shadows on approved surfaces; exact Step 3 positions and scale override the original.
- **LETTERING**: Use legible original typography first; fallback is deep-jade compact brush lettering with complete rounded strokes at Step 3 glyph positions.
- **AVOID**: No copied pandas, extra spectators, white backing, blocked stream or photographic cutouts.

### `sample_027`

- **id**: `sample_027`
- **SCENE**: Retain the sunlit miniature bamboo grove with tall slender green stems, strings of small colored lanterns, bright grassy islands and a clear blue stream. Preserve rounded pale stepping stones, layered bamboo depth and warm yellow-green sunlight filtering through the grove. Use tactile toy-garden surfaces, soft contact shadows and a gently elevated view that keeps the winding water and separate islands legible.
- **SUBJECT**: Model every uploaded animal, person, couple or family as rounded garden figurines with separate recognizable faces and species traits. Integrate approved seating or standing with matching light; exact Step 3 positions and scale override the original.
- **LETTERING**: Prefer readable original typography; fallback is deep-teal upright brush lettering with gentle printed texture at Step 3 glyph positions.
- **AVOID**: No panda conversion, invented companions, white backdrop, blocked water or floating figures.

### `sample_028`

- **id**: `sample_028`
- **SCENE**: Warm orange-gold textured print with a thin scalloped ornamental frame and sparse corner linework; preserve the clean inner gold field and the red upper greeting region.
- **SUBJECT**: Use a distinctly flat hand-inked family cartoon: variable dark outlines, matte two/three-tone fills and small purposeful shadow shapes. Retain every uploaded family member, age, eyewear, face shape and order. Animals remain their actual species. The sample four-person family is illustrative, never an instruction to invent missing relatives. User Step 3 scale and placement override sample pose; preserve one person, two people, any animal species or all recognizable family members without duplication or merged faces.
- **LETTERING**: Use the clear Traditional Chinese brush lettering visible in this revised original: complete radicals, solid readable strokes, open counters and natural tapered terminals. Copy its ink color and brush character, while following the exact user greeting and Step 3 coordinates and compact spacing. Never copy sample wording, add decorative pseudo-characters or substitute Simplified forms.
- **AVOID**: No white photo rectangle, cutout halo, leftover original subjects, generic replacement mascot, missing family member, changed background geometry, added unrelated props or illegible pseudo-Chinese. No glossy 3D doll faces, airbrushed photorealism, beauty filters or synthetic glamour portraits.

### `sample_029`

- **id**: `sample_029`
- **SCENE**: Build a dense botanical tapestry over dusty cobalt-blue cloth, with overlapping pale-yellow daisies, ivory blooms, soft pink flowers and narrow green leaves. Preserve the original small repeating blossom scale, fine gold contours, delicately veined petals and woven printed surface. Keep blue visible in irregular gaps, with even diffuse illumination rather than directional photographic light.
- **SUBJECT**: Paint every uploaded identity in the same fine textile illustration at the approved Step 3 positions and scale; retain distinct faces, markings and anatomy, letting nearby leaves overlap only natural lower edges.
- **LETTERING**: Prioritize the legible original stroke style; otherwise use moderately weighted deep-navy brush lettering with clear counters among the tapestry flowers.
- **AVOID**: Avoid photographic fur islands, sticker rims, white backdrop gaps, giant isolated blooms and gold outlines merging into facial features.

### `sample_030`

- **id**: `sample_030`
- **SCENE**: Layer oversized ornamental chrysanthemums and lilies across a dusty-mauve brocade field. Alternate coral, orange, pale-gold and cream petals with broad green leaves and fine gold contour drawings; retain both fully colored flowers and lightly outlined blossoms. Use flat textile depth, overlapping curved petals and restrained printed grain, preserving the original rich pattern instead of arranging a realistic bouquet.
- **SUBJECT**: Translate uploaded people or animals into refined brocade illustration, preserving separate identities and species at approved Step 3 positions and scale; continue the mauve floral field closely around their silhouettes.
- **LETTERING**: Prioritize legible original lettering; otherwise use deep-plum traditional brushwork with restrained gold accents only where contrast remains strong.
- **AVOID**: Avoid glossy three-dimensional flowers, pastel watercolor drift, hard portrait frames, white backdrops and excessive gold filigree over faces.

### `sample_031`

- **id**: `sample_031`
- **SCENE**: Pale colored celadon-green paper with quiet geometric lines, purple circular lattice motifs at the edges and large yellow-purple peonies below and along the sides. Keep the central green surface visible around the portrait.
- **SUBJECT**: Use a flat editorial ink illustration with visible drawn contours, simplified matte color blocks and sparse deliberate shading. Preserve the uploaded identity, asymmetries, age and distinguishing features. The single example woman is only a placement reference; actual pets, pairs or families retain their identities and count. No airbrushed skin, beauty-filter proportions, glossy lips, doll eyes or semi-realistic digital glamour. User Step 3 scale and placement override sample pose; preserve one person, two people, any animal species or all recognizable family members without duplication or merged faces.
- **LETTERING**: Use the clear Traditional Chinese brush lettering visible in this revised original: complete radicals, solid readable strokes, open counters and natural tapered terminals. Copy its ink color and brush character, while following the exact user greeting and Step 3 coordinates and compact spacing. Never copy sample wording, add decorative pseudo-characters or substitute Simplified forms.
- **AVOID**: No white photo rectangle, cutout halo, leftover original subjects, generic replacement mascot, missing family member, changed background geometry, added unrelated props or illegible pseudo-Chinese. No glossy 3D doll faces, airbrushed photorealism, beauty filters or synthetic glamour portraits.

### `sample_032`

- **id**: `sample_032`
- **SCENE**: Preserve the visibly warm yellow-tinted paper and airy upright cluster of narcissus, with ivory petals, golden-yellow centers, slender stems and long dark-green leaves. Keep the pale-gold and muted mauve circular latticework behind the foliage, delicate background ornament and generous colored negative space. Use fine gongbi outlines, subtle petal shading and quiet diffuse light.
- **SUBJECT**: Paint the uploaded person, pair, family or animal with matching controlled brush detail at approved Step 3 positions and scale; preserve every identity while integrating lower edges with the narrow foliage.
- **LETTERING**: Prioritize the legible original lettering; otherwise use warm-russet regular or semicursive brush characters with controlled thin-to-thick strokes.
- **AVOID**: Avoid white backdrop substitution, giant peonies, red scene recoloring, waxy flowers, heavy black portrait outlines and foliage across eyes.

### `sample_033`

- **id**: `sample_033`
- **SCENE**: Keep the warm peach-tinted paper field and upright arrangement of red peonies, rounded buds and green foliage. Preserve softly shaded scarlet petals, fine crimson veins and the purple-and-gold circular latticework threading behind the stems. Leave visible peach negative space around the floral silhouette, with restrained paper texture and the even illumination of a traditional gongbi painting.
- **SUBJECT**: Integrate all uploaded identities as delicate painted figures at approved Step 3 positions and scale; retain recognizable faces and species without borrowing flower shapes, and use subtle foliage overlap only below faces.
- **LETTERING**: Prioritize the legible original calligraphy; otherwise use deep-crimson traditional brush lettering with complete strokes and moderate weight on peach.
- **AVOID**: Avoid white paper gaps, photographic skin or fur, thick sticker contours, glowing latticework and a dense all-over floral replacement.

### `sample_034`

- **id**: `sample_034`
- **SCENE**: Maintain pale sky-blue paper with tall pink and scarlet lilies, elongated green leaves and slender upright stems. Place the original muted mauve and pale-gold lattice arcs behind the floral arrangement, preserving open circular geometry and subtle blue botanical texture. Use precise gongbi contours, smoothly shaded curved petals and a cool, softly lit printed surface.
- **SUBJECT**: Paint uploaded identities in the same delicate medium at approved Step 3 positions and scale, retaining each face and correct anatomy while letting the blue paper and foliage continue naturally around their silhouettes.
- **LETTERING**: Prioritize the legible original lettering; otherwise use muted deep-rose brushwork with enough stroke weight to remain clear against blue.
- **AVOID**: Avoid orange-red backgrounds, white backdrop halos, realistic studio portraits, metallic lattice glare and enlarged lilies covering faces.

### `sample_035`

- **id**: `sample_035`
- **SCENE**: Create a joyful flat floral print on saturated violet, retaining large orange daisies, lavender striped petals, vivid green leaves and floating oval seed forms. Preserve the original mix of complete blossoms and cropped edge flowers, bold cut-paper silhouettes, lively diagonal branching and delicate decorative hatch lines. Keep colors opaque and lighting flat, with no volumetric highlights.
- **SUBJECT**: Redraw each uploaded person or animal as a crisp decorative illustration at approved Step 3 positions and scale; simplify shading while preserving recognizable face shapes, individual markings and separate identities.
- **LETTERING**: Prioritize legible original strokes; otherwise use playful warm-gold brush lettering with opaque cores and standard readable character structure.
- **AVOID**: Avoid photographic flowers, plastic rendering, petals substituted for facial features, white portrait panels and background hatching crossing eyes.

### `sample_036`

- **id**: `sample_036`
- **SCENE**: Rich red flat print surrounded by large pink, lavender and golden flowers, green leaves and sparse fine gold sparkles. Preserve the original floral frame, colored gaps and open greeting area above.
- **SUBJECT**: Draw the actual uploaded couple, individual, animals or family in a flat storybook ink style: expressive but distinct faces, clear outlines, matte color areas and minimal two-tone shading. Preserve individual features, age and count. Do not reproduce the sample couple when a different number or species is uploaded; avoid glossy idealized AI-model faces, poreless skin and identical smiles. User Step 3 scale and placement override sample pose; preserve one person, two people, any animal species or all recognizable family members without duplication or merged faces.
- **LETTERING**: Use the clear Traditional Chinese brush lettering visible in this revised original: complete radicals, solid readable strokes, open counters and natural tapered terminals. Copy its ink color and brush character, while following the exact user greeting and Step 3 coordinates and compact spacing. Never copy sample wording, add decorative pseudo-characters or substitute Simplified forms.
- **AVOID**: No white photo rectangle, cutout halo, leftover original subjects, generic replacement mascot, missing family member, changed background geometry, added unrelated props or illegible pseudo-Chinese. No glossy 3D doll faces, airbrushed photorealism, beauty filters or synthetic glamour portraits.

### `sample_037`

- **id**: `sample_037`
- **SCENE**: Preserve the lively lime-green botanical collage, combining cream daisies, orange and purple petals, branching blue-purple leaves, small white dots and scattered colorful seed shapes. Keep the original dense but irregular rhythm, overlapping crisp paper silhouettes and small open lime pockets. Use flat saturated ink, clean printed edges and restrained internal line details rather than realistic light and shadow.
- **SUBJECT**: Translate all uploaded identities into matching flat decorative figures at approved Step 3 positions and scale; keep their individual faces, markings and species readable against the busy foliage without adding a portrait panel.
- **LETTERING**: Prioritize legible original strokes; otherwise use deep-purple lively brush lettering with solid shapes and standard Chinese character anatomy.
- **AVOID**: Avoid pastel muting, realistic bouquets, white backdrops, duplicated template subjects and confetti or leaves substituting for character strokes.

### `sample_038`

- **id**: `sample_038`
- **SCENE**: Retain this lime-green floral print's own crop and balance of cream daisies, purple and orange petals, blue-purple branching leaves, dotted accents and small seed shapes. Build the field from crisp overlapping flat silhouettes, keeping its scattered dense rhythm and visible lime gaps. Preserve the reference's printed color relationships and fine graphic details with even illumination.
- **SUBJECT**: Redraw uploaded people or animals in the same clean collage language at approved Step 3 positions and scale, preserving the actual count and distinct identities while continuing the botanical field around irregular silhouettes.
- **LETTERING**: Prioritize the legible original font; otherwise use deep-purple rounded brush lettering with clear counters and complete standard strokes.
- **AVOID**: Avoid inventing a new floral composition from another card, photographic shading, white cutout blocks, duplicate faces and excessive detail noise.

### `sample_039`

- **id**: `sample_039`
- **SCENE**: Deep teal-green painterly field with white and cream-yellow flowers around the sides and base. Keep the subtle green texture and original flower spacing, never turn the central opening into white studio paper.
- **SUBJECT**: Use soft gouache animal or human portrait painting, fine but restrained fur/hair detail and warm expressive eyes with natural proportions. Replace the sample golden retriever with actual uploaded subjects at Step 3 positions while allowing only a few lower flowers to overlap the base. User Step 3 scale and placement override sample pose; preserve one person, two people, any animal species or all recognizable family members without duplication or merged faces.
- **LETTERING**: Use the clear Traditional Chinese brush lettering visible in this revised original: complete radicals, solid readable strokes, open counters and natural tapered terminals. Copy its ink color and brush character, while following the exact user greeting and Step 3 coordinates and compact spacing. Never copy sample wording, add decorative pseudo-characters or substitute Simplified forms.
- **AVOID**: No white photo rectangle, cutout halo, leftover original subjects, generic replacement mascot, missing family member, changed background geometry, added unrelated props or illegible pseudo-Chinese. Keep the original medium consistent across the entire subject and scenery.

### `sample_040`

- **id**: `sample_040`
- **SCENE**: Construct a refined ink-and-cut-paper landscape over a visibly sage-tinted field: a circular lattice opening, slender bamboo, blush accents, layered distant hills, small pavilion architecture, winding water and lotus foliage below. Preserve quiet geometric depth, thin outlines and flat muted color planes. Keep atmospheric spacing and delicate paper texture, with softly graded distance instead of dramatic three-dimensional perspective.
- **SUBJECT**: Adapt the reference's elegant focal role to each uploaded identity at approved Step 3 positions and scale; retain actual species and separate faces, using restrained ink contours and flat painted shading.
- **LETTERING**: Prioritize the legible original stroke style; otherwise use dark-jade upright ink calligraphy with refined but complete strokes.
- **AVOID**: Avoid turning subjects into cranes, copying wings onto people, blank white scenery, oversized architecture and glossy photorealistic landscape details.

### `sample_041`

- **id**: `sample_041`
- **SCENE**: Jade-green and muted turquoise watercolor wash with pink roses, small white blossoms and trailing leafy borders. Keep pigment variation and painted foliage throughout the full frame.
- **SUBJECT**: Render uploaded identities as recognizable delicate watercolor portraits with fine pencil facial lines, gentle fur/hair texture and a few soft pigment edges. The silver tabby is an example, not a required species. Keep faces crisp and separate from the floral frame; do not restore a crane, peacock or unrelated animal from older artwork. User Step 3 scale and placement override sample pose; preserve one person, two people, any animal species or all recognizable family members without duplication or merged faces.
- **LETTERING**: Use the clear Traditional Chinese brush lettering visible in this revised original: complete radicals, solid readable strokes, open counters and natural tapered terminals. Copy its ink color and brush character, while following the exact user greeting and Step 3 coordinates and compact spacing. Never copy sample wording, add decorative pseudo-characters or substitute Simplified forms.
- **AVOID**: No white photo rectangle, cutout halo, leftover original subjects, generic replacement mascot, missing family member, changed background geometry, added unrelated props or illegible pseudo-Chinese. Keep the original medium consistent across the entire subject and scenery.

### `sample_042`

- **id**: `sample_042`
- **SCENE**: Keep the cheerful overhead meal composition on a warm yellow field, with its round red-orange table, neatly drawn dishes, bowls, chopsticks and surrounding serving plates. Preserve simple flat food shapes, playful scale changes, small patterned details and gentle curved lines. Use clean illustrated surfaces and even warm color, retaining enough visible yellow around the communal setting.
- **SUBJECT**: Adapt the diners to exactly the uploaded identities at approved Step 3 positions and scale; preserve separate recognizable faces and correct anatomy, arranging their interaction with the meal without merging a family into one figure.
- **LETTERING**: Prioritize the legible original lettering; otherwise use friendly deep-russet rounded brush characters with clean complete strokes on warm yellow.
- **AVOID**: Avoid copying template diners, extra relatives, fused faces, realistic food photography, white backdrops and overhead perspective that conceals every face.

### `sample_043`

- **id**: `sample_043`
- **SCENE**: Preserve the top-down festive banquet with a large red circular table, densely arranged small dishes and deep-teal surroundings. Retain warm yellow chair frames, rhythmic place settings, crisp flat food drawings and friendly rounded proportions. Balance the colorful meal with calm teal margins, using uniform printed color and restrained decorative detail rather than realistic interior lighting.
- **SUBJECT**: Illustrate exactly the uploaded identities at approved Step 3 positions and scale; adapt the seats and table interaction to their count, preserve relative order and separate recognizable faces, and keep correct species and anatomy.
- **LETTERING**: Prioritize legible original strokes; otherwise use warm pale-gold friendly brush lettering with solid shapes and readable gaps over red or teal.
- **AVOID**: Avoid template-family substitution, merged diners, extra pets, photographic dishes, white portrait cutouts and foreground plates hiding approved facial areas.

### `sample_044`

- **id**: `sample_044`
- **SCENE**: Deep red printed field with delicate concentric gold lines near the top and a dense lower arrangement of red and gold peonies, botanical outlines and a few solid gold flower shapes. Preserve the quiet central red opening.
- **SUBJECT**: Use a softly painted recognizable animal or human portrait with fine restrained detail and natural anatomy. Replace the example rabbit including its ears with the uploaded identities, never impose rabbit features on dogs or people. Fit the complete head and characteristic ears/hair inside Step 3 geometry, keeping faces above the flowers. User Step 3 scale and placement override sample pose; preserve one person, two people, any animal species or all recognizable family members without duplication or merged faces.
- **LETTERING**: Use the clear Traditional Chinese brush lettering visible in this revised original: complete radicals, solid readable strokes, open counters and natural tapered terminals. Copy its ink color and brush character, while following the exact user greeting and Step 3 coordinates and compact spacing. Never copy sample wording, add decorative pseudo-characters or substitute Simplified forms.
- **AVOID**: No white photo rectangle, cutout halo, leftover original subjects, generic replacement mascot, missing family member, changed background geometry, added unrelated props or illegible pseudo-Chinese. Keep the original medium consistent across the entire subject and scenery.

### `sample_045`

- **id**: `sample_045`
- **SCENE**: Preserve this variant's dusty rose-gray textile field, large interwoven pink, coral and cream ribbon knots, strong black contour lines and fine parallel ribbon stripes. Retain the suspended black tassels, small black-and-ivory floral ornaments and pale flowing background lines. Keep the graphic weave crossings precise and the decorative forms flat, with restrained printed texture and no glossy three-dimensional lighting.
- **SUBJECT**: Integrate every uploaded identity as a clean textile illustration at approved Step 3 positions and scale; preserve distinct faces, markings and anatomy while matching the controlled line weight and muted palette.
- **LETTERING**: Prioritize legible original lettering; otherwise use deep-plum or near-black regular-script brushwork with clear stroke separation on dusty rose-gray.
- **AVOID**: Avoid automatically recoloring it lavender, tangled knot crossings, ribbons replacing limbs, white backdrop panels and decorative tassels crossing faces.

### `sample_046`

- **id**: `sample_046`
- **SCENE**: Use a deep forest-green dining print with restrained tonal floral texture, fine gold wheat stalks, an ornamental lobed medallion and slender framing lines. Preserve the richly patterned porcelain plate, chopsticks and spoon low in the design, with their precise etched details and calm balance. Keep flat ink and subtle gold-foil character, avoiding strong directional reflections.
- **SUBJECT**: Render uploaded identities as refined painted-and-etched illustrations at approved Step 3 positions and scale; preserve recognizable faces and species while matching the green-and-antique-gold visual language and continuous surrounding field.
- **LETTERING**: Prioritize the legible original calligraphy; otherwise use antique-gold regular-script lettering with restrained etched texture and solid readable stroke centers.
- **AVOID**: Avoid realistic banquet rooms, red background replacement, white portrait panels, excessive metallic glare and porcelain patterning over facial features.

### `sample_047`

- **id**: `sample_047`
- **SCENE**: Preserve the warm miniature festival street, stone paving, receding traditional facades and hanging red lanterns. Use amber daylight, gentle lantern bokeh, softly modeled architectural detail and warm reflected light, with small golden festive accents in the air. Maintain the original narrow-street depth and tactile storybook atmosphere while keeping the central setting coherent and richly colored.
- **SUBJECT**: Dress uploaded identities in complete red-and-gold brocade jackets and trousers with elaborate white lion-dance headdresses above visible faces; use soft three-dimensional modeling at approved Step 3 positions and scale, preserving actual anatomy and count.
- **LETTERING**: Prioritize legible original lettering; otherwise use warm pale-gold festive brushwork with controlled variation and clear complete strokes.
- **AVOID**: Avoid panda markings on other species, hidden faces, incomplete costumes, photographic cutouts, white backdrop halos and headdresses fused into heads.

### `sample_048`

- **id**: `sample_048`
- **SCENE**: Keep the monochrome golden-orange ornamental print with its subtle repeating damask and thin lobed medallion border. Preserve the reference's restrained amber tonal steps, delicate filigree and fine embossed-paper surface, leaving the broad orange field calm and continuous. Suggest shallow relief through small soft edge highlights rather than deep shadows, metallic glare or a three-dimensional architectural frame.
- **SUBJECT**: Integrate uploaded identities as matching low-relief gold illustrations at approved Step 3 positions and scale, preserving recognizable faces, actual species and individual distinctions through controlled contours and restrained tonal modeling.
- **LETTERING**: Prioritize legible original strokes; otherwise use deep-amber embossed regular-script calligraphy with darker solid ink and shallow relief for contrast.
- **AVOID**: Avoid retaining the template word, faint gold-on-gold characters, white portrait plaques, deep cast shadows and unrelated floral scenery.

### `sample_049`

- **id**: `sample_049`
- **SCENE**: Preserve this violet floral variant's own crop of orange daisies, lavender striped petals, vivid green leaves and floating oval seed motifs. Use bold flat paper shapes, clean edges and delicate hatch lines, keeping the lively interlocking pattern and contrast between large petals and small drifting ornaments. Retain saturated printed colors and even light without adding realistic botanical depth.
- **SUBJECT**: Illustrate every uploaded identity in the same graphic finish at approved Step 3 positions and scale; retain separate faces, species and distinctive markings, integrating silhouettes directly into the continuous violet patterned field.
- **LETTERING**: Prioritize the legible original font; otherwise use warm-gold playful brush lettering with opaque full strokes and clear character counters.
- **AVOID**: Avoid copying another floral card's crop, realistic flower photographs, plastic subjects, white backdrop blocks and seed shapes replacing Chinese strokes.

### `sample_050`

- **id**: `sample_050`
- **SCENE**: Preserve this reference's red-and-coral floral crop, with broad pale-pink cosmos-like flowers, cream daisies, small yellow blooms and thin green stems. Keep the layered translucency of the petals, finely indicated centers and warm printed grain. Balance large blossoms against smaller flowers and narrow red gaps, using soft painted shading without cinematic lighting or deep bouquet shadows.
- **SUBJECT**: Paint the actual uploaded identities at approved Step 3 positions and scale, preserving separate faces and correct species while matching the soft petal illustration and letting surrounding flowers overlap only natural lower edges.
- **LETTERING**: Prioritize the legible original lettering; otherwise choose refined deep-burgundy brushwork or opaque warm gold where it provides stronger contrast.
- **AVOID**: Avoid replacing this crop with another card, white cutout panels, photographic skin or fur, fused identities and flower centers covering eyes.

### `sample_051`

- **id**: `sample_051`
- **SCENE**: Retain the supplied variant's dense warm floral arrangement on red, including pale pink and coral blossoms, cream daisies, smaller yellow accents and delicate green stems. Follow its own overlap and edge crops, preserving translucent petal shading, intricate centers and the soft printed surface. Keep the underlying red visible in irregular gaps and illuminate the pattern evenly.
- **SUBJECT**: Render each uploaded identity in matching softly painted detail at approved Step 3 positions and scale; maintain actual count, individual faces and species, blending edges with the existing floral field without erasing the pattern.
- **LETTERING**: Prioritize legible original brushwork; otherwise use deep-burgundy or opaque warm-gold characters chosen for clear contrast over the actual local colors.
- **AVOID**: Avoid generic substitute bouquets, white backdrop holes, photo-fragment faces, thick sticker contours, duplicated subjects and excessive bloom blur.

### `sample_052`

- **id**: `sample_052`
- **SCENE**: Keep this mint-and-teal floral close-up's original crop, with oversized ivory petals, warm yellow centers, pale-gold veins and sweeping cool-green leaves. Preserve the alternation of large and small blossoms and their luminous soft gradients, maintaining teal-colored gaps throughout. Use gently painted surfaces and quiet diffuse illumination, with smooth petal curvature rather than glossy sculpted flowers.
- **SUBJECT**: Paint uploaded identities at approved Step 3 positions and scale with the same luminous softness, preserving recognizable faces, species and individual markings while integrating their contours into continuous teal and surrounding foliage.
- **LETTERING**: Prioritize legible original strokes; otherwise use elegant deep-teal regular-script brush lettering with distinct solid lines against mint and ivory.
- **AVOID**: Avoid white overall backgrounds, blown highlights, unrelated flower substitutions, photographic portraits, hard cutout rims and petals crossing facial landmarks.

### `sample_053`

- **id**: `sample_053`
- **SCENE**: Preserve the bright miniature isometric festival garden around a turquoise pond, with a small grassy island, curved waterside paths, tiny traditional buildings, rounded trees and lantern strings. Use sunny warm light, soft toy-like scenery and convincing small-scale depth, keeping the winding water route readable. Retain the original red architectural accents, flower clusters and varied greenery around the pond.
- **SUBJECT**: Translate uploaded identities into miniature festival participants at approved Step 3 positions and scale, preserving actual species and separate faces; adapt the focal performance role without copying template people, animals or their count.
- **LETTERING**: Prioritize legible original lettering; otherwise use deep-jade compact brush characters with clean contrast over the bright miniature garden.
- **AVOID**: Avoid black separation silhouettes, checkerboard print artifacts, white portrait plates, life-size figures, cloned spectators and invented foreground identities.

### `sample_054`

- **id**: `sample_054`
- **SCENE**: Maintain the warm miniature isometric lantern street with diagonal stone paths, small traditional shopfronts, rounded trees, flower beds and festive red-and-gold decorations. Preserve the scene's lively spatial rhythm and alternating red, cream, green and gold details. Use sunlit toy-scale architecture with soft depth and warm reflected light, keeping street routes, planted islands and building edges coherent.
- **SUBJECT**: Adapt focal festival roles to uploaded identities at approved Step 3 positions and scale, preserving recognizable faces, actual anatomy and count; any costume should frame faces visibly and match the miniature scene's tactile finish.
- **LETTERING**: Prioritize legible original strokes; otherwise use warm pale-gold festive brush lettering with complete solid shapes and restrained texture.
- **AVOID**: Avoid black silhouette placeholders, checkerboard separations, merged crowds, giant inserted portraits, white backdrop panels and lion anatomy replacing uploaded species.

### `sample_055`

- **id**: `sample_055`
- **SCENE**: Preserve the vivid red folk-cartoon setting, floating warm-gold coin motifs and curling turquoise-blue waves with cream foam below. Keep the original upward splash rhythm, generous upper red field and contrast between warm ornament and cool water. Use clean rounded illustration, restrained soft shading and strong black contour accents, maintaining a lively flat decorative finish.
- **SUBJECT**: Adapt the ornate red-and-gold costume and interaction with a cream-orange ornamental fish to uploaded identities at approved Step 3 positions and scale; preserve actual species, separate recognizable faces and the uploaded count.
- **LETTERING**: Prioritize legible original lettering; otherwise use warm golden-yellow rounded brush characters with robust strokes and clear Chinese structure.
- **AVOID**: Avoid copying the template deity's beard or face, fish transformations, black separation blobs, checkerboard artifacts, white backdrops and extra identities.

### `sample_056`

- **id**: `sample_056`
- **SCENE**: Preserve the sunlit miniature bamboo tea garden in lime, olive and warm cream, with tall bamboo stems, leafy depth, a round woven tea table and a patterned teapot with small cups. Retain soft grass, natural scattered garden detail and dappled daylight. Model woven fibers, ceramics and foliage gently, keeping the intimate garden scale and warm storybook atmosphere.
- **SUBJECT**: Seat the uploaded identities naturally around the tea setting at approved Step 3 positions and scale; use soft three-dimensional fur or skin, correct anatomy, separate recognizable faces and the actual uploaded count.
- **LETTERING**: Prioritize legible original brushwork; otherwise use deep-bamboo-green regular-script lettering with clean solid strokes and gentle ink texture.
- **AVOID**: Avoid inherited panda patches or round ears, unrequested companions, merged paws and cups, white cutout panels and excessive realistic fur contrast.

### `sample_057`

- **id**: `sample_057`
- **SCENE**: Maintain the hand-painted winter roof scene with pale-blue sky, curved green roof tiles edged with snow, dark twigs and hanging orange persimmons. Preserve fine illustrative outlines, the angled tiled roof, warm orange accents and quiet colored sky. Use soft winter daylight and lightly textured shading, keeping snow confined to real roof and branch surfaces.
- **SUBJECT**: Paint uploaded identities with warm, finely shaded faces at approved Step 3 positions and scale; adapt the reference's upward-looking rooftop interaction to their correct anatomy while preserving separate identities and natural contact with the scene.
- **LETTERING**: Prioritize the legible original lettering; otherwise use near-black upright brush characters with complete distinct strokes against the blue sky.
- **AVOID**: Avoid copying feline ears onto dogs, forcing a single subject, white backdrop replacement, photographic fur islands and roof edges cutting through bodies.

### `sample_058`

- **id**: `sample_058`
- **SCENE**: Preserve the warm miniature alley with irregular stone paving, traditional building fronts, overhead lantern strings and receding festive red details. Keep softly rounded architectural modeling, a warm pale-gold atmosphere and gentle daylight falling between the buildings. Use shallow storybook depth without losing the paving route, retaining tactile surfaces and a calm narrow-street composition.
- **SUBJECT**: Render uploaded identities as soft rounded three-dimensional figures in simple red Tang jackets at approved Step 3 positions and scale; retain breed or facial structure, distinctive markings and separate recognizable faces for the actual count.
- **LETTERING**: Prioritize legible original lettering; otherwise use rounded orange-gold brush calligraphy with full strokes and a softly painted finish.
- **AVOID**: Avoid template cat markings, forced feline anatomy, additional companions, white studio backdrops, black separation patches and glossy plastic skin.

### `sample_059`

- **id**: `sample_059`
- **SCENE**: Keep the warm narrow festival street, receding stone pavement, traditional facades and hanging lanterns, with gentle amber daylight and softly blurred depth. Preserve handcrafted material texture, subtly irregular surfaces and warm reflected red accents. Maintain coherent perspective and grounded paving detail, allowing the street's soft atmosphere to continue throughout the frame without blank bright cutout regions.
- **SUBJECT**: Model uploaded identities as textured handcrafted figures in red embroidered Tang jackets at approved Step 3 positions and scale; preserve actual anatomy, facial distinctions and markings, with tactile fur or softly formed skin appropriate to each identity.
- **LETTERING**: Prioritize legible original brushwork; otherwise use warm pale-gold festive calligraphy with restrained texture and crisp complete strokes.
- **AVOID**: Avoid copying template curls onto other species, black mask shapes, checkerboard separations, white backdrops, detached paws and embroidery crossing faces.

### `sample_060`

- **id**: `sample_060`
- **SCENE**: Preserve the cozy winter festival setting with saturated red lantern bokeh, warm amber lights, softly blurred architecture and scattered light snow. Retain the plush storybook surface quality, gentle warm highlights and softly modeled depth, with a richly colored continuous background. Keep small snow accents distinct from the red scene instead of bleaching it into a pale studio field.
- **SUBJECT**: Render uploaded identities as soft plush three-dimensional figures wearing red winter jackets and knitted caps at approved Step 3 positions and scale; preserve each face, actual species, markings and count beneath the adapted winter clothing.
- **LETTERING**: Prioritize legible original lettering; otherwise use golden-orange rounded brushwork with matte solid strokes and clear readable gaps.
- **AVOID**: Avoid copying template facial patches, hats covering eyes, cloned figures, white backdrops, unreadable clothing text and plastic or photographic fur.

---

## 賀詞相關 brief

來源：`greeting-script.js`（函式全文／回傳文字模板）。

### `greetingAlignmentBrief(glyphs, nudge=0)`

回傳字串模板（verbatim 邏輯）：

```
GREETING HORIZONTAL ALIGNMENT LOCK: the complete lettering group has its approved axis at x=${pct(center)}% of the FRONT only; left boundary x=${pct(left)}%, right boundary x=${pct(right)}%. (centered ? `This is the exact panel midline x=50.00%. Balance the visible calligraphic ink to look centered as one phrase, with equal optical left and right margins (nominally ${pct(left)}% each). ` : 'This is an intentionally positioned group: preserve this approved off-center axis and user nudge; do not force it to the panel midline. ')Judge the main visible strokes, not the invisible font box or a single long decorative flourish. Keep every character in its supplied box; make only small within-box optical adjustments, never shift the whole phrase, widen tracking, stretch glyphs or move one character out of the row to fake balance. Do not align the greeting to the face, flowers, lanterns, empty background space, reference wording, envelope back or flap. Decorations must adapt locally around the locked text, never push it left or right. Before returning, inspect the complete phrase against the approved axis and correct left/right drift in the same image. These axes and measurements are instructions only; never draw a centerline, ruler, box or numbers.
```

完整函式原始碼：

```javascript
export function greetingAlignmentBrief(glyphs, nudge=0) {
  if (!glyphs.length) return '';
  const left=Math.min(...glyphs.map(g=>g.x+nudge-g.size/2));
  const right=Math.max(...glyphs.map(g=>g.x+nudge+g.size/2));
  const center=(left+right)/2;
  const pct=value=>(value/89*100).toFixed(2);
  const centered=Math.abs(center-44.5)<0.001;
  return `GREETING HORIZONTAL ALIGNMENT LOCK: the complete lettering group has its approved axis at x=${pct(center)}% of the FRONT only; left boundary x=${pct(left)}%, right boundary x=${pct(right)}%. `+
    (centered ? `This is the exact panel midline x=50.00%. Balance the visible calligraphic ink to look centered as one phrase, with equal optical left and right margins (nominally ${pct(left)}% each). ` : 'This is an intentionally positioned group: preserve this approved off-center axis and user nudge; do not force it to the panel midline. ')+
    'Judge the main visible strokes, not the invisible font box or a single long decorative flourish. Keep every character in its supplied box; make only small within-box optical adjustments, never shift the whole phrase, widen tracking, stretch glyphs or move one character out of the row to fake balance. Do not align the greeting to the face, flowers, lanterns, empty background space, reference wording, envelope back or flap. Decoration must adapt locally around the locked text, never push it left or right. Before returning, inspect the complete phrase against the approved axis and correct left/right drift in the same image. These axes and measurements are instructions only; never draw a centerline, ruler, box or numbers.';
}
```

### `compactGreetingBrief(glyphs, direction, nudge=0)`

回傳字串模板（horizontal only；`vertical`/`double`/`stagger` 回傳空字串）：

```
COMPACT HORIZONTAL CALLIGRAPHY: one closely set phrase as a tight cluster, not separately spaced display letters. The complete row occupies only x=${(left/89*100).toFixed(2)}%-${(right/89*100).toFixed(2)}% of the front; never justify it to the canvas edges. Use full-bodied, naturally broad brush forms: ordinary square characters fill 90-100% of their box width as well as height. Target a small optical gap between neighbouring visible strokes, about 0-8% of one glyph height, with no touching, overlapping or merged radicals. No tracking, inserted spaces, narrow miniature characters inside large boxes, or extra decorative breathing room. Keep the supplied centers, character count and reading order. Preserve authentic character anatomy and the reference brush finish; never stretch strokes mechanically or imitate the guide font. The supplied layout overrides the reference text's spacing and position.
```

完整函式原始碼：

```javascript
export function compactGreetingBrief(glyphs, direction, nudge=0) {
  if (!glyphs.length || ['vertical','double','stagger'].includes(direction)) return '';
  const left=Math.min(...glyphs.map(g=>g.x+nudge-g.size/2));
  const right=Math.max(...glyphs.map(g=>g.x+nudge+g.size/2));
  return `COMPACT HORIZONTAL CALLIGRAPHY: one closely set phrase as a tight cluster, not separately spaced display letters. The complete row occupies only x=${(left/89*100).toFixed(2)}%-${(right/89*100).toFixed(2)}% of the front; never justify it to the canvas edges. Use full-bodied, naturally broad brush forms: ordinary square characters fill 90-100% of their box width as well as height. Target a small optical gap between neighbouring visible strokes, about 0-8% of one glyph height, with no touching, overlapping or merged radicals. No tracking, inserted spaces, narrow miniature characters inside large boxes, or extra decorative breathing room. Keep the supplied centers, character count and reading order. Preserve authentic character anatomy and the reference brush finish; never stretch strokes mechanically or imitate the guide font. The supplied layout overrides the reference text's spacing and position.`;
}
```

### `traditionalGreetingBrief(text)`

含 `SUBSTITUTES` 與 `FORM_NOTES` 表。回傳字串模板：

```
TRADITIONAL CHINESE CHARACTER-FORM LOCK (繁體正字): use the exact requested Traditional forms, including when the original or previous artwork contains Simplified, Japanese shinjitai, abbreviated cursive or malformed characters. ${forms} These character numbers, Unicode labels and forbidden examples are checking instructions only; never print them. Retain the original artwork’s clear brush style, natural thick-to-thin strokes and gold/ink finish, but never shorten, merge or omit structural strokes for calligraphic flair. Before returning, read the completed greeting one character at a time from the output itself and compare each written component against the requested form. Correct any Simplified or incomplete form in the same output. Do not switch to the website preview font, change the Step 3 positions/sizes, add extra text or return an explanation.
```

其中每個字的 `forms` 項為：

```
Character ${index+1}: ${JSON.stringify(char)} (${point})${SUBSTITUTES[char] ? `; forbidden substitute ${JSON.stringify(SUBSTITUTES[char])}` : ''}. ${FORM_NOTES[char] || 'Retain every component and stroke of this exact written form.'}
```

完整函式與常數原始碼：

```javascript
const SUBSTITUTES = Object.freeze({
  賀:'贺',發:'发',財:'财',樂:'乐',臨:'临',門:'门',萬:'万',歲:'岁',餘:'余',
  闔:'阖',體:'体',壽:'寿',雙:'双',東:'东',開:'开',貴:'贵',滿:'满',廣:'广',
  進:'进',寶:'宝',運:'运',業:'业',興:'兴',鴻:'鸿',圖:'图',陞:'升',學:'学',
  錦:'锦',題:'题',龍:'龙',馬:'马',當:'当',頭:'头',時:'时',來:'来',國:'国',
  團:'团',圓:'圆',願:'愿',長:'长',豐:'丰',慶:'庆',華:'华',順:'顺',夢:'梦',
  歡:'欢',無:'无',禮:'礼'
});
const FORM_NOTES = Object.freeze({
  臨:'Keep the complete 臣 component on the left; never reduce it to the abbreviated left side of 临.',
  門:'Keep the full traditional 門 gate, both upright sides and its internal upper strokes; never use the three-stroke 门.',
  發:'Keep the full lower 殳 component and the distinct internal strokes of 發; do not collapse it into 发 or substitute 髮.',
  財:'Keep the full 貝 on the left, including its inner strokes and two lower strokes; do not use 贝.',
  賀:'Keep 加 above a complete 貝; do not reduce the lower component to 贝.',
  福:'Keep 礻 on the left and the distinct 一, 口 and 田 structure on the right; do not merge the boxes.',
  喜:'Keep the complete stacked structure and separate mouth components; do not replace a single 喜 with 囍.'
});

export function traditionalGreetingBrief(text) {
  const chars=Array.from(String(text).trim());
  if(!chars.length) return '';
  const forms=chars.map((char,index)=>{
    const point='U+'+char.codePointAt(0).toString(16).toUpperCase().padStart(4,'0');
    return `Character ${index+1}: ${JSON.stringify(char)} (${point})${SUBSTITUTES[char] ? `; forbidden substitute ${JSON.stringify(SUBSTITUTES[char])}` : ''}. ${FORM_NOTES[char] || 'Retain every component and stroke of this exact written form.'}`;
  }).join(' ');
  return 'TRADITIONAL CHINESE CHARACTER-FORM LOCK (繁體正字): use the exact requested Traditional forms, including when the original or previous artwork contains Simplified, Japanese shinjitai, abbreviated cursive or malformed characters. '+
    forms+' These character numbers, Unicode labels and forbidden examples are checking instructions only; never print them. '+
    'Retain the original artwork’s clear brush style, natural thick-to-thin strokes and gold/ink finish, but never shorten, merge or omit structural strokes for calligraphic flair. '+
    'Before returning, read the completed greeting one character at a time from the output itself and compare each written component against the requested form. '+
    'Correct any Simplified or incomplete form in the same output. '+
    'Do not switch to the website preview font, change the Step 3 positions/sizes, add extra text or return an explanation.';
}
```

---

## 特殊修復 brief

來源：`style-repairs.js`。

### `rooftopPoseBrief`

用於 `cat`、`sample_017`、`sample_021`（`ROOFTOP_STYLES`）。

```
FULL-BODY ROOFTOP SEAT — replaces the previous behind-the-ledge portrait pose. For a human, show the complete seated figure from head to shoes: hips visibly resting ON the broad tiled roof edge, torso upright with a slight natural forward lean, one knee bent with that foot supported on the tiles, the other lower leg hanging naturally over the front edge. One hand rests on the bent knee and the other lightly supports the body on the tiles. Show the seat contact, coherent weight and a small contact shadow; keep the existing roof as the seat. Legs must remain in front of the roof edge and visible, not disappear behind it or pass through tiles. Preserve the uploaded face, apparent age, hair and natural expression; use age-appropriate fully clothed proportions and sensible footwear, not an adult model body. The posture is the reference, not a new face, suit or studio setting. Do not draw a stool, chair, studio backdrop, floating body, head-only portrait, waist-up crop, hidden legs or a giant head. Fit the full pose inside the supplied subject box without moving the roof or greeting. For multiple people keep each distinct seated figure; for an animal use its own natural supported rooftop sitting anatomy, never human legs. Keep branches and fruit outside the greeting ink area with only local adjustments.
```

### `repairs` 表（`styleRepairBrief` 內文）

各 key 的實際 brief 字串：

#### `cat`

```
Preserve the blue snowy sky, persimmon tree, roof slope, glazed tiles and architecture. Remove the sample dog completely. FULL-BODY ROOFTOP SEAT — replaces the previous behind-the-ledge portrait pose. For a human, show the complete seated figure from head to shoes: hips visibly resting ON the broad tiled roof edge, torso upright with a slight natural forward lean, one knee bent with that foot supported on the tiles, the other lower leg hanging naturally over the front edge. One hand rests on the bent knee and the other lightly supports the body on the tiles. Show the seat contact, coherent weight and a small contact shadow; keep the existing roof as the seat. Legs must remain in front of the roof edge and visible, not disappear behind it or pass through tiles. Preserve the uploaded face, apparent age, hair and natural expression; use age-appropriate fully clothed proportions and sensible footwear, not an adult model body. The posture is the reference, not a new face, suit or studio setting. Do not draw a stool, chair, studio backdrop, floating body, head-only portrait, waist-up crop, hidden legs or a giant head. Fit the full pose inside the supplied subject box without moving the roof or greeting. For multiple people keep each distinct seated figure; for an animal use its own natural supported rooftop sitting anatomy, never human legs. Keep branches and fruit outside the greeting ink area with only local adjustments.
```

#### `custom`

```
CUSTOM STYLE REF = LOOK ONLY. Identify medium, palette and decorative motifs from the style reference, then redraw the uploaded subject(s) in that look. Never copy the style reference's depicted person, animal, breed, face, pose silhouette, collar, costume character or mascot—even when it is a finished red-packet sample. Transfer activity or costume equipment only when it fits the uploaded anatomy and the user photo supplies that role (for example diving gear when the upload is a diver). WHEN the style reference depicts scuba divers AND the upload is a person intended for that scene, use a coherent hand-drawn underwater figure with a fitted wetsuit, buoyancy vest, tank, hoses, regulator, clear mask and fins, in a buoyant swimming pose; keep eyes and face identifiable through the mask; show bubbles and preserve blue water, rays, fish and coral. Do not put an ordinary cardigan portrait underwater. One uploaded child becomes ONE appropriately proportioned diver, not the two template divers; multiple uploaded subjects retain their own identities. For unrelated style references (cut-paper pets, florals, cartoon samples), keep scenery/medium only and place the uploaded identity with its own natural pose inside Step 3 geometry; never add diving gear or an ocean to an unrelated design.
```

#### `peony`

```
Use one continuous fine painted portrait treatment from hair and facial features through neck, clothing and hands, matching the printed floral illustration. Keep the complete head comfortably inside the subject box, with both shoulders readable; do not enlarge the face to the right edge. Lower peonies may overlap the lower torso naturally, never swallow a shoulder or face. Preserve the red field, gold botanical linework and flower positions. Keep the greeting at its supplied height, not automatically along the top edge.
```

#### `sample_001`

```
Redraw the whole face, hair, clothing and body in the same warm ink-and-gouache print treatment as the magenta cut-paper scene. Preserve recognizable eye shape, cheeks and hair without photographic skin or a sharp photo head on simplified clothing. Finish the lower silhouette with a deliberate clothing contour or natural overlap by an existing foreground wave; never fade the chest into pink mist, blur, transparent feathering or a floating cutout. Keep fish-scale patterns, waves and corner flowers.
```

#### `sample_002`

```
The sample cat and dog are disposable examples, not two compulsory roles. Remove BOTH. A single uploaded subject becomes one centered portrait in the shared subject area; never keep the dog as a companion. Preserve the yellow waves, green ribbons and blue crests in place. Use soft colored-pencil contours and broad matte color shapes across the whole figure. Keep a child's rounded cheeks and natural brow; no angular polygon facial planes, sharp adult jaw or hardened expression. Clear only small wave details immediately behind the specified lettering, so dark strokes do not merge into cobalt crests.
```

#### `sample_011`

```
Remove the entire lucky-cat example, including ears, paws and toy torso. Build a complete age-appropriate human or actual uploaded animal in clean hand-drawn flat illustration: confident contour, limited matte colors and two or three simple shadow shapes. Render face, neck, hands and clothing consistently; never retain photographic skin, glossy doll eyes or a realistic head above a cartoon body. Preserve the oranges, money bag, colored ground and surrounding festive motifs. Give the figure a supported seated pose with actual hands or species-appropriate limbs, not cat paws.
```

#### `sample_012`

```
Remove BOTH overlapping sample cats completely, including their heads, ears and paws. Do not recreate their embrace or expressions. Redraw the uploaded subject count only, with a supported waist-up portrait in the lower subject area. Preserve the pink ground, oranges, daisies and scattered marks; none is an identity reference.
```

#### `sample_014`

```
Retain the fine gold daffodils AND the red diamond ornament with its delicate gold surround; do not erase the ornament to make a portrait. Remove old wording from it when necessary. Paint the complete uploaded portrait in a coherent delicate watercolor medium with recognizable features. Keep flowers outside the face and the requested large compact greeting at its exact boxes; never shrink or lift the text to make room for the diamond. If overlap occurs, simplify only the small ornament details directly under the strokes while retaining its silhouette.
```

#### `sample_017`

```
Replace the entire orange sample cat, not just its costume or expression. Preserve the snowy tiled roof, red wall, blue sky and persimmon tree. FULL-BODY ROOFTOP SEAT — replaces the previous behind-the-ledge portrait pose. For a human, show the complete seated figure from head to shoes: hips visibly resting ON the broad tiled roof edge, torso upright with a slight natural forward lean, one knee bent with that foot supported on the tiles, the other lower leg hanging naturally over the front edge. One hand rests on the bent knee and the other lightly supports the body on the tiles. Show the seat contact, coherent weight and a small contact shadow; keep the existing roof as the seat. Legs must remain in front of the roof edge and visible, not disappear behind it or pass through tiles. Preserve the uploaded face, apparent age, hair and natural expression; use age-appropriate fully clothed proportions and sensible footwear, not an adult model body. The posture is the reference, not a new face, suit or studio setting. Do not draw a stool, chair, studio backdrop, floating body, head-only portrait, waist-up crop, hidden legs or a giant head. Fit the full pose inside the supplied subject box without moving the roof or greeting. For multiple people keep each distinct seated figure; for an animal use its own natural supported rooftop sitting anatomy, never human legs. Keep branches and fruit outside the greeting ink area with only local adjustments.
```

#### `sample_018`

```
Keep the red paper-cut scenery, lanterns, architecture, clouds, gold contours and decorative plaque. Remove the corgi completely. Redraw face, hair, hands and clothing together in layered matte paper illustration with natural recognizable facial proportions; no photographic face above a paper body. The original small upper-right 2-by-2 wording is NOT a layout instruction: erase it. A requested horizontal greeting must be ONE large compact row at the supplied centers, never two rows, tiny spread-out characters or squeezed into the plaque. Preserve the plaque as a blank ornament if it does not obstruct the requested text. Clear local lantern tassels or gold lines behind the first character rather than moving or shrinking the greeting.
```

#### `sample_019`

```
Keep the large suspended red lantern at its original scale and position, fully within its original framing; never shift it upward or rightward into the greeting or crop it off. Preserve the courtyard floor at the bottom. The replacement subject must be on the ground inside the supplied lower subject box with visible contact shadows; NEVER float, levitate or climb into the sky. Redraw a complete standing or seated human with natural age-appropriate head-to-body proportions, real eye size, visible sclera when present in the source, and recognizable face shape, hair and expression. Use soft matte storybook painting throughout instead of the template's chibi toy anatomy. No giant black button eyes, huge spherical head, stubby toy body or generic doll face. For animals preserve their own anatomy and markings.
```

#### `sample_020`

```
Preserve the gold courtyard, architecture and flowing red ribbon; seat the uploaded subject naturally on the visible supported foreground with contact shadow, keeping recognizable age and expression. Keep the requested greeting at its exact vertical position. Separate warm-gold ink from bright golden scenery by locally reducing background highlights and detail underneath the strokes, with the same scene colors. Do not make the text smaller, move it to the top, add a plaque or use a thick outline.
```

#### `sample_021`

```
Remove the round-faced sample kitten completely. Preserve the snowy turquoise roof, red wall and persimmon tree. Use the uploaded face and age rather than generic baby-doll proportions. FULL-BODY ROOFTOP SEAT — replaces the previous behind-the-ledge portrait pose. For a human, show the complete seated figure from head to shoes: hips visibly resting ON the broad tiled roof edge, torso upright with a slight natural forward lean, one knee bent with that foot supported on the tiles, the other lower leg hanging naturally over the front edge. One hand rests on the bent knee and the other lightly supports the body on the tiles. Show the seat contact, coherent weight and a small contact shadow; keep the existing roof as the seat. Legs must remain in front of the roof edge and visible, not disappear behind it or pass through tiles. Preserve the uploaded face, apparent age, hair and natural expression; use age-appropriate fully clothed proportions and sensible footwear, not an adult model body. The posture is the reference, not a new face, suit or studio setting. Do not draw a stool, chair, studio backdrop, floating body, head-only portrait, waist-up crop, hidden legs or a giant head. Fit the full pose inside the supplied subject box without moving the roof or greeting. For multiple people keep each distinct seated figure; for an animal use its own natural supported rooftop sitting anatomy, never human legs. Keep branches and fruit outside the greeting ink area with only local adjustments.
```

#### `sample_022`

```
The grey-brown tabby kitten is not an identity source. Remove its face, ears, fur, paws and tail completely. Keep the lion headdress, embroidery, ribbons and glowing S-shaped trail as transferable design elements. Dress a human in a fitted festive jacket with human arms and hands, keeping the real face visible within the headdress. Preserve age, hairline, eye shape and expression; no kitten anatomy or generic mascot face.
```

#### `sample_023`

```
Remove both pandas; use only the uploaded subject count in the LOWER approved subject area. Keep the figure small enough to reveal the red lanterns, snowy buildings and courtyard depth around it; do not turn the scene into a close-up headshot. Preserve the snowball activity with a small snowball held in natural hands or placed beside an animal as anatomy allows. Use a supported snowy-ground pose with a contact shadow and coherent winter lighting. Keep the face clear and all costume inside the box.
```

#### `sample_031`

```
Remove the template woman completely, including her adult torso and beauty-model face. Redraw the uploaded subject as one coherent hand-painted botanical illustration, with clear restrained linework and matte gouache shading from face and hair through neck, hands and clothes. Use natural child proportions when the source is a child and an age-appropriate purple festive jacket; do not attach a photo head to an adult qipao body. Preserve sage ground, purple lattice circles and yellow-purple peonies. No porcelain skin, glossy anime eyes, airbrushed beauty face or photographic skin against outlined clothing. Existing lower flowers overlap the lower body naturally while the face stays unobstructed.
```

#### `sample_036`

```
Remove BOTH template adults entirely. Keep the uploaded count only: one child is one child, not a couple or a miniature adult. Draw the complete person in a coherent clean hand-drawn floral-card medium with confident simple contours, matte flat color and restrained shading; redraw the face in that same medium while retaining its individual proportions. Use age-appropriate red festive clothing and natural hands. No photographic head on an outlined torso, generic pretty-model face, doll eyes or glossy skin. Preserve the red ground and pink, lilac and yellow flower border; use existing foreground flowers to finish the lower silhouette naturally.
```

#### `sample_044`

```
Remove the rabbit completely. Integrate the whole uploaded figure into the red-and-gold botanical illustration with consistent painted detail. Extend a naturally proportioned clothed torso to the existing lower peonies so their foreground petals overlap it with a clean occlusion boundary; do not leave a tiny disconnected bust floating in the red middle. Preserve readable shoulders and face. No red fog, dissolved chest, blurred feather mask, white halo or photo rectangle. Keep the peonies and gold linework, adjusting only the narrow contact area for natural depth.
```

#### `sample_047`

```
Remove the entire original panda performer, including black rounded paws, animal torso, head and stubby legs. Rebuild a complete age-appropriate human body when the source is human, with visible human hands, articulated knees, sensible shoes and coherent head-to-body proportions. Transfer the lion-dance headdress and embroidered festive clothing onto this new body; do not paste the face into the panda toy. Keep the face visible, individually recognizable and naturally illustrated across both head and body. Use a supported standing festival pose with feet on the street and contact shadows. Preserve street architecture and lanterns. Reduce bright sky highlights locally under the exact greeting boxes for clear gold strokes; do not shift lettering or add a text panel.
```

### `styleRepairBrief(style, {originalIndex, hasTemplate, hasOriginal})` 包裝模板

```
AUDIT REPAIR — overrides template pose/proportion shorthand: ${repairs[style]} Image 1 is the primary identity source; ${hasTemplate && hasOriginal ? 'Image 2 is the clean scene to preserve; ' : ''}Image ${originalIndex} provides art technique, activity and decoration only, never identity or mandatory character count. Count intended foreground subjects from the uploaded photo(s). Whole-figure rendering must be consistent: redraw facial features, hair, neck, hands and clothing in the same selected medium; no photographic face attached to an illustrated body. Retain distinctive natural features and apparent age rather than smoothing everyone into one stock face. Children retain their natural proportions and expression; no adult makeover, enlarged doll eyes, airbrushed beauty face or generic model substitution. ${ROOFTOP_STYLES ? 'Even a close-up source supplies identity for the complete seated pose; do not fall back to a half-body portrait. ' : 'A close-up source supplies identity, not an obligation to copy its crop. Follow the style-specific supported pose and complete its visible body with appropriate clothing. '}Keep the approved subject box and exact glyph centers and sizes. Preserve major background anchors and adjust only small competing details behind lettering; never shift the greeting upward or spread its characters to avoid motifs. Natural foreground occlusion or ground contact must connect the figure to the scene, never a dissolving cutout. Do not invent another person or import incidental source-background props and bystanders. No white photo panel or white backdrop; colored scenery must cover the full front.
```

### `peopleSeries` / `peopleSeriesBrief(style)`

前綴固定：

```
HUMAN PORTRAIT SERIES — apply the following only to uploaded people; retain species-appropriate anatomy and the existing style direction for animals: ${peopleSeries[style]} Recognition of the uploaded person comes before generic cuteness. Preserve their natural expression; do not force a smile or add teeth. The exact uploaded count, chosen Traditional Chinese greeting and approved subject/glyph geometry remain mandatory. This specific rendering and pose direction takes priority over conflicting template-character shorthand; it must not move the background landmarks or lettering.
```

各 style 的實際字串：

#### `horse`

```
LION PORTRAIT: retain the elaborate white lion headdress, embroidered red/turquoise jacket, lantern architecture and amber light trails. Give the face priority inside the hat opening: preserve eye spacing, nose, cheeks, jaw and fringe without widening eyes or smoothing away character. Use natural portrait lighting across face, neck and textile; keep the hat fitted to the real head rather than replacing it. Show enough shoulders and jacket to read as a dressed person. No toy body, animal paws or added grin. Keep a clear interval between hat and the exact large greeting.
```

#### `sample_012`

```
FRUIT STORYBOOK PORTRAIT: keep the pink ground, oranges, daisies and playful marks. Use gentle colored-pencil and watercolor illustration consistently over face, hair and clothing, with natural facial landmarks; do not turn the child into an anonymous doll. Face mostly toward the viewer, retaining the original gaze and expression where possible. Form a complete clothed waist-up silhouette with readable shoulders and deliberate painted lower edges; no detached head or blur vignette. Keep oranges and flowers away from eyes and the exact greeting strokes. One source subject replaces both sample cats without inheriting their embrace.
```

#### `sample_020`

```
GOLD COURTYARD PORTRAIT: give the person a physically supported seated pose on an existing low step or ground-level support inside the approved box, with natural visible hands and child-sized limbs where appropriate. Red silk flows through the foreground and beside the person; it is decoration, not a floating seat or hammock. Use coherent warm light on face, clothing and architecture. Preserve the familiar face and calm expression. Retain scene depth around the silhouette. Dim only the gold glare immediately behind the approved text so every gold stroke reads without an outline or rectangle.
```

#### `sample_022`

```
LION AND GOLD TRAIL: use a naturally proportioned festive portrait with a fitted lion hat and richly embroidered jacket. Retain the source expression and identifiable eyes, nose, cheeks and hairline; the headdress frames the face without hiding the eyebrows. Preserve the luminous S-shaped trail around the figure, not crossing eyes or text. Match the soft portrait light to the warm surrounding glow, avoiding a hard cutout seam at neck or collar. Keep the subject confidently inside its box with visible shoulders, never a tiny face on a kitten body.
```

#### `sample_023`

```
SNOW PLAY PORTRAIT: fit a complete kneeling or seated clothed figure in the lower subject box, head turned toward the viewer so both eyes and the familiar face read clearly. Preserve natural age and source expression; do not substitute a smiling stock child. Place one small snowball in visible natural hands; for a group share a coherent snow-play activity without extra figures. Keep the red lanterns, snowy roofs and courtyard visible around the body. Use warm, coherent portrait rendering across face, hands and clothes, with a visible snow contact shadow; never enlarge to a full-frame headshot.
```

#### `sample_024`

```
CAMPFIRE STORYBOOK: preserve the central fire, logs, bamboo, flowers and fireworks. Place the uploaded subject in its assigned side slot, seated on the ground with sensible limbs. Turn the head toward the viewer in a mild three-quarter view with both eyes visible; do not use a tiny profile face. Preserve the actual hair, cheeks, eyes and apparent age in a gentle hand-painted storybook style with warm firelight on the inward side. One source replaces the left role only, with no original child or panda remaining. Keep the fire separate from clothes and hands. Face and upper body must remain clear at small print size; do not trade likeness for generic cuteness.
```

#### `sample_031`

```
PURPLE BOTANICAL HAND-DRAWN PORTRAIT: rebuild the whole figure rather than reuse the template adult torso. Use clean hand-drawn contours and two or three matte gouache shadow tones on BOTH face and clothing; no photographic skin, airbrushed gradient face or glossy doll eyes. Keep the uploaded person recognizable through their real hair silhouette, eyes, nose, cheeks and expression. A child wears an age-appropriate purple festive jacket with natural child proportions, not an adult fitted qipao or makeup. Preserve green ground, purple lattice and yellow-purple peonies, with lower flowers naturally framing a visible torso.
```

#### `sample_036`

```
RED FLORAL HAND-DRAWN PORTRAIT: use a confident flat illustrated figure with human warmth and recognizable individual features, consistent line weight and matte color over face, neck, hands and clothes. Do not paste a realistic head onto the template outlined jacket. Keep the exact uploaded count; one child replaces the entire sample couple, while two people or a family keep separate faces in natural grouping. Use age-appropriate red festive clothing, without adult makeup, beauty-filter features or forced smiles. Preserve the red ground and floral border, with enough visible shoulders and torso to feel like a finished portrait rather than a face in a flower hole.
```

#### `sample_039`

```
TEAL FLORAL PORTRAIT: preserve the deep teal field and cream flowers as a framing border. Make a natural recognizable bust with complete shoulder contours, matching fine gouache treatment across face, hair and clothing. Keep the source skin tone and expression; use restrained warm edge lighting and slightly separated background tones so dark hair and green clothing remain distinct from the teal ground. Flowers may overlap the lower torso but never the cheek, chin or eyes. No floating isolated head, stock beauty face, white haze or added flowers filling the central opening.
```

#### `sample_041`

```
WATERCOLOR KEEPSAKE: preserve jade washes, pink roses and small blossoms. Paint the same individual with subtle watercolor pigment across both face and clothes, retaining eye shape, cheek fullness, hairline and age. Keep facial landmarks crisp enough to identify at a small printed size, while soft pigment edges belong mainly to clothing and background. Let existing lower foliage naturally overlap the lower torso; never erase the chest into a fog patch. Keep both shoulders readable and flowers clear of the face. Gentle does not mean beauty-filtered or generic.
```

### `peopleCartoonBrief(style)`

僅對 `peopleSeries` 內、且非 `horse`／`sample_022` 的 style 回傳；否則空字串。固定全文：

```
USER-REQUESTED STRONGER CARTOON TREATMENT — HUMAN SUBJECTS ONLY: for every uploaded person, render a clearly hand-drawn 2D storybook cartoon, visibly illustrated even at thumbnail size. This overrides photographic, fine realistic portrait, modeled 3D or soft realistic painting instructions elsewhere for human figures in this series. Use confident slightly organic outlines, broad matte color shapes and only two or three simple shadow tones. Draw hair as a few recognizable shaped locks, not thousands of glossy strands. Build the face with economical drawn eyelids, brows, nose and mouth; remove photographic pores, airbrushed skin, lens shading, realistic skin gradients and tiny catchlight textures. Apply the SAME degree of simplification to face, neck, hands, clothing and accessories; never put a realistic face on a flat cartoon body. Keep the exact person recognizable through their actual face shape, eye shape and spacing, fringe, nose, cheeks and natural expression. Cartoon character comes from line and shape, not enlarged eyes, a spherical baby head, an adult makeover, a generic cute child or forced smile. Keep age-appropriate human shoulders, elbows, hands and clothing sleeves; no animal forelegs, black furry paws or plush mascot body. Simplify costume embroidery into readable drawn motifs. Preserve the original background landmarks, colors, motif positions and composition; harmonize their surface shading into compatible illustrated color shapes where necessary, without replacing the scenery, creating a white backdrop or shifting any objects. Preserve the selected Traditional Chinese calligraphic treatment, exact glyph geometry and compact spacing; cartoon rendering must not turn lettering into bubble type. For animal-only uploads retain the existing animal style. For mixed groups cartoonize the people and harmonize the finish while retaining each animal species, anatomy and markings. Keep all uploaded identities and their approved positions.
```

### `lionAnatomyBrief(style)`

僅 `sample_022`、`sample_047`。

#### `sample_022`

```
FINAL LION-COSTUME ANATOMY CHECK — evaluate EACH uploaded subject separately. For an uploaded HUMAN, rebuild the ENTIRE figure as a human portrait: a fitted lion headdress framing the real face, human neck and shoulders, an embroidered jacket with two sleeves and human hands, and age-appropriate trousers if the lower body is visible. Use an upright seated human pose; hips rest on the lit ground and any visible legs bend naturally in front, with human footwear. A waist-up crop may end naturally at the approved subject-box edge. The original animal silhouette is NOT a human pose: replace its torso and limbs, not only its face. Never put a human head on striped fur, four animal legs, paws, a tail or a crawling cat-shaped costume. For an uploaded ANIMAL, keep that animal’s own species, body, limbs, markings and natural supported pose; do not give pets a human torso or hands. For mixed groups apply the correct anatomy separately to each identity and retain their assigned boxes. Transfer ONLY the lion hat, jacket embroidery, ribbons and warm lighting from the sample. Preserve all background anchors and the exact greeting layout. This species-specific body construction overrides conflicting sample pose or fur-rendering shorthand.
```

#### `sample_047`

```
FINAL LION-COSTUME ANATOMY CHECK — evaluate EACH uploaded subject separately. For an uploaded HUMAN, rebuild the ENTIRE figure as a human portrait: a fitted lion headdress framing the real face, human neck and shoulders, an embroidered jacket with two sleeves and human hands, and age-appropriate trousers if the lower body is visible. Use a naturally proportioned standing human figure with two human legs in trousers and two ordinary festive shoes on the ground. Keep visible human fingers at the sleeve openings, not black furry gloves, clawed slippers or a short mascot body. The original animal silhouette is NOT a human pose: replace its torso and limbs, not only its face. Never put a human head on striped fur, four animal legs, paws, a tail or a crawling cat-shaped costume. For an uploaded ANIMAL, keep that animal’s own species, body, limbs, markings and natural supported pose; do not give pets a human torso or hands. For mixed groups apply the correct anatomy separately to each identity and retain their assigned boxes. Transfer ONLY the lion hat, jacket embroidery, ribbons and warm lighting from the sample. Preserve all background anchors and the exact greeting layout. This species-specific body construction overrides conflicting sample pose or fur-rendering shorthand.
```

---

## 檔案路徑對照表

| 路徑 | 內容 |
|---|---|
| `/workspace/red-packet/server/worker.js` | 主路徑組裝、OpenRouter API、`seedream-5-0-lite` |
| `/workspace/red-packet/server/style-prompts.js` | `STYLE_PROFILES`、`styleBrief`、`letteringBrief` |
| `/workspace/red-packet/server/photo-style-prompts.js` | `buildPhotoStylePrompt`、media natural/cartoon/watercolor |
| `/workspace/red-packet/server/greeting-script.js` | `traditionalGreetingBrief`、`compactGreetingBrief`、`greetingAlignmentBrief` |
| `/workspace/red-packet/server/style-repairs.js` | `styleRepairBrief`、`peopleSeriesBrief`、`peopleCartoonBrief`、`lionAnatomyBrief`、`rooftopPoseBrief` |
| `/workspace/tutorial/eprint-ai-image-prompts.md` | 本文件 |

