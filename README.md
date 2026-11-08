# One Shot

**One Shot** is an interactive classroom experiment about a real management decision: when to stop searching and commit. The audience plays an investor with $1M who must back exactly one of 20 startups. The startups appear one at a time, and a rejected startup is gone forever. The room plays two rounds, the second against four algorithmic investors. Then Python runs live inside the presentation to test the famous 37% rule (from the Secretary Problem), and to check whether the best strategy changes when we change what we measure and what the startup world looks like.

## Status

- ✅ PRD approved
- ✅ Python simulation (`python/sim.py`)
- ✅ Game logic in 2D: two seeded rounds, invest/pass, forced last pick, four bots, reveal
- ✅ Slide shell: slides that fit any screen, keyboard navigation, the game inside slides 4, 5 and 7
- ✅ Live Python with Pyodide on slides 8 to 10: live runs with 20, 50 or 100 startups, a replay of the room's own startups, an automatic fallback to saved results, and a code panel toggled with `C`
- ✅ Three.js scene: an animated 3D "deal flow" runway above the startup card in rounds 1 and 2
- ✅ Parking-problem intro (slide 2) and the 37% rule on the same street (slide 6): 2D animations; the presentation now has 11 slides
- ✅ Design: modern startup style (sunset gradient, floating white cards, Inter font), round arrow buttons, clearer game prompts, new title and takeaway slides. The three color options considered are in `design-options/`
- ⏭️ Next: final README, rehearsal and self-assessment

## How to run

The presentation is a local web page. It must be opened through a small local server, not by double-clicking `index.html`, because browsers block this kind of JavaScript (and Pyodide) on `file://` pages.

1. In a terminal, go to the project folder and start the server:
   - **Mac:** `python3 -m http.server`
   - **Windows:** `python -m http.server`
2. Open **http://localhost:8000** in Chrome or Edge, and press `F` for fullscreen.

Live Python needs internet the first time: Pyodide (about 15–20 MB) is downloaded from a CDN in the background while slides 1–7 are shown. After that, the browser usually keeps a copy.

### Testing the fallback (no Python)

Open **http://localhost:8000/?offline**

The page then skips Pyodide and uses the saved results in `data/results.json`, exactly as it would if Pyodide failed to load. Slides 8 to 10 then show a "💾 Saved results" label instead of "🐍 Live". Turning off Wi-Fi is not a reliable test, because the browser may already have a copy of Pyodide.

The fallback also switches on automatically if Pyodide fails, or if it is still not ready 10 seconds after opening slide 8. The hidden `O` key switches to saved results at any time.

To regenerate `data/results.json` outside the browser: `pip install -r requirements.txt`, then `python python/sim.py`.

## Keyboard controls

| Key | Where | What it does |
|---|---|---|
| `→`, `Space`, `Page Down` | All slides | Next slide. On slides 4 and 7 it waits until the room has invested |
| `Shift` + `→` | Slides 4 and 7 | Force the next slide, even if the round is still in progress |
| `←`, `Page Up` | All slides | Previous slide |
| `Home` | All slides | Back to slide 1 |
| `F` | All slides | Fullscreen on/off |
| `A` | Slides 4 and 7 | Invest in the current startup |
| `R` | Slides 4 and 7 | Pass on the current startup (not possible on startup #20) |
| `B` | Slide 7 | Reveal the bots' choices, after the room has invested |
| `P` | Slides 2 and 6 | Replay the parking-street animation |
| `P` | Slide 8 | Run the live simulation (10,000 games) |
| `C` | Slides 8, 9 and 10 | Show or hide the Python code (shown on slide 8, hidden on 9 and 10 by default) |
| `Backspace` | Slides 4 and 7 | Hidden: undo the last click only, for presenter mistakes |
| `N` | Slides 4 and 7 | Hidden: restart the current round (for rehearsals) |
| `O` | All slides | Hidden: switch to saved results instead of live Python |

Every slide also has small ← and → arrow buttons in the bottom corners. The → arrow is disabled during a round, like the → key. Presentation clickers usually send `Page Up` / `Page Down`, so they work for moving between slides. The startup-count buttons on slide 8 (20 / 50 / 100) are clicked with the mouse.

## Screenshots

Fullscreen screenshots of the final design (sunset theme).

**Slide 1: title.** One floating white card on the sunset gradient: the title, the hook line, three big numbers ($1M · 20 · 1) and the authors.

![Slide 1: title](screenshots/slide01-title.png)

**Slide 2: the parking problem.** A 2D animation before round 1. A car drives a winding road around the destination; each free spot appears with a dashed line and its distance, so the audience sees distances go up and down. At each spot: "Stop here, or keep going?" The car never parks and can't go back. No mention of the 37% rule, so round 1 stays pure intuition.

![Slide 2: the parking problem](screenshots/slide02-parking.png)

**Slide 4: round 1.** The animated Three.js runway above the startup card: the current startup's tile rises into the spotlight (amber when it is the best so far), passed tiles sink away, and future ones fade into the distance. The room votes by show of hands; "Your call: Invest or Pass?" sits above the buttons, and the next arrow stays disabled until the room invests. Round 1 shows no percentages.

![Slide 4: round 1](screenshots/slide04-round1.png)

**Slide 6: the 37% rule, on the same street.** The first 3 of 8 spots are blue ("observe only"). After the gold 37% line, the car parks at the first spot closer than every spot it has seen (90 m), and then shows that an even closer spot (80 m) was still ahead: the rule gives the best odds, not a guarantee.

![Slide 6: the 37% rule](screenshots/slide06-37-rule.png)

**Slide 7: round 2.** The runway now shows the blue "observe only" floor and the gold 37% arch, and the counter shows the share of startups seen (here 40%, just past the arch). Four hidden bots play the same startups and are revealed after the room decides.

![Slide 7: round 2](screenshots/slide07-round2.png)

**Slide 8: Python, live.** After pressing `P`, Python runs 10,000 games in the browser (Pyodide) and shows how often each strategy picks the single best startup. It also replays the room's own round 2 startups, reshuffled 10,000 times. On the right, the rule exactly as written in `python/sim.py`.

![Slide 8: live Python](screenshots/slide08-python-live.png)

**Slide 10: Hypothesis 2.** In the unicorn world the best cutoff for average return moves later (from observing 5 to 6 startups): confirmed. The typical (median) result points the other way, shown as an observation. The label confirms the 200,000-game analysis was computed live in the browser.

![Slide 10: Hypothesis 2](screenshots/slide10-hypothesis2.png)

**Slide 11: takeaway.** When the room stopped in rounds 1 and 2, three conclusion cards, the closing line, and the parking street in the background with the car finally parked.

![Slide 11: takeaway](screenshots/slide11-takeaway.png)

## Simulation results

200,000 simulated games per strategy, with the same games used for every strategy and both worlds. Verdicts follow the decision rule in the [PRD](PRD.md): a hypothesis is confirmed if the 95% confidence interval of the mean difference excludes zero in the predicted direction.

| | Hypothesis | Key evidence | Verdict |
|---|---|---|---|
| **H0** | On the chance of picking the single best startup, 37% beats 10%, 25% and 50% | 37% picks the best 38.4% of the time (25%: 36.8%, 50%: 36.1%, 10%: 25.7%). Best cutoff: observe 7 of 20 | ✅ CONFIRMED |
| **H1** | Normal world, average return: 25% beats 37% | 3.32x vs 3.25x, a gap of +0.067x (95% CI +0.063 to +0.071). Best cutoff: observe 5 | ✅ CONFIRMED |
| **H2** | Unicorn world: the best cutoff for average return moves later | Best cutoff moves from 5 to 6. The advantage of 37% over 25% is larger than in the normal world (95% CI of the difference: +0.022 to +0.096) | ✅ CONFIRMED |

**Notes**

- **H1 is real but small in practice.** Deciding at 25% instead of 37% raises the average return by about **2%**. The simulation is large enough to be sure the gap exists, but an investor would barely notice it in a single deal.
- **H2 is also a small shift.** The best cutoff moves by one startup (from 5 to 6). In the unicorn world, 25% and 37% are nearly tied on average return (9.11x vs 9.17x).
- **Observation for H2 (not part of the verdict):** in the unicorn world the average and the typical result point in different directions. Waiting longer raises the *average* return because it catches more jackpots, but the *typical* (median) result is better with 25% (4.11x vs 3.98x). This is a familiar tension in venture capital: a strategy can win on average while the typical outcome gets worse.

## Return models

Returns are measured as multiples: 1x means you get your money back, 3x means you triple it. The simulation uses two "worlds":

| | Normal world | Unicorn world |
|---|---|---|
| Typical (median) startup | 2x | 0.5x |
| Startups that lose money | ~4% | ~65% |
| Startups that return 10x or more | almost none | ~4% |
| Share of all returns from the top 4% | ~10% | ~50% |

- **Normal world:** a steady, mature market. Most startups do okay and nobody does spectacularly.
- **Unicorn world:** venture capital as it usually looks. Most startups lose money, and a rare few produce most of the returns. The numbers were tuned to match the pattern reported in published VC data (for example, Correlation Ventures' analysis of thousands of VC deals).

> **These are illustrative models inspired by VC data, not predictions.** They are simplified on purpose so that the experiment is easy to follow. They do not forecast how any real startup or fund will perform.

### Why lognormal and not Pareto

Both worlds use a **lognormal** curve, with the same shape and a different spread.

- **It fits how startups grow.** Growth compounds (a company doubles, then doubles again), so outcomes multiply. That produces a lopsided curve: you can't lose more than 100%, but the upside has no ceiling.
- **It keeps the experiment clean.** Both worlds have the same shape, so any difference in results comes from one thing only: how unequal the outcomes are.
- **It keeps averages measurable.** A Pareto ("power law") curve is the classic model for VC returns. But to match real VC data, its tail has to be so extreme that the average never settles down, even over 100,000 simulated games, and the 95% confidence intervals in our decision rule would be meaningless. A wide lognormal reproduces the same pattern (most lose, a few win big) while keeping averages stable enough to test.

Screenshots, results and setup instructions will be added when the project is complete.

## Documentation

- [PRD.md](PRD.md): product requirements and plan
- [PROMPTS.md](PROMPTS.md): log of all prompts used to build this project
