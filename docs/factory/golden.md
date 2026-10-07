# Golden: the layout system

Golden lays out a single control, a group of controls or a whole page by cutting boxes in fixed proportions. The proportions hold at every size: every primitive is a CSS grid or flex box sized with container query units over the tokens, so nothing measures to size a box. The primitives are in `app/src/ui/Golden/` and the tokens in `app/src/ui/tokens/golden.css`. Storybook shows them under Golden/Primitives, Golden/Controls and Golden/Compare, and the whole Stage under Screens/Stage › Golden.

## The method

Recursion is the strategy. Every block a cut produces is a new frame, with its own interval, its own orientation and its own cuts. The same steps run at three scales: the page lays out groups, each group lays out its items, and each control lays out its parts.

**Every cell has a job; size follows use; the control fills its cell.** The geometry is the scaffolding, not the content: in nature the chamber is the size of the creature that grew it. A cut is made for what it will hold, never first and filled after.

- *Every cell has a job.* No band is left over from a subdivision. A cell that holds nothing is a cut in the wrong place: move the cut, or give the room to a neighbour that needs it.
- *Size follows use.* Rank what a cell holds by how much the player uses it (on the Stage: glance — chord, section and what's next, tempo and beat — over hands — transport, section pads, One Touch, part on/off, levels — over knobs, over unused parts) and grade the cells in phi steps by that rank. Like controls of unequal use get unequal widths (`GoldenGrid weights`): Start / Stop φ² of Reset; a parked fader or an unused knob half a live one.
- *The control fills its cell.* The cell is the button, the fader, the knob field: draw the control to the cell's edges (an outlined cell, OFF a coloured outline, ON the solid hue), not a small control floating in a big cell. A readout stands on its cut (its baseline on the line), flush left, never optically centred in a void.

1. **Frame.** The whole screen is the frame: fit one shape into it, such as the Stage's `GoldenBox shape="phi"` between fib-21 side margins. Nothing sits outside it, the app bar and the keys included.
2. **Cuts.** Cut the frame into parts, each cut a square, the golden section (`major`, `minor`), an interval of the cross size, or a step of the length (`take="phi4" of="length"`). Orient each cut, and so its spiral, to its content: a cut from the top for things that read top to bottom, from the left for things that read across. Orient the page's spiral so its pole (the point its squares converge on) lands on the focus: see "Spirals" below.
3. **Bars take an outer-edge step.** A bar (the app bar, the keys) is a step off its half's outer edge, not a fixed band: the top half gives a phi⁴ step off its top to the app bar, the bottom half a phi⁴ step off its bottom to the keys.
4. **Assign groups by importance.** The largest part goes to what is played or read most: the faders get the band's major part, the reading tier the hero's.
5. **Recurse into each group.** A group is a new frame: give it its own tree. A row of like controls is a `GoldenGrid` (`cell` set to the control's shape when it has one), a header is a `GoldenBand` over the rest, a readout over its small line is a `GoldenSplit`. To put a group's items in the grid's cells one by one, the component renders them as siblings (SectionRow and OneTouchPicker `cells`); the wrapper that holds the tree carries the group's role and name.
6. **Recurse into each control.** A control is a tree of its own: `KnobCell` is `GoldenSplit phi from top (a strip as deep as the cell's width over phi: the dial, so the gutters come from the ratio) → [dial, GoldenBand label-height → [value, name (up to two lines)]]`; `FaderCell` grows like a stem: `GoldenBand tab-block (sound) → [GoldenBand control-height gap fib-8 (lamp, optional) →] GoldenBand label-height gap fib-5 (name) → GoldenBand label-height gap fib-3 (value) → track`. The track takes everything the foot doesn't (about three quarters of the strip); the internodes shrink toward the tip in fib steps.
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

## The Stage (round 3)

At 1440 × 900 the page frame is 1398 × 864. Its first cut, `minor` from the top, gives the top half (330) and the bottom half (534). The halves' phi⁴ steps give the app bar 48 and the keys 78, so the stack is app bar 48 · hero 282 · band 456 · keys 78.

- **Spiral.** The page's spiral is turned `cw` from the right, so its pole (388, 238) sits in the section block, on what comes next; the chord column is the spiral's third square.
- **Hero.** A phi³ step off its bottom is the controls tier (67; one phi step lower than round 2, its buttons fill it at 41 px). Its major part off the left is the transport: six outlined cells weighted by use, Start / Stop φ², Accomp, Sync Start and Fill ▲ ▼ (one cell split in two) φ, Fade and Reset 1, Reset at the far end. The rest is One Touch: its 13px caption, then 1–4 as outlined cells, the applied one solid. The reading tier (215) above: a phi³ step off its left is the chord (330), the rest halved into the section and the tempo (534 each; φ⁻³ + 2φ⁻² = 1). Each reading cell's major part off the top ends on one line, the hero values' shared baseline: the chord, Main B and the tempo stand on it, flush left. Under it, the chord's notes; "then", the next section as a waiting chip in its hue (the pads' NEXT ring), and when it lands; the beat bar (one label-height segment a beat, the current one solid) over the style line (‹ › as square cells). + and − are two square cells at the tempo's right, each half its height. In the app bar the helpers are outlined cells, Panic last, set apart, in the warning hue.
- **Option C: parts join the faders.** Each part's sound name sits on top of its own fader strip and opens the part's sound list.
- **Band.** Its major part off the left is the faders: a header band (the status line at its right end); the lamp row, a control-height band off the foot (gap fib-8): the part lamps under their four strips, a fib-13 sub-cut, then the function buttons and the page button, so a function never reads as a strip's state; nine strips weighted by use, a live strip an octave of a parked one. The rest is cut `minor` from the top into knobs (eight knob cells, an unused one half width, each filling its cell) over pads.

At 1440 × 900 the page frame is 1398 × 864. Its first cut, `minor` from the top, gives the top half (330) and the bottom half (534). The halves' phi⁴ steps give the app bar 48 and the keys 78, so the stack is app bar 48 · hero 282 · band 456 · keys 78.

- **Hero (two tiers, Option B with C).** The hero's major part off the top is the reading tier (174), in thirds: the style line (with ◀ ▶) over the chord, the section over what comes next, the tempo over the beat bar. The rest is the controls tier (108): its major part off the left is the transport as one row of seven (Start/Stop, Accomp, Sync Start, Reset, Fill ▲, Fill ▼, Fade), the minor part One Touch and 1–4 in a row.
- **Option C: parts join the faders.** The display's parts block repeated the faders, so it is gone: each part's sound name sits on top of its own fader strip and opens the part's sound list. The hero holds only what you read and what you press.
- **Band.** Its major part off the left is the faders: a header band (the status line at its right end), over nine strips. The rest is cut `minor` from the top into knobs over pads, each a header band over a grid.

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
