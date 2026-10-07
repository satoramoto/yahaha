# Golden: the layout system

Golden lays out a single control, a group of controls or a whole page by cutting boxes in fixed proportions. The proportions hold at every size: every primitive is a CSS grid or flex box sized with container query units over the tokens, so nothing measures to size a box. The primitives are in `app/src/ui/Golden/` and the tokens in `app/src/ui/tokens/golden.css`. Storybook shows them under Golden/Primitives, Golden/Controls and Golden/Compare, and the whole Stage under Screens/Stage › Golden.

## The method

1. **Frame.** Start from the box the page gets and fit one shape into it, such as the Stage's `GoldenBox shape="phi"`. Take the fixed-height strips off first with `GoldenBand`: the app bar and the keys.
2. **Cuts.** Cut the frame into parts, each cut a square, the golden section (`major`, `minor`) or an interval. On the Stage, `minor` from the top gives the display row and leaves the band. A `square` from the right of the band leaves the faders, and `minor` from the top of that square gives knobs over pads.
3. **Assign groups by importance.** The largest part goes to what is played or read most: the faders get the band's phi rectangle, and the chord and the song get the display's squares.
4. **Fill the leaves.** Each slot holds one group: a plain element wrapping a component. Size the component's tokens from the slot with `100cqw` and `100cqh`, and give the leaf `container-type: size`. A group of like controls is a `GoldenGrid` with `cell` set to the control's shape. A single control is a tree of its own: `KnobCell` is `GoldenBox knob → GoldenSplit square → [dial, GoldenSteps → [value, name]]`.
5. **Fib insets.** Space comes from padding inside the leaves (`inset="fib-13"`), never from gaps between cuts, so block edges stay on the cut lines. `GoldenBand`'s `gap` is the one exception, and it is a fib step too.
6. **Check with the overlay.** Turn on `overlay` (Stage's `overlay`, any primitive's `overlay`, or a `GoldenOverlay` around a tree). It draws every cut, each inset (dashed) and the spiral in each phi box, and draws in red whatever breaks a rule. Its report gives the size of each fitted box, its spare, its overflow and whether its rows add up.

## Vocabulary

- **phi** is the golden ratio itself, 1.618…. **Golden** is the name of the system, never of the ratio.
- **fib** is the Fibonacci spacing scale: `--fib-2` up to `--fib-144`, used as `inset="fib-13"` or `gap="fib-8"`.
- **Intervals** are the ratios a box or a cut may take: `--interval-unison` 1, `-minor-third` 6/5, `-major-third` 5/4, `-fourth` 4/3, `-root2`, `-fifth` 3/2, `-phi`, `-major-sixth` 5/3, `-octave` 2, `-phi2`, `-double-octave` 4, `-phi3`.
- A **shape** is a control's interval: `--shape-knob`, `--shape-fader`, `--shape-pad`, `--shape-button`, and `--shape-steps` for GoldenSteps' step. A knob and a fader stand tall (height over width); `orient` turns any box.
- A **tuning** is a set of shapes (see below).
- **Spare** is the room a fitted box leaves in its slot. **Overflow** is content too big for its slot, including text cut short by an ellipsis.

The primitives' props take only interval names, shape names and fib steps, never a px:

| Primitive | What it does |
|---|---|
| `GoldenBox` | A box in one shape, fitted (contain) into its parent and centred. |
| `GoldenSplit` | One cut. `take` is `square`, `major`, `minor` or an interval; `from` is `top`, `right`, `bottom` or `left`. Two children: the part taken, then the rest. |
| `GoldenSteps` | Repeated cuts off the same side, each smaller by the step interval (phi: 61.8 / 23.6 / 14.6 %). Up to eight children, biggest first. |
| `GoldenSpiral` | Repeated square cuts, turning, in a phi box. The last child gets the remainder. |
| `GoldenRow` / `GoldenColumn` | Each child has an interval relative to the row's cross size (`cells`, with `1:phi` for the inverse). The intervals must add up to the box: the display row is square, square, 2 × 1:phi, square = phi³. |
| `GoldenGrid` | Equal cells, each child optionally fitted to a shape (`cell`). |
| `GoldenBand` | The only way out of the ratios: a band as deep as an existing token (`bar-height`, `group-header-height`, `control-height`, `keys-height`, …). |
| `GoldenOverlay` | Draws the tree and checks it. |

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
