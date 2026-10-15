# iPhone 18 Pro Max: internal layout sheet (for the isometric exploded-view model)

Compiled 2026-10-15. All lengths in mm. Scope: US-style eSIM Pro Max unless stated (pSIM differences noted).

## 0. Read this first

**Frame of reference.** FRONT view, display removed. Origin = top-left outer corner of the body; x runs right 0 to 78.0, y runs down 0 to 163.4. Right edge = power + Camera Control. Left edge = Action, volume, SIM slot. Back-view x from Apple's drawings is converted: x_front = 78.0 - x_back.

**Confidence codes.**
- **C** = stated or dimensioned in an 18 Pro Max source (Apple dimensional drawing, Apple repair manual, iFixit 18 PM guide/teardown).
- **M** = I measured it off an 18 Pro Max photo or CT, +/-1 to 1.5 mm. Calibrated against C values (Dynamic Island centre y, IR sensor position, lens centres all agree within 0.7 mm). Counts as "confirmed for 18 PM, position approximate".
- **I** = inferred from the 18 Pro, 17 Pro or 17 Pro Max.
- **G** = guess. Do not treat as data.

**Method for M values.** iFixit's launch-week wallpaper `iPhone_18_Pro_Max_Wallpaper_NoBattery-1.png` is 1320x2868 (the 18 PM screen resolution). I assumed it spans the 72.9 x 158.4 mm active area (1320/460 ppi x 2868/460 ppi), centred on the body: offset +2.55 mm in x, +2.5 mm in y. Cross-checked with Apple's front-sensor positions, lens centres, the Lumafield CT, and Apple's Internal View photo. Vertical error may grow to about 1 to 2 mm toward the bottom.

**Flags and corrections to your known list.**
1. **Battery tray screw count.** iFixit's teardown text says 13, but that is the **18 Pro**. The **18 Pro Max has 14 Torx Plus 4IP screws** (1 x 5.7 mm, 2 x 3.5 mm, 11 x 3.7 mm; Apple's screw table also lists 14). The 18 Pro has 13 (1 x 5.7, 2 x 3.5, 10 x 3.7). [S5, S8, S10]
2. **Vapor chamber vs battery.** Apple's exploded view calls it "Vapor chamber (attached to battery)". The VC and the battery tray are one replaceable assembly, not welded to the chassis. iFixit's 17 Pro teardown says Apple's VC is modular, unlike Samsung's glued one. [S9, S12]
3. **IR camera.** Apple's drawing puts the IR "forward-facing sensor" at (14.07, 7.91). The display, not the enclosure, carries the foam rings, window and ambient light sensor (ALS) flex over it. [S11, S10]
4. **Back glass is big.** About 70.3 x 110.8 mm, not a small coil patch. Only the camera plateau is separate. [S11]
5. **No Chinese-language teardown** (微机分 / 爱否) turned up for the 18 PM. Chinese coverage found (mrmad, UDN, Weibo, Bilibili titles) only re-reports iFixit/REWA/TechInsights.
6. Apple's dimensional drawing carries a proprietary notice ("do not reproduce or publish"). The numbers below are quoted for modelling reference only; do not republish the drawing.

## Sources (IDs used in the tables)

| ID | Source | URL |
|---|---|---|
| S1 | iFixit 18 Pro / Pro Max teardown (article) | https://www.ifixit.com/News/119329/inside-the-tiny-unfixable-eye-iphone-18-pro-and-pro-max-teardown |
| S2 | iFixit wallpaper, 18 PM, no battery (front view) | https://valkyrie.cdn.ifixit.com/media/2026/09/22224842/iPhone_18_Pro_Max_Wallpaper_NoBattery-1.png |
| S3 | iFixit wallpaper, 18 PM, battery/tray fitted | https://valkyrie.cdn.ifixit.com/media/2026/09/22224841/iPhone_18_Pro_Max_Wallpaper_Battery-1.png |
| S4 | iFixit/Lumafield CT, 18 PM (colour and BW) | https://valkyrie.cdn.ifixit.com/media/2026/09/22224836/iPhone_18_Pro_Max_CT-1.png , https://valkyrie.cdn.ifixit.com/media/2026/09/22224827/iPhone_18_Pro_Max_CT_BW-1.png |
| S5 | iFixit 18 PM battery guide + screw-map photo | https://www.ifixit.com/Guide/iPhone+18+Pro+Max+Battery+Replacement/238626 , https://guide-images.cdn.ifixit.com/igi/yTfmeBEH3SJM3Mfc.full |
| S6 | iFixit 18 PM back glass guide + photo | https://www.ifixit.com/Guide/iPhone+18+Pro+Max+Back+Glass+Replacement/240031 , https://guide-images.cdn.ifixit.com/igi/O4LyTm2n5cvVS3KO.full |
| S7 | iFixit 18 PM screen guide | https://www.ifixit.com/Guide/iPhone+18+Pro+Max+Screen+Replacement/238624 |
| S8 | iFixit 18 Pro battery guide (13 screws) | https://www.ifixit.com/Guide/iPhone+18+Pro+Battery+Replacement/240027 |
| S9 | Apple 18 PM Internal View / Exploded View | https://support.apple.com/en-us/127628 (images: https://cdsassets.apple.com/live/SZLF0YNV/service-documentation/iphone/127628/127628_Internal_View.png , .../127628_Exploded_View.png) |
| S10 | Apple 18 PM Repair Manual (index 127626; screws 127629; display 127631; back glass 127632; battery 127633; camera 127634; front camera 127635; top speaker 127636; bottom speaker 127637; Taptic 127639; main mic 127641; USB-C 127643; logic board 127645; enclosure 127647) | https://support.apple.com/en-us/127626 |
| S11 | Apple accessory dimensional drawing, iPhone 18 Pro Max (PDF, 2026-09-21) | https://developer.apple.com/download/files/accessories/dimensional-drawings/iphone-18-pro-max.pdf |
| S12 | iFixit 17 Pro teardown | https://www.ifixit.com/News/113388/iphone-17-pro-teardown |
| S13 | iFixit 17 Pro/Max guides + chip ID | https://www.ifixit.com/Guide/iPhone+17+Pro+Max+Battery+Replacement/198146 , https://www.ifixit.com/Guide/iPhone+17+Pro+Rear+Camera+Assembly+Replacement/207381 , https://www.ifixit.com/Teardown/iPhone+17+Pro+Chip+ID/196117 |
| S14 | iFixit teardown photos: VC/tray Pro vs Max; battery Pro vs Max; boards Pro vs Max; full layout (18 Pro) | https://valkyrie.cdn.ifixit.com/media/2026/09/20195315/iPhone-18-TD_3-copy.jpg , .../20195348/iPhone-18-TD_2-2.jpg , .../20112941/iPhone_18_TD_1068b.jpg , .../20112936/iPhone-18-TD_78.jpg |
| S15 | iThinkDiff (JerryRigEverything teardown summary) | https://www.ithinkdiff.com/iphone-18-pro-teardown-shows-quick-screen-repairs-and-a-larger-vapor-chamber/ |
| S16 | 瘋先生 mrmad (REWA/TechInsights/iFixit digest) | https://mrmad.com.tw/?p=191697 |
| S17 | UDN (Chinese iFixit digest) | https://tech.udn.com/tech/story/123151/9768830 |
| S18 | TechInsights 18 PM teardown | https://www.techinsights.com/blog/apple-iphone-18-pro-max-teardown |
| S19 | 9to5Mac 17 Pro teardown digest | https://9to5mac.com/2025/09/23/iphone-17-pro-teardown-reveals-vapor-chamber-internals-scratchgate-details-more/ |
| S20 | iFixit guide photo, bottom edge (17-series phone) | https://guide-images.cdn.ifixit.com/igi/rfjGySSoZXYHqFV4.full |

## 1. Layer stack, front to back

Total body 8.75 mm [C]. Plateau top and lens barrel tops are measured off Apple's side-view drawing (S11): plateau top **11.6 mm** from the display surface, lens barrels up to **13.65 mm** [C, +/-0.1].

| # | Layer | Thickness | Conf | Notes / source |
|---|---|---|---|---|
| 1 | Cover glass (Ceramic Shield 2) | ~0.7 | G | Spec per iFixit device page https://www.ifixit.com/Device/iPhone_18_Pro_Max |
| 2 | OLED panel 6.9" 2868x1320 + touch; black graphite/film sheets on its back (large L-shaped sheet); **white plastic bezel/frame** on the underside perimeter (cracked in 3 of 4 iFixit units); thin metal clips under the glass; foam rings and window over the IR camera; ALS + display flex tail on the left | ~0.4 to 0.6 (panel only) | G | S1, S7, S14 |
| 3 | Display adhesive: frame-shaped PSA sheet, cut-out for the front camera, notches top and bottom, multi-liner. Heat 70 C for 15 min, then 72 C for 10 min | ~0.15 to 0.25 | G | S1, S7, S10 (adhesive 923-14750) |
| 4 | **Battery tray + vapor chamber plate** (one assembly, stepped outline, dimpled, 14 Torx Plus 4IP screws). Embossed to clear the tall main-camera module | ~0.4 to 0.6 | G | S3, S14, S9 ("VC attached to battery") |
| 5a | Lower ~60 % of the interior: **battery cell** (L-notched, metal case, e-adhesive to the tray, 12 V ~90 s to release) | ~5.5 (derived: 21.751 Wh at ~750 Wh/L = ~29 cm3 over ~5200 mm2) | G | S1, S4 |
| 5b | Upper ~35 %: TIM (grey spongy gap filler) + **"thermal chain mail"** metal mesh -> **A20 Pro + memory beside it** on the OUTER face of the **two-layer logic-board sandwich** -> NAND and power ICs between layers -> RF board (modem, N1, FEMs) | board stack ~1.2 to 1.6 incl. parts | G | S1, S13 chip ID, S18 |
| 5c | Bottom strip: bottom speaker, USB-C connector, Taptic Engine (no VC plate over them) | Taptic ~4 to 5 | G | S9, S2 |
| 6 | Rear graphite/black film sheet on the enclosure floor, with a round die-cut opening (see 2.5) | ~0.1 to 0.2 | G | S2, S6 photo |
| 7 | Aluminium unibody floor + sidewalls (antenna splits on the frame) | ~0.4 to 0.6 | G | S11 side views |
| 8 | Back glass (MagSafe coil + magnets bonded on its inside), perimeter adhesive sheet 923-14751 | ~0.7 | G | S6 |
| 9 | Camera plateau (aluminium, integral with the unibody) with three camera modules behind it | plateau top 11.6; lenses 13.65 | C | S11 |

Heights to treat as a budget only: 0.7 + 0.5 + 0.2 + 0.5 + 5.5 + 0.15 + 0.4 + 0.7 = 8.65, leaving ~0.1 slack. Every number except the 8.75 / 11.6 / 13.65 is a guess.

Apple's own exploded-view order (S9): display -> display adhesive -> VC (attached to battery) -> battery; small parts (bottom speaker, Taptic Engine, USB-C connector, main mic, top speaker, front camera, camera, logic board, cowlings) -> enclosure -> back glass adhesive -> back glass.

## 2. Placement map

### 2.1 Body and exterior references (Apple's dimensional drawing, S11)

| Item | Value | Conf |
|---|---|---|
| Body | 163.4 x 78.0 x 8.75; centre line x = 38.99; geometric centre y = 81.71; top corner radius ~11.7 | C |
| **Camera plateau (island)** | x 5.0 to 73.0, y 4.9 to 42.9 (about 68 x 38); base footprint x 3.9 to 74.0. It spans almost the full width. Top face 11.6 mm from the display surface | C (measured off drawing, +/-0.3) |
| **Rear lens centres** (back-view x, y) -> front-view x | UW (cam 1, 125 deg zone): (14.1, 14.1) -> **x 63.9**. Main (cam 2, 90 deg): (14.15, 33.8) -> **x 63.85**. Tele (cam 3, 34 deg): (32.8, 24.1) -> **x 45.2**. Lens ring diameter 14.66 each | C (+/-0.3) |
| Flash / LiDAR / mic hole | (64.15, 13.75), (64.15, 34.1), (64.15, ~23.9) back-view -> **front-view x 13.85**; flash and LiDAR rings 6.77 dia; mic hole ~1.1 dia. So from the front, **lenses are on the right (x 45 and 64) and flash/LiDAR on the left (x 14)** | C |
| **Back glass** | x 3.8 to 74.1 (70.3 wide), y 48.7 to 159.5 (110.8 tall), inset 3.8 to 3.9 on the sides and bottom. The plateau foot meets its top edge | C (measured, +/-0.2) |
| **MagSafe** | centre (38.99, 81.71). Apple keepout 57.5 dia (no metal/magnetic); wider R49.39 "no permeable material except MagSafe magnets" zone. Magnet ring seen in CT: ~50 to 53 dia (M); a rectangular strip x 36 to 42, y 113 to 132 sits under the ring (M, role G) | C / M |
| Compass keepout | front-view x 28.2, y 157.45 | C |
| **Camera Control** | right edge, centre **y ~109** (108.6 to 109.5), slot 17.5 x 3.4; keepout 25.0 long (29.7 for thin cases) | C / M |
| **Power button** | right edge, centre **y ~54**, ~17 long | M |
| **Action button** | left edge, centre **y ~34.2**, ~7.4 long | M |
| **Volume up / down** | left edge, centres **y ~48.4** and **~62.6**, each ~11.7 long | M |
| **SIM slot** (physical-SIM models only) | left edge, centre y ~125.3, spans ~115.6 to 135.1, pinhole at ~116.5. eSIM-only models have no tray | M |
| USB-C | bottom edge, centred x 39, slot ~9.3 wide. Two PL1.1 (P2) 7.5 mm pentalobe screws at x = 39 +/- 7.3. Speaker/mic grille hole rows at x ~14 to 27 and ~52.6 to 65.5, 7 holes each | I (from 17-series photo S20; Apple confirms two screws, S6) |
| **Dynamic Island** | cut-out keepout 15.68 x 6.07, centre (38.99, 7.90) | C |
| IR "forward-facing sensor" | centre **(14.07, 7.91)**, aperture 3.68 dia (R1.84) | C |
| ALS / front-sensor window | 5.55 x 1.40, centre x 24.93, y ~10.06 to 11.46 | C |
| Receiver (earpiece) slot | 28.85 long, centred x 39, ~1.2 below the top edge, ~0.45 tall (labels 1.15 / 0.45, reading approximate) | C / M |
| Antenna splits on the sidewalls | horizontal break lines across both sidewalls at y ~15 to 19 (top) and ~141 to 144 (bottom). Apple no-metal zones: y <= 58.01 full width; y >= 131.09 at x <= 14.2 and x >= 63.78; y >= 136.62 for x 14.2 to 27.53; y >= 149.23 for x 27.53 to 63.78. iFixit/Apple both say to stop prying "before the antenna line / at the antenna bands" on the left and right edges | C (zones) / I (splits) |

### 2.2 Interior, front view, display removed (x, y in mm; M unless stated)

| Part | Position / extent | Size | Conf | Notes / source |
|---|---|---|---|---|
| **Front camera array** (one orderable part, 3 flex cables lifted as a group, no screws, foam on flex ends) | x 30 to 49, y 4 to 13 | island 15.68 x 6.07 | C / M | S10 front camera; S2 |
| ...IR camera module (left) | centre (14.1, 7.9); module x 9.5 to 18.5, y 4 to 11 | ~9 x 7; lens ring ~5.6 | C (centre) / M | green IR coating, metal bracket |
| ...bracket strip with slot and two holes (flood / proximity?) | x 18 to 30, y 4 to 8 | ~12 x 3 | M (role G) | S2 |
| ...square-window module (dot projector?) | centre (33.8, 8.1) | ~7.7 x 8.2 | M (role I) | S2 |
| ...18 MP selfie camera | centre (43.6, 7.7) | ~11 x 8.4 | M | S2 |
| **Top speaker** | Apple lists 3 Torx Plus 4IP screws, spring contacts, no flex. Acoustic slot at the top edge (see 2.1). Body location not resolved | unknown | G | S10. The mesh-covered pad at x 7 to 16, y 16 to 32 may be it, or a flash/LiDAR/mic carrier |
| **Telephoto periscope module** (4x, 100 mm eq) | x 28.2 to 54, y 14.6 to 34.7; round entry aperture centred (45.2, 24.1), ~12 to 14 dia | **~25.7 x 20.1**; long axis across the width (x); light turns 90 deg under the aperture | M (footprint) / I (orientation) | S2, S4, S11 |
| **Ultra-wide module** | x 55.3 to 71.1, y 7.2 to 21.6, centre (63.2, 14.4) | ~16 x 14.4 | M | octagonal black cover |
| **Main camera module** (variable aperture, 1/1.28") | x 53 to 74, y 22.6 to 44.9, centre (63.4, 33.7) | **~21 x 22.3** | M | S2, S4 |
| Rear camera assembly as one part | x 28 to 74, y 7 to 45 | ~46 x 38 | M | 3 Torx Plus 4IP screws (17 Pro: 2 x 4.0 + 1 x 4.4 mm), 3 flex cables (flex 3 under flex 2), left and right grounding springs on trilobe screws; lifted by a screw hole; lens cap while out. S10 camera; S13 |
| LiDAR flex | lifts off a logic-board connector and moves left | n/a | C | S10 logic board |
| Flash / LiDAR / mic carrier | front-view x 13.85; y 13.75 / 34.1 / 23.9 | rings 6.77 dia | C | S11 |
| **Logic board** (L-shaped, two-layer sandwich) | upper block x 12 to 47, y 37 to 63.5; right wing x 47 to 72, y 47 to 57. Corner (12.3, 63.7) confirmed in two images | block ~35 x 26; wing ~25 x 10; ~1150 mm2 | M | S2, S4, S9, S14 (boards photo shows a tilted L with big rear shield + two metal cans on the wing) |
| **A20 Pro + memory** under the chain-mail/TIM | centre (34.3, 52.9); x 26.8 to 41.7, y 44.1 to 61.7 | ~15 x 17 | M | memory sits beside the SoC (WMCM). S1, S2, S9 |
| Display + ALS press connectors (under one cover, 1 screw) | x 18 to 24, y 55 to 62 | ~6 x 7 | M | S7, S10 |
| Battery press connector (under one cover, 1 screw) | x 57 to 64, y 53 to 56 | ~7 x 3 | M | S7, S10 |
| Camera flex pads (3 press connectors) | ~(32 to 43, 38 to 40) | ~11 x 2 | G | gold pad row above the SoC. 17 Pro: one cover with 1 Y000 1.0 mm screw (S13) |
| mmWave antenna module (some models) | top edge, right of centre; board has a cowling + 1 crosshead screw | unknown | G | S9 label 3; S10; S18 (AiP 339M00418) |
| **Battery cell** | x 6.5 to 72, y 63 to 144 (CT and photo agree) | **~65.5 x 81**; **notch bottom-left ~14.5 x 10** (x 6.5 to 21, y 134 to 144); flex tail leaves the top-right corner to the battery connector | M | S4, S14. Pro Max cell is a tall rectangle with one lower-left notch. pSIM cells are smaller (G: extra notch near the SIM slot) |
| **VC / tray plate** | outer x 4 to 74, y 8 to 145 (about 70 x 137), stepped outline: top-left corner cut back (starts ~y 26 left of x 25), full height from x ~25. Dimple array across nearly all of it. Flat non-dimpled pad over the main camera (x 49 to 73, y 21 to 46). Left strip (x 5 to 28, y 73 to 137) finer texture. Bottom-left corner notched like the cell | | M | S3 (brightened), S14 |
| ...cut-outs in the plate | display connectors (x 12 to 26, y 50 to 62); battery connector (x 54 to 70, y 52 to 60); round boss + hole for the 5.7 mm screw at (45.4, 36.9) | | M | S14 |
| **Bottom speaker** (L-shaped module) | driver box x 6.7 to 20.3, y 137 to 152; duct bar x 20.3 to 45.5, y 145.5 to 153 | ~39 x 19 overall | M | 7 crosshead screws (1 on the sidewall nearest USB-C), grounding springs; separate eSIM/pSIM parts. S9, S10 |
| **USB-C connector assembly** | x 33.8 to 44, y 153 to 160.9 | ~10 x 8 | M | 6 crosshead + 1 super screw to remove (more to install), adhesive gasket, two stacked flex cables. S10 |
| **Taptic Engine** | x 47 to 67, y 146 to 155.7 | **~20 x 9.8** (thickness G ~4 to 5) | M | 2 crosshead screws, flex underneath, "TAPTIC ENGINE" legend visible on top. S2, S10 |
| **Main (bottom) microphone** | right of USB-C, x ~50 to 66, y ~156 to 160 | ~16 x 4 | G | bonded to the sidewall, attached to the USB-C assembly, flex + gasket + 1 crosshead + 1 super screw. S10 |
| Rear mic | on the plateau at front-view x 13.85, y ~23.9 | 1.1 dia hole | C | S11 |

Logic-board outline polygon, mm, front view, clockwise from top-left (M, +/-2): (12,37) -> (47,37) -> (47,47) -> (72,47) -> (72,57) -> (47,57) -> (47,63.5) -> (12,63.5). The Pro Max board is an L/step, not a rectangle. The 17 Pro iFixit teardown says the board "sits above the battery and just barely extends into the camera plateau" [S12].

### 2.3 Battery tray screw map (iFixit 18 PM photo S5; positions M, +/-1.5)

| Screw | Size | Position (x, y) |
|---|---|---|
| 1 x | 5.7 mm | (45.0, 38.7), the round boss in the plate centre |
| 2 x | 3.5 mm | (14.0, 53.0) beside the display connectors; (69.0, 50.5) beside the battery connector |
| 11 x | 3.7 mm | left edge x ~3: y ~24.5, 74.5, 82, 86, 108, 136; right edge x ~72 to 74: y ~20, 67.5, 86, 123, 135.5 |

Tool: Torx Plus 4IP. Apple reassembly torque: 32.5 Ncm for 11 screws, 22 Ncm for 3. Lift the tray from the **top-right corner**. Avoid touching the TIM on the logic board and keep the battery flex from snagging. [S5, S10]

### 2.4 Flex and connector routes

| Route | Description | Conf |
|---|---|---|
| **USB-C flex** | Two stacked flex cables from the connector at the bottom centre, along the enclosure sidewall, **up the LEFT side (x ~4 to 6)** past the Action/volume buttons, into the logic-board left edge (~(10 to 13, 46 to 52)). Length about 105 to 115 mm. One front-camera flex lies under it, so it is lifted first. In the exploded-view drawing it is a long arm with two connector pads. Cowling on it; a "super screw" sits under it by the main mic | C (route, stacking) / G (length) |
| **Display** | Two press connectors (screen + ALS/front-sensor) under one left cover; the display hinges over the **left edge** and its flex tail runs down the left edge | C |
| **Battery** | Cell flex tail exits the top-right of the cell to the right-hand press connector; cover tucks under a lip at its top edge | C |
| **Camera** | 3 camera flex cables + LiDAR flex to board connectors (one stacked under another) | C |
| **Front camera** | 3 flex cables; the USB-C flex lies over one of them | C |
| **Back-glass flex** | Runs through the round opening in the rear wall (~26 dia centred ~(58, 63)) to the back side of the logic board; one cowling, 1 crosshead (iFixit calls it tri-point Y000, 1.0 to 1.2 mm). The glass flips open over the left edge as seen from the back | C (existence, cowling) / M (opening position) |
| **Taptic Engine** | Own flex under the body, tilt the part up to reach it | C |
| Logic-board removal | 6 numbered flex cables + LiDAR flex + mmWave flex + back-glass flex; 1 grounding-spring screw, 1 super screw, 2 cowling screws; board lifts out on Apple's dock | C |
| Buttons (Action/vol/power/Camera Control) | Not described in any source; the Camera Control sapphire sensor/flex is visible as a silver pill on the right sidewall near y ~110 | G |

### 2.5 Round opening and rear sheet

A black graphite/film sheet covers the enclosure floor. It has a round die-cut opening that shows white (see-through) in iFixit's Pro photo and holds the black back-glass flex lobes in Apple's and iFixit's 18 PM front views. Size ~26 dia, centre ~(58, 63) on the Max (M, +/-3). Whether the aluminium floor continues under the whole glass window is not documented (assumed yes). [S2, S6 photo, S9]

### 2.6 Disassembly order (usable for the exploded-view sequence)

Display (PL1.1 x2 at the bottom, heat, clips, 2 cowling screws, 3 flex connectors) -> battery + VC (14 screws) -> rear camera (3 screws, 3 flex) -> front camera (3 flex, no screws) -> top speaker (3 screws) -> bottom speaker (7), Taptic (2), main mic, USB-C (6 + 1) -> logic board (4 screws + flex) -> bare enclosure. Back glass comes off separately from the back (2 bottom screws, heat, cut the adhesive, 1 cowling screw). [S10, S5, S6]

## 3. Visible details a technical illustrator would draw

| Detail | What it looks like | Conf / source |
|---|---|---|
| Screw families | Apple lists crosshead (many), Torx Plus 4IP (tray, camera, top speaker), "super screw" (a screw with a threaded bore that takes another screw; USB-C, main mic, logic board), trilobe (grounding springs), pentalobe PL1.1/P2 7.5 mm (bottom, x2). iFixit's 17 Pro lists five drives: P2, PH00/JIS 00, tri-point Y000, 4IP, standoff. Cowling screws are 1.2 mm JIS 00; back-glass cowling screw is tri-point Y000 | C / I. S10, S12, S5 |
| Connector covers | Small stamped metal cowlings with a lip/tab: display+ALS (tucks under at its left edge), battery (tucks under at its top edge), back glass, mmWave, USB-C flex cowling (a metal frame at the bottom centre) | C. S5, S10 |
| Display perimeter | Three grounding springs (top-left, top-right, bottom-left) on trilobe screws; silver "fragile grounding clips" along both sidewalls; metal clips on the glass underside (2 on the right, 1 on the left, plus top internal clips); two audio-isolation foams and a speaker grille at the top; spring contacts around the perimeter | C. S7, S10 |
| Display back | White plastic bezel on the perimeter, black graphite sheets, L-shaped graphite pattern; round foam/ring windows over the front sensors; pixel gaps (every other row removed) over the IR camera. The bezel cracked in 3 of 4 iFixit units | C. S1, S14 |
| Adhesives | Display PSA sheet with camera cut-out, notches and corner pull-tab liners; back-glass PSA sheet with a connector notch; battery e-adhesive (electrically debonded, 12 V ~90 s, pull tabs); gasket adhesive on USB-C and main mic (7 liners on the replacement); foam on the front-camera flex ends | C. S1, S5, S6, S10 |
| Vapor chamber | Stainless-steel shell with a copper mesh/wick inside (JerryRigEverything per iThinkDiff, unverified; iFixit's 17 Pro teardown showed copper lattice + indentations), dimpled so it does not collapse, with pillar-style dimple array, a round screw boss, raised flat pad over the main camera, cut-outs for the connectors. "Three times the surface area" of the 17 Pro's (Apple) | C. S1, S14, S15 |
| "Thermal chain mail" | A metal mesh sheet bonded on top of the A20 Pro package so the VC makes even contact; also a grey spongy gap-filler TIM between chip and VC; iThinkDiff calls it a "puffy" metallic sticker instead of paste. Mesh pattern shown at 10x/20x/40x in the teardown | C. S1, S15 |
| Graphite / copper | Extra graphite on the VC's left side and the back; Apple cites "more conductive graphite" and "nano-twin copper" | C (Apple text via S16) |
| Standoffs | Hex standoffs on the logic board and near the centre of the tray (iFixit counts "standoff" as a fifth drive type) | I. S12 |
| Variable aperture "rotor" | **Six overlapping polymer-composite blades**, each about as thin as a hair, on a circular carrier ring that rotates; driven **magnetically** (iFixit actuated it by hand with a magnet; JerryRigEverything: tiny electromagnets). Stops f/1.48, 1.8, 2.8, 4.0. With a 6.8 mm focal length the opening is **4.6 mm** at f/1.48, ~3.8 at f/1.8, ~2.4 at f/2.8, ~1.7 at f/4.0 (derived from f/N). Blade nub ~1 mm; a blade fits beside a 2 mm screw. Part of the main module (not separately sold); module repair ~$249 on 17 Pro | C (blades, stops, 4.6 mm) / G (rotor ring dimensions). S1, S15 |
| Camera plateau | Rounded-rect island ~68 x 38 with three 14.66 dia lens rings (two left, one centre-right from the back) and flash + mic + LiDAR on the right (back view). Edges anodise unevenly | C. S11, S12 |
| MagSafe back glass underside | Dark inside face with a circular coil, magnet arcs, a small flex that exits at one corner; the glass flips over the left edge when opened | C. S6 photo |

## 4. Open items (do not invent)

- Real layer thicknesses (glass, OLED, VC, cell, board) are not published. Section 1 is a labelled budget, not data.
- Top speaker body position and the Pro Max main-mic footprint are not resolved.
- Button flexes (Action/volume/power/Camera Control) are undescribed.
- Exact VC outline vs tray outline: Apple says the VC is attached to the battery; the plate seen from the front is the combined VC/tray. The VC's active area is probably most of it but this is not dimensioned.
- Periscope orientation is inferred from the footprint and from 17-series teardowns; sensor end not identified.
- iFixit's own 18 Pro Max teardown writes "13 screws", which is the Pro's count; use 14 for the Max.
