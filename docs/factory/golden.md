# Golden: the layout system

Golden lays out a single control, a group of controls or a whole page by cutting boxes in fixed proportions. The proportions hold at every size: every primitive is a CSS grid or flex box sized with container query units over the tokens, so nothing measures to size a box. The primitives are in `app/src/ui/Golden/` and the tokens in `app/src/ui/tokens/golden.css`. Storybook shows them under Golden/Primitives, Golden/Controls and Golden/Compare, and the whole Stage under Screens/Stage › Golden.

## The method

Recursion is the strategy. Every block a cut produces is a new frame, with its own interval, its own orientation and its own cuts. The same steps run at three scales: the page lays out groups, each group lays out its items, and each control lays out its parts.

**Every cell has a job; size follows use; the control fills its cell.** The geometry is the scaffolding, not the content: in nature the chamber is the size of the creature that grew it. A cut is made for what it will hold, never first and filled after.

- *Every cell has a job.* No band is left over from a subdivision. A cell that holds nothing is a cut in the wrong place: move the cut, or give the room to a neighbour that needs it.
- *Size follows use.* Rank what a cell holds by how much the player uses it (on the Stage: glance — chord, section and what's next, tempo and beat — over hands — transport, section pads, One Touch, part on/off, levels — over knobs, over unused parts) and grade the cells in phi steps by that rank. Like controls of unequal use get unequal widths (`GoldenGrid weights`); an unused knob is half a live one.
- *Size a control by its consequence, and place it by what a slip costs.* Within a row, the control whose press changes the most gets the widest cell: on the transport Start / Stop (it starts or stops the band) is 2 units (the octave); Accomp, Sync Start and Fade 1 each; the Fill ▲ ▼ pair together 1, split in half (each Fill is pressed often, but a fill is one bar). A control whose slip the audience hears (Reset, Panic) goes at the far end of its row, set apart from its neighbour by a visible sub-cut (fib-13), never next to a control pressed often. A target that changes what the audience hears is at least 44px on its short side at 1440 (32 at 1280): the tempo's + and − are one square beside the number, its side the number's cap height, cut in half across. Where a row must keep its columns (a lamp under each fader), the column wins over the weight: a strip too narrow for its button's word goes back to full width rather than break the column.
- *A control's legend names its action, not its state.* Start / Stop reads "Start / Stop" (as on the pads); the solid fill says it is playing.
- *The control fills its cell.* The cell is the button, the fader, the knob field: draw the control to the cell's edges (an outlined cell, OFF a coloured outline, ON the solid hue), not a small control floating in a big cell. A readout stands on its cut (its baseline on the line), flush left, never optically centred in a void.
- *An outline means clickable.* Every control is outlined (OFF a coloured outline, ON the solid hue with dark ink), and nothing that is only a display is: a meter, a beat bar, what comes next, a caption or a value draws no outline and no box. A display shows its state with its own ink: faded hue for what is not current, the solid hue for what is (the beat bar: bars a golden fraction of the numeral deep, the row over phi⁵, the current beat solid). A queued state is marked with a short solid swatch in its hue before its name (the pads legend's mark, not a button): what comes next is "▬ Main C · fill after bar 4", the name in its hue at the strong weight, on its own line a fib-34 under the section.
- *One size per line.* Every label is the one 13px size. A label that doesn't fit its cell may wrap onto a second line of the same size where its band is two lines deep (a knob's name: "Retrig / rate"); only where two lines don't hold it, show the control's short name (a knob's code: "RtgRate") and keep the full name in the tooltip. A name truncated to its column by design (a sound name on its fader strip) ends in an ellipsis with the full name in its tooltip, and carries `data-golden-ellipsis` so the overlay doesn't count it.
- *Heroes fill their row.* The hero values on one line are one size, the size whose capitals fill the row (the face's capitals are 0.70 of its size), so no empty band sits over them; a long name ("Ending III") steps down to fit its cell, its baseline held.

1. **Frame.** The whole screen is the frame: fit one shape into it, such as the Stage's `GoldenBox shape="phi"` between fib-21 side margins. Nothing sits outside it, the app bar and the keys included.
2. **Cuts.** Cut the frame into parts, each cut a square, the golden section (`major`, `minor`), an interval of the cross size, or a step of the length (`take="phi4" of="length"`). Orient each cut, and so its spiral, to its content: a cut from the top for things that read top to bottom, from the left for things that read across. Orient the page's spiral so its pole (the point its squares converge on) lands on the focus: see "Spirals" below.
3. **Bars take an outer-edge step.** A bar (the app bar, the keys) is a step off its half's outer edge, not a fixed band: the top half gives a phi⁴ step off its top to the app bar, the bottom half a phi⁴ step off its bottom to the keys.
4. **Assign groups by importance.** The largest part goes to what is played or read most: the faders get the band's major part, the reading tier the hero's.
5. **Recurse into each group.** A group is a new frame: give it its own tree. A row of like controls is a `GoldenGrid` (`cell` set to the control's shape when it has one), a header is a `GoldenBand` over the rest, a readout over its small line is a `GoldenSplit`. To put a group's items in the grid's cells one by one, the component renders them as siblings (SectionRow and OneTouchPicker `cells`); the wrapper that holds the tree carries the group's role and name.
6. **Recurse into each control.** A control is a tree of its own: `KnobCell` is `GoldenBand label-height from bottom (name, one line) → GoldenBand label-height from bottom (value) → dial`, the dial as big as the rest allows (its height, or its width less a fib-3 gutter), standing on its value; on the Stage (`lines={2}`, `valueInside`) it is `GoldenBand label-lines-2 from bottom (name, up to two lines) → dial`, the value inside the ring, so the dial grows into the value's band; `FaderCell` grows like a stem: `GoldenBand tab-block (sound) → [GoldenBand control-height gap fib-8 (lamp, optional) →] GoldenBand label-height gap fib-5 (name) → GoldenBand label-height gap fib-3 (value) → track`. The track takes everything the foot doesn't (about three quarters of the strip); the internodes shrink toward the tip in fib steps.
7. **Fill the leaves.** A leaf is a plain element wrapping a component. Size the component's tokens from the slot with `100cqw` and `100cqh`, and give the leaf `container-type: size`.
8. **Fib insets, per group.** Each group sits inset from its block's cuts by a fib step (the Stage's groups: fib-13); inside a group and inside a control the cuts sit edge to edge. Space never comes from gaps between cuts, so block edges stay on the cut lines. `GoldenBand`'s `gap` is the one exception, and it is a fib step too.
9. **Where a token fights a cut, band it.** A fixed token (13px text, a 32px hit target, a 36px header) that a cut leaves a px short or long gets a `GoldenBand` of that token's depth, or a different cut. Record the choice.
10. **Check with the overlay.** Turn on `overlay` (Stage's `overlay`, any primitive's `overlay`, or a `GoldenOverlay` around a tree). It draws every level's cuts, each nesting depth in its own shade (thinner and fainter as they go deeper), each inset (dashed), and a spiral in every phi box and every golden (`major`/`minor`) cut, starting from the cut's side (or as `spiralFrom`/`spiralTurn` set it, with its pole ringed). It draws in red whatever breaks a rule. Its report gives each fitted box's size and spare, each named group's size, spare and overflow (`groups`, `groupLines`), and whether the rows add up.

## Spirals

A golden spiral cuts squares off a phi box in turn, and converges on its pole, about 0.276 of the box in from two of its sides. Which two depends on the side the first square comes off (`spiralFrom`) and the way it turns (`spiralTurn`): `ccw` cuts left, bottom, right, top (the default, from the left), `cw` the mirror, left, top, right, bottom. A wide phi box has four poles, one near each corner:

| `spiralFrom` · `spiralTurn` | squares, in order | pole (× width, × height) |
|---|---|---|
| left · ccw (default) | left, bottom, right, top | 0.724, 0.276 |
| left · cw | left, top, right, bottom | 0.724, 0.724 |
| right · ccw | right, top, left, bottom | 0.276, 0.724 |
| right · cw | right, bottom, left, top | 0.276, 0.276 |

To put the eye on the focus, pick the orientation whose pole is nearest it, then cut so the focus sits under the pole (`spiralPole(box, from, turn)` in `golden.ts` gives the point). Set the same orientation on every cut that draws a spiral in the same box (the Stage's page box and its `halves` split), so they agree. The overlay rings the pole of every spiral turned this way.

## The Stage (round 4)

At 1440 × 900 the page frame is 1398 × 864. Its first cut, `minor` from the top, gives the top half (330) and the bottom half (534). The halves' phi⁴ steps give the app bar 48 and the keys 78, so the stack is app bar 48 · hero 282 · band 456 · keys 78.

- **Spiral.** The page's spiral is turned `cw` from the right, so its pole (388, 238) sits on what comes next (on "Main C", on its own line under Main B); the chord column is the spiral's third square.
- **Hero.** A phi³ step off its bottom is the controls tier (67). Its major part off the left is the transport: six outlined cells sized by consequence (see "Size a control by its consequence"): Start / Stop 2 units, its legend "Start / Stop" (solid green while playing, outlined when not), Accomp 1, Sync Start 1, Fill ▲ ▼ (one unit split in two) 1, Fade 1, then Reset 1 at the far end behind a fib-13 sub-cut. The rest is One Touch: its 13px caption, then 1–4 as outlined cells, the applied one solid.
- **Reading tier** (215, one group inset fib-13) reads style → chord → section → next. A control-height band off its top is the style line: ‹ the style's name › (‹ › 32px squares), and category · metre at the line's right end, over the tempo column, so the line spans the three heroes. Under it (149 deep), a phi³ step off the left is the chord (324), the rest halved into the section and the tempo (524 each; φ⁻³ + 2φ⁻² = 1). Each reading cell is a hero row (99 at 1440: the cell less a label-height line and a fib-34 gap) over one small line. The chord, Main B and the tempo are one size, their capitals filling the row (141 px type, 99 px capitals), on the row's foot, one shared line, flush left. A fib-8 under the line: the chord's notes; the beat bar (bars the row over phi⁵ deep, 9 px at 1440, the others faded hue, the current beat solid, no outlines). A fib-34 under the line, its own line: what comes next, a solid swatch (fib-21 × fib-5) and "Main C" in its hue at the strong weight, then "· fill after bar 4" plain (a display: no outline, no fill). The gap is fib-34, not Main B's x-height (about 70): the x-height would leave the row too short for 44 px tempo targets. + and − are one square right beside "104 BPM", standing on its baseline, its side the cap height, cut in half across (99 × 50 each at 1440, 75 × 38 at 1280). In the app bar the helpers are outlined cells, Panic last, set apart, in the warning hue.
- **Option C: parts join the faders.** Each part's sound name sits on top of its own fader strip, centred, in the part's hue, cut short with an ellipsis at the strip less a fib-3 each side (its full name in the tooltip), and opens the part's sound list.
- **Band.** Its major part off the left is the faders: a header band (the status line at its right end) over nine equal strips, each with its own foot (`FaderCell lamp`, a control-height band, gap fib-8): the part lamps under strips 1–4, then a fib-13 sub-cut and the function buttons and the page button under strips 5–9, so each lamp sits on its fader's column and a function never reads as a part's state. A parked strip is full width again, faded: half a strip can't hold "L Hold" or "Looper". The rest is cut `minor` from the top into knobs (eight knob cells, an unused one half width; each dial as big as its cell allows, the value inside the ring, the name under it in a two-line band) over pads.

## Vocabulary

- **phi** is the golden ratio itself, 1.618…. **Golden** is the name of the system, never of the ratio.
- **fib** is the Fibonacci spacing scale: `--fib-2` up to `--fib-144`, used as `inset="fib-13"` or `gap="fib-8"`.
- **Intervals** are the ratios a box or a cut may take: `--interval-unison` 1, `-minor-third` 6/5, `-major-third` 5/4, `-fourth` 4/3, `-root2`, `-fifth` 3/2, `-phi`, `-major-sixth` 5/3, `-octave` 2, `-phi2`, `-double-octave` 4, `-phi3`, `-phi4`.
- A **shape** is a control's interval: `--shape-knob`, `--shape-fader`, `--shape-pad`, `--shape-button`, and `--shape-steps` for GoldenSteps' step. A knob and a fader stand tall (height over width); `orient` turns any box.
- A **tuning** is a set of shapes (see below).
- **Spare** is the room a fitted box leaves in its slot. **Overflow** is content too big for its slot, including text cut short by an ellipsis.

The primitives' props take only interval names, shape names and fib steps, never a px:

| Primitive | What it does |
|---|---|
| `GoldenBox` | A box in one shape, fitted (contain) into its parent and centred. `spiralFrom`/`spiralTurn` orient its spiral. |
| `GoldenSplit` | One cut. `take` is `square`, `major`, `minor` or an interval; `from` is `top`, `right`, `bottom` or `left`; an interval divides the cross size (a strip), or with `of="length"` the length (a step: `take="phi4" of="length"` is the bars' phi⁴ step). Two children: the part taken, then the rest. `spiralFrom`/`spiralTurn` orient its spiral (and give any split one). |
| `GoldenSteps` | Repeated cuts off the same side, each smaller by the step interval (phi: 61.8 / 23.6 / 14.6 %). Up to eight children, biggest first. |
| `GoldenSpiral` | Repeated square cuts, turning, in a phi box. The last child gets the remainder. |
| `GoldenRow` / `GoldenColumn` | Each child has an interval relative to the row's cross size (`cells`, with `1:phi` for the inverse). The intervals must add up to the box: square, square, 2 × 1:phi, square = phi³. |
| `GoldenGrid` | Equal cells, each child optionally fitted to a shape (`cell`); or, with `weights` (one interval a column), columns weighted by use (`cell` is then ignored). |
| `GoldenBand` | The only way out of the ratios: a band as deep as an existing token (`label-height`, `tab-block`, `group-header-height`, `control-height`, …). |
| `GoldenOverlay` | Draws the tree, every depth in its own shade, and checks it. |

Direct children fill the slots in order. A child that is not a Golden primitive is a leaf and gets the inset. Each primitive also takes `shape` (to fit itself), `inset`, `name` (for the report), `over` (content drawn over all its slots, like the Stage's beat bar) and `overlay`/`report`/`onreport`.

## The constraints are enforced

A row or column whose cells don't add up is still laid out at the cells' true sizes, so it leaves spare or overflows. The overlay draws it red. When the row has a `shape`, the check runs from the names alone: the slots element carries `data-golden-adds="yes|no"`, so a story's `play` can assert it in jsdom. Any slot whose content overflows, or whose text is cut short, is drawn red as well. The overlay's wrapper carries the counts as `data-overflow` and `data-rows-off`, and `onreport` receives the whole report. Overflow needs real layout, so it shows in Storybook, not in jsdom.

## A/B a shape with tunings

Shapes are tokens, so trying another one never touches a component. Use Storybook's **Tuning** toolbar (Phi · Just · Root-two) to switch every story, or set `data-tuning` on an element to switch its subtree. Golden/Compare shows the knob group and the fader group side by side under each tuning, at the size the Stage gives them.

| Tuning | knob | fader | button | pad | steps |
|---|---|---|---|---|---|
| Phi (default) | phi | phi³ | phi | unison | phi |
| Just | fifth | double octave | major sixth | unison | fourth |
| Root-two | root2 | double octave (root2⁴) | root2 | unison | root2 |

To try a new set, add a `[data-tuning='<name>']` block in `tokens/golden.css` that redefines the `--shape-*` tokens, then add it to `TUNINGS` in `Golden/golden.ts` and to the toolbar in `app/.storybook/preview.ts`.
