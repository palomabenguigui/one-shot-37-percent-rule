# One Shot

**One Shot** is an interactive classroom experiment about a real management decision: when to stop searching and commit. The audience plays an investor with $1M who must back exactly one of 20 startups. The startups appear one at a time, and a rejected startup is gone forever. The room plays two rounds, the second against four algorithmic investors. Then Python runs live inside the presentation to test the famous 37% rule (from the Secretary Problem), and to check whether the best strategy changes when we change what we measure and what the startup world looks like.

## Status

- ✅ PRD approved
- ✅ Python simulation (`python/sim.py`)
- ⏭️ Next: the game logic

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
