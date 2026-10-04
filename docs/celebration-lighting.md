# Celebratory window lighting

The full-screen 3D skyline's toolbar offers seven monochrome badges. Open the
star, then select a badge to illuminate the south face of the existing Blue
Cross and Blue Shield Tower. Select it again to turn the message off, or select
another badge to replace it. The selected badge is pressed, and the scene note
names the message and building. Camera views, zoom, hover, wireframe, reduced
motion and the original-artwork comparison continue to work. Returning from the
original artwork retains the message in the existing 3D frame.

## Research and scope

Research checked October 4, 2026. This first implementation uses one existing
building, with no additions to the skyline inventory. These are reconstructions
of documented messages on the current model, not exact historic window plans.

| Badge | Message | Evidence and reconstruction limit |
| --- | --- | --- |
| Bulls | GO BULLS | [ABC7's interview with BCBSIL staff](https://abc7chicago.com/amp/videoClip/6652666/) confirms Bulls tributes. The exact wording and shade plan were not established; the UI identifies this preset as an adapted tribute. |
| Cubs | GO CUBS GO | [MLB, October 23, 2016](https://www.mlb.com/cut4/downtown-chicago-lit-up-after-cubs-nlcs-win-c206915154) documents this message on the tower. |
| White Sox | SOX PRIDE | [Los Angeles Times, December 15, 2013](https://www.latimes.com/nation/la-na-hometown-chicago-20131215-story.html) records the 2005 championship message. Its placement is adapted to today's taller tower. |
| Bears | BEAR DOWN | [AFP's verification, January 21, 2026](https://factcheck.afp.com/doc.afp.com.93EM7ZQ) identifies the authentic tower message and links the Bears' photographs and older examples. |
| Blackhawks | HAWKS WIN | [The 2010 championship skyline photograph](https://en.wikipedia.org/wiki/333_South_Wabash) identifies this wording on Blue Cross, with GO HAWKS on Smurfit-Stone and the team emblem on CNA. |
| Pride | PRIDE | [ABC7's staff interview](https://abc7chicago.com/amp/videoClip/6652666/) records this wording. Colored architectural accents are omitted under Skyline's grayscale policy. |
| Thanksgiving | GIVE THANKS | [ABC7, November 23, 2022](https://abc7chicago.com/amp/post/blue-cross-shield-of-illinois-building-chicago-skyline-give-thanks/12487512/) documents the message and five-floor letters. |

[BCBSIL's own account](https://www.bcbsil.com/newsroom/category/company-news/chicago-building-lighting-messages)
links the staff interview explaining how office lights and window shades form
the messages. White window light fits Skyline's grayscale palette. The toolbar
badges are locally drawn symbols, not downloaded official team artwork.

Other researched buildings: the existing Crain Communications / Smurfit-Stone
model has a glazed sloping crown suitable for a future separately fitted
display. Its messages require mapping over both slopes and their central gap;
they are not implemented here. CNA's [documented Cubs display](https://loews.com/investors/news/news-details/2015/CNA-Lights-Up-Chicago-Skyline-To-Celebrate-Chicago-Cubs-10-20-2015/default.aspx)
is outside the current modeled inventory. Boston's Prudential Tower results
are unrelated to Chicago's Prudential buildings and were excluded.

## Implementation

`models/celebrations.ts` defines the presets and five-floor pixel alphabet.
`blue-cross-geographic.ts` records the front triangles of each actual south
office pane while building its curtain wall. That face is subdivided at every
existing mullion, retaining the paired-pane colors when off. Words are centered
in window columns and each occupies five consecutive office rows, clear of the
mechanical bands. Every lit cell must exist; construction fails for a clipped
message rather than silently losing letters.

`models/window-illumination.ts` adds an emission attribute to the existing wall
mesh and darkens the message face's unlit office panes. It adds no geometry,
textures, external requests, animation loop, or extra draw call. Hover emission
is independent of the window mask. Turning the display off restores the saved
vertex colors exactly. Depth testing, raycast ownership, building placement and
the original SVG remain those of the existing scene. The model's optional
`illumination` controller is also usable by package consumers.
