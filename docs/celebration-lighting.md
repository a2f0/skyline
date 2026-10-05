# Celebratory window lighting

The full-screen 3D skyline's toolbar offers six monochrome badges. Open the
star, then select a badge to illuminate the south face of the existing Blue
Cross and Blue Shield Tower. Select it again to turn the message off, or select
another badge to replace it. The selected badge is pressed, and the scene note
names the message and building. Camera views, zoom, hover, wireframe, reduced
motion and the original-artwork comparison continue to work. Returning from the
original artwork retains the message in the existing 3D frame.

Right-click the Blue Cross tower, or long-press where the browser supports a
context menu, to choose the same messages or **Lights off**. The checked menu
choice and toolbar badge reflect the same state. Selecting the current message
also turns it off. Arrow keys cycle through the detail link and lighting choices;
Home/End jump to the first/last item, Enter/Space activate a lighting choice, and
Escape/Tab close the menu. Other buildings retain their detail link. This works
both in the main viewer and on the standalone 3D page.

## Research and scope

Research checked October 4, 2026. These displays use one existing building,
with no additions to the skyline inventory. These are reconstructions of
documented messages, not exact historic shade plans.

### Blue Cross and Blue Shield Tower

| Badge | Message | Evidence and reconstruction limit |
| --- | --- | --- |
| Bulls | GO BULLS | [ABC7's interview with BCBSIL staff](https://abc7chicago.com/amp/videoClip/6652666/) confirms Bulls tributes. The exact wording and shade plan were not established; the UI identifies this preset as an adapted tribute. |
| Cubs | GO CUBS GO | [MLB, October 23, 2016](https://www.mlb.com/cut4/downtown-chicago-lit-up-after-cubs-nlcs-win-c206915154) documents this message on the tower. |
| White Sox | SOX PRIDE | [Los Angeles Times, December 15, 2013](https://www.latimes.com/nation/la-na-hometown-chicago-20131215-story.html) records the 2005 championship message. Its placement is adapted to today's taller tower. |
| Bears | BEAR DOWN | [AFP's verification, January 21, 2026](https://factcheck.afp.com/doc.afp.com.93EM7ZQ) identifies the authentic tower message and links the Bears' photographs and older examples. |
| Blackhawks | HAWKS WIN | [The 2010 championship skyline photograph](https://en.wikipedia.org/wiki/333_South_Wabash) identifies this wording on Blue Cross, with GO HAWKS on Smurfit-Stone and the team emblem on CNA. |
| Thanksgiving | GIVE THANKS | [ABC7, November 23, 2022](https://abc7chicago.com/amp/post/blue-cross-shield-of-illinois-building-chicago-skyline-give-thanks/12487512/) documents the message and five-floor letters. |

[BCBSIL's own account](https://www.bcbsil.com/newsroom/category/company-news/chicago-building-lighting-messages)
links the staff interview explaining how office lights and window shades form
the messages. White window light fits Skyline's grayscale palette. The toolbar
badges are locally drawn symbols, not downloaded official team artwork.

## Other buildings already in this skyline

The follow-up research was matched against `geographicBuildings`, rather than
against Chicago's entire skyline. The following are research findings, not new
lighting presets. Achievability is an assessment of the existing model geometry;
it does not establish an exact historic lamp or shade plan.

| Existing building | Evidence | Achievability and remaining work |
| --- | --- | --- |
| Crain Communications / Smurfit-Stone | A [photographer's GO CUBS image](https://metroscap.com/chicago--framed-pictures/3080/go-cubs-in-the-smurfit-stone-building-at-night.php/) and [Daniel Schwen's June 10, 2010 GO HAWKS photograph](https://commons.wikimedia.org/wiki/File:Chicago_Grant_Park_night_pano_(Smurfit-Stone_Building_%22Go_Hawks%22).jpg) document lamp words on the sloping crown. [The building history](https://en.wikipedia.org/wiki/Crain_Communications_Building) also reports GO BEARS, GO SOX and VOTE 2008; those are secondary-source leads. | A crown-lamp reconstruction of GO CUBS, GO SOX, GO BEARS and GO HAWKS shipped on October 4, 2026 and was removed on October 5, 2026 at the owner's request, because its appearance on this tower was not wanted. Reinstate only on request; the [dated Crain audit](crain-reference.md#2026-10-05--crown-lamps-withdrawn-fid-crain-005) records the removal and keeps the earlier sources and placement estimates. |
| Sheraton Grand Chicago Riverwalk | [The Sun-Times' April 27, 2021 interview with hotel engineers](https://chicago.suntimes.com/2021/4/27/22404573/closed-by-covid-19-hotel-overlooking-riverwalk-sends-message-of-hope-through-window-designs) documents room lights forming changing designs, including an **XO inside a heart** for Valentine's Day. This establishes illuminated symbols and lettering, not a sports slogan or the word HOPE. | Existing room-window geometry makes a small symbol or XO plausible. Match the photographed facade and room grid first, then map individual panes. No need to add a building. |
| One Prudential Plaza | [James Iska's March 28, 2014 first-person account](https://jamesiska.blogspot.com/2014/03/the-prudential-building.html) describes historic crosses and later sports/cause messages made with shades and lights on Chicago's south facade. It does not give an exact sports phrase or a dated photograph of one. | The existing model has individual south-facing window bays, so a window mask is plausible. Locate a dated image and verify wording before defining a preset. Evidence is weaker than for Crain and Sheraton. |

Targeted searches for Aon, Kemper, Two Prudential, Hyatt Regency and Swissôtel
did not establish another reproducible word display. Aon/Stanley Cup blog
references remain unverified and are not enough to assign a preset. This is a
bounded search, not a claim that these buildings have never displayed messages.
CNA's [documented Cubs display](https://loews.com/investors/news/news-details/2015/CNA-Lights-Up-Chicago-Skyline-To-Celebrate-Chicago-Cubs-10-20-2015/default.aspx)
is outside the current modeled inventory. Boston's Prudential Tower results
are unrelated to Chicago's Prudential buildings and were excluded.

## Implementation

`src/models/celebrations.ts` defines the presets and five-floor pixel alphabet.
`blue-cross-geographic.ts` records the front triangles of each actual south
office pane while building its curtain wall. That face is subdivided at every
existing mullion, retaining the paired-pane colors when off. Words are centered
in window columns and each occupies five consecutive office rows, clear of the
mechanical bands. Every lit cell must exist; construction fails for a clipped
message rather than silently losing letters.

`src/models/window-illumination.ts` adds an emission attribute to the existing wall
mesh and darkens the message face's unlit office panes. It adds no geometry,
textures, external requests, animation loop, or extra draw call. Hover emission
is independent of the window mask. Turning the display off restores the saved
vertex colors exactly. Depth testing, raycast ownership, building placement and
the original SVG remain those of the existing scene. The model's optional
`illumination` controller is also usable by package consumers.

Each controller's `presets` list supplies the building-specific wording to the
toolbar and context menu. The toolbar applies a badge to every model with a
controller that supports it; today that is Blue Cross alone.
