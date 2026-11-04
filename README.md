# One Shot

**One Shot** is an interactive classroom experiment about a real management decision: when to stop searching and commit. The audience plays an investor with $1M who must back exactly one of 20 startups. The startups appear one at a time, and a rejected startup is gone forever. The room plays two rounds, the second against four algorithmic investors. Then Python runs live inside the presentation to test the famous 37% rule (from the Secretary Problem), and to check whether the best strategy changes when we change what we measure and what the startup world looks like.

## Status

- ✅ PRD approved
- ✅ Python simulation (`python/sim.py`)
- ⏭️ Next: the game logic

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
