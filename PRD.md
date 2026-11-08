# PRD: *One Shot*, an Interactive Experiment on When to Stop Searching

**Status:** Approved
**Last updated:** 2026-11-04
**Format:** ~10-slide interactive web presentation, runs locally, ~10 minutes
**Work budget:** ~4 hours

---

## 1. Summary

The audience plays the role of an investor with $1M who must back exactly one of 20 startups. Startups appear one at a time; a rejected startup is gone forever. The room plays twice: first with no strategy, then against four hidden algorithmic investors. Then, live on stage, Python runs thousands of simulations to test which strategy actually performs best, and whether the answer changes when we change **what we measure** and **what the world looks like**.

The famous "37% rule" (from the Secretary Problem) is the starting point, not the conclusion. The presentation tests two hypotheses about its limits and reports whatever the simulation finds.

## 1a. Why this topic

We are Technology Management students, and we follow the startup world closely. Investors, founders and managers face the same problem again and again: opportunities arrive one at a time, waiting has a cost, and a rejected option rarely comes back. That applies to a deal, a hire, a supplier or a product launch window. We want to show that **deciding when to stop searching is a real management decision**, not just a math puzzle, and that the "right" rule depends on what a manager is trying to achieve.

## 2. Goals

1. **Feel like an experiment, not a lecture.** The audience makes real decisions before learning any theory.
2. **Make Python visible and live.** Python runs inside the presentation (Pyodide) and produces the results on screen.
3. **Be honest with the data.** The twists are hypotheses; the slides show the outcome, whether it confirms or rejects them.
4. **Fit in ~10 minutes and ~10 slides**, run locally on one laptop, and still work without internet (using pre-computed results).
5. **Buildable in ~4 hours of work.**

## 3. Non-goals

- No online multiplayer, phones, or server. The room votes by show of hands.
- No full mathematical derivation of the Secretary Problem.
- No realistic startup valuation model. Startup details are flavor; only the return number matters.
- No complex 3D. One simple Three.js scene (the scene itself is **mandatory**; see Deliverables).
- No PowerPoint or external slide tool.

## 4. Audience and setup

- **Audience:** classmates, seated, watching a projector.
- **Interaction:** for each startup the presenter asks "Invest or pass?", the room votes by show of hands, and the presenter clicks the majority choice.
- **Presenter controls:** keyboard. `→`/`←` change slides; `A` = accept (invest), `R` = reject (pass). On-screen buttons as a backup.
- **Readability:** large text and high contrast for projection.

## 5. Game rules

| Rule | Detail |
|---|---|
| Options | 20 startups, shown one at a time, in random order |
| Decision | Accept (invest, game ends) or reject (gone forever) |
| Forced last pick | If the room reaches startup #20, it must invest in it: "The fund must invest its money." |
| What the player sees | Startup name, sector, one-line pitch (flavor only), a **projected return multiple** (e.g. `12.4x`), and a 🏆 **"best so far"** badge when it beats all previous ones |
| Unknown scale | The return scale is randomized each round (one round's best might be 4x, the next one's 40x). The player can't know in advance what a "good" number is, which is why observing first matters. This also keeps the game consistent with the Secretary Problem's assumptions. |
| End of round | Reveal all 20 startups, where the best one was, and the room's pick and its rank (e.g. "3rd best of 20") |

### Round 2: You vs. the algorithms
The room plays a new set of 20 startups. Four hidden bots play the **same** sequence:

| Bot | Observes first | Then picks |
|---|---|---|
| 10% | 2 startups | the first startup better than all previous |
| 25% | 5 startups | same |
| 37% | 7 startups (37% of 20 = 7.4, rounded to 7) | same |
| 50% | 10 startups | same |

Each bot is forced to take #20 if nothing qualifies. Bot choices are revealed after the room decides.

## 6. Research questions and hypotheses

The simulation compares the four strategies (plus a full sweep of every cutoff, 0–19) on these metrics:

| Metric | Meaning |
|---|---|
| **P(best)** | How often the strategy picks the single best startup |
| **Average return** | Mean return multiple of the chosen startup |
| **Stuck rate** | How often the strategy is forced to take #20 |
| **Bad-pick rate** | How often the pick is in the bottom half |

Return distributions ("worlds"):

- **Normal world:** returns vary moderately, with no extreme outliers (candidate: lognormal with low spread).
- **Unicorn world:** heavy-tailed returns, where one startup can be worth more than all the others combined (candidate: Pareto).
- Exact distributions and parameters are chosen in Milestone 1 and explained in plain terms (no formulas required) in the README and on the slides.

Because all strategies decide using only **relative rank** ("is this the best so far?"), P(best), stuck rate and bad-pick rate are the same in both worlds. Only **average return** changes. That is what the hypotheses test.

### Baseline (expected to confirm known theory)
- **H0:** Under P(best), the best cutoff is near 37% (about 7 of 20), and the 37% strategy scores at least as well as the 10%, 25% and 50% strategies.

### Hypothesis 1: changing the goal
- **H1:** In the normal world, when strategies are scored on **average return**, the best cutoff is **earlier than 37%**, and the **25% strategy beats the 37% strategy**.
- Motivation: research on cardinal payoffs (Bearden, 2006) suggests a best cutoff near √n (≈ 4–5 of 20). We test this; we do not assume it.

### Hypothesis 2: changing the world
- **H2:** In the unicorn world, the best cutoff for **average return** moves **later** than in the normal world, closer to 37%, because catching the single best startup matters more.

### Decision rule (set before running)
- Each comparison uses **at least 100,000 simulated games** per strategy per world.
- A hypothesis is **confirmed** if the predicted difference has the predicted sign and its **95% confidence interval excludes zero**.
- It is **rejected** if the difference has the opposite sign and its 95% CI excludes zero.
- Otherwise it is **inconclusive**.
- For every strategy and world we report the **mean**, the **median** and the **95% CI**. The verdict is based only on the 95% CI of the mean difference. The median is reported as an observation and does not change the verdict.
- A confirmed effect can still be small. Alongside each verdict we report the size of the effect in plain terms (e.g. "about 2% higher average return").

### How results drive the slides
Slides 8 and 9 are **result-driven**. Each one states the hypothesis, shows the chart, and stamps a verdict: **CONFIRMED / REJECTED / INCONCLUSIVE**. The final takeaway (slide 10) is written only after the results are known.

## 7. Slide plan (~10 minutes)

| # | Slide | Content | Time |
|---|---|---|---|
| 1 | Cold open | "You have $1M. 20 startups. One shot." (Pyodide starts loading in the background) | 0:30 |
| 2 | Rules | One at a time, no going back, last one is forced, you vote | 0:30 |
| 3 | Round 1 | Live game with the 3D scene | 2:00 |
| 4 | Reveal | Where the best startup was, the room's pick and its rank | 0:45 |
| 5 | The 37% rule | One visual: observe first, then pick the first "best so far" | 0:45 |
| 6 | Round 2 | Room vs. four hidden bots on the same startups, then reveal | 2:00 |
| 7 | Live Python | "One game is luck." Run the simulation live with the code visible: P(best) per strategy, plus a replay of the room's own 20 startups reshuffled 10,000 times | 1:15 |
| 8 | Hypothesis 1 | Average return vs. P(best), normal world, with verdict. Note that the effect is real but small in practice (about 2% higher average return) | 0:45 |
| 9 | Hypothesis 2 | Unicorn world, with verdict. Observation: the average and the typical (median) result point in different directions | 0:45 |
| 10 | Takeaway | The room's stopping points vs. the strategies, plus the conclusion supported by the data | 0:45 |

Total ≈ 10:00. The room's own data (when it stopped in each round) is illustrative only: it is two group decisions, not a study.

## 8. Technical design

| Part | Choice |
|---|---|
| Presentation | Single local `index.html` with vanilla JavaScript; slides are sections the presenter moves through |
| Game logic | JavaScript module: startup generation, voting flow, bots, reveal |
| 3D (**mandatory**, course requirement) | Three.js, one animated scene: a "deal flow" runway above the startup card on slides 3 and 6. 20 slots recede into fog; the current startup's tile rises into a spotlight (gold if best so far), passed tiles tip backward and sink (gone forever), the chosen tile lifts and spins, and a red wall appears on startup #20. In round 2, the first 7 slots sit on a blue "observe only" floor with a gold 37% arch that flashes when the room passes it. It draws only while something moves and never blocks input. If WebGL is unavailable, 2D progress dots are shown instead so the show never breaks |
| Python | One file, `sim.py`, the single source of truth for the simulation (numpy) |
| Python in the slides | Pyodide is loaded from a CDN, loads `sim.py` and runs it live on slides 7–9 |
| Fallback | The same `sim.py` is run ahead of time to produce `results.json`; slides use it automatically if Pyodide fails, is slow, or there is no internet |
| Three.js | Version 0.187 (pinned), stored in the repo under `vendor/three/` (two module files and the MIT license), so the game and 3D work offline |
| Startup sets | Fixed, seeded sets: one for round 1 and one for round 2, so rehearsals match the live show. In round 2 the room and the four bots play the same set |
| Running | Mac: `python3 -m http.server` · Windows: `python -m http.server`. Then open `http://localhost:8000` (Pyodide does not work from `file://`) |

### Repository structure (planned)
```
index.html
css/
js/            game, slides, 3D scene, Pyodide bridge
python/sim.py
data/results.json
vendor/three/  Three.js 0.187 (three.module.js, three.core.js, LICENSE)
screenshots/
PRD.md
README.md
PROMPTS.md
```

## 9. Deliverables (course requirements)

- [ ] Python runs **inside** the presentation (Pyodide)
- [ ] An **animated Three.js element** in the presentation (course requirement; not optional)
- [ ] All documentation in English
- [ ] `PRD.md` (this document)
- [ ] `README.md` with setup instructions, an explanation of the experiment, the hypothesis verdicts, and **screenshots**
- [ ] `PROMPTS.md`, the log of all prompts
- [ ] Runs locally; works without internet using `results.json`
- [ ] Multiple pushes to GitHub showing progress (at least one per milestone)
- [ ] Self-assessment before submission: check every requirement above, run the full show once, and note what works and what could be improved

## 10. Milestones

Each milestone ends with a review and a push before the next begins. Time estimates add up to ~4 hours.

1. **Simulation (`sim.py`)**, ~45 min. Strategies, metrics, both worlds, cutoff sweep, decision rule. Run locally, record verdicts for H0–H2, and produce `results.json`.
2. **Game logic (2D)**, ~45 min. Seeded startup sets, voting flow, forced last pick, bots, reveal. No 3D yet.
3. **Slide shell**, ~40 min. All 10 slides, keyboard navigation, layout for projection.
4. **Pyodide integration**, ~30 min. Live simulation on slides 7–9, background loading, automatic fallback.
5. **Three.js scene (mandatory)**, ~40 min. An animated 3D element is a course requirement. One simple scene, kept light so it never slows down the game.
6. **Docs, rehearsal and self-assessment**, ~20 min. README with screenshots, a timed run-through, self-assessment, final push.

## 11. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Pyodide loads slowly, fails, or there is no internet | Start loading on slide 1; automatic switch to `results.json` |
| Live simulation is too slow on stage | Vectorized numpy; live run uses fewer games (e.g. 10,000); the full 100,000+ analysis is pre-computed |
| Results are inconclusive or reject a twist | That is a valid outcome; slides 8–10 are written from the data |
| Unicorn-world averages are unstable | Report mean, median and 95% CI |
| Running out of the 4-hour budget | The Three.js scene is required, so it is not cut. Polish (extra animations, styling) is cut instead |
| Voting slows the game down | Presenter can move fast; target ~5 seconds per startup |
| Three.js takes too long to build | One scene only, simple shapes, no textures or models. If a computer can't run 3D (no WebGL), the game falls back to the 2D progress dots so the show never breaks |
| Projector readability | Large fonts, high contrast, tested on a projector if possible |

## 12. Decisions

1. **Return distributions:** chosen in Milestone 1 and explained in plain terms.
2. **Title:** *One Shot*.
3. **Startup sets:** fixed and seeded. In round 2 the room and the bots play the same set.
