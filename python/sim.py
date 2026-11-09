"""
One Shot: simulation of "when to stop searching" strategies.

An investor sees 20 startups one at a time and must invest in exactly one.
A rejected startup is gone forever. If nobody has been chosen by startup #20,
the investor must take #20.

A cutoff strategy "observe k, then leap" works like this:
  - Look at the first k startups without investing.
  - Then invest in the first startup that beats every startup seen so far.

This file runs in two places:
  - Normal Python: `python python/sim.py` prints the results and writes
    data/results.json (the offline fallback for the slides).
  - The browser, through Pyodide: the slides call run(), run_live() and
    replay() directly.

The only dependency is numpy.
"""

import json
import math

import numpy as np

N = 20                       # startups per game
CUTOFFS = list(range(N))     # every possible "observe k" cutoff, 0..19
STRATEGIES = {"10%": 2, "25%": 5, "37%": 7, "50%": 10}   # 37% of 20 = 7.4 -> 7
Z95 = 1.96                   # 95% confidence interval multiplier

# Both worlds use a lognormal curve: same shape, different spread.
# "median" is the typical startup's return multiple; "spread" sets how unequal
# outcomes are. These are illustrative models inspired by VC data, not predictions.
WORLDS = {
    "normal": {"median": 2.0, "spread": 0.4},
    "unicorn": {"median": 0.5, "spread": 1.7},
}


# ---------------------------------------------------------------- core helpers

def world_returns(z, world):
    """Turn standard normal draws into return multiples for one world."""
    w = WORLDS[world]
    return w["median"] * np.exp(w["spread"] * z)


def world_mean(world):
    """Average return of a random startup in this world (exact formula)."""
    w = WORLDS[world]
    return w["median"] * math.exp(w["spread"] ** 2 / 2)


def choose(values, k):
    """Index of the startup each game picks with cutoff k."""
    games, n = values.shape
    if k == 0:
        return np.zeros(games, dtype=int)
    best_seen = values[:, :k].max(axis=1)
    better = values[:, k:] > best_seen[:, None]
    found = better.any(axis=1)
    first = better.argmax(axis=1) + k
    return np.where(found, first, n - 1)   # forced to take the last one


def mean_ci(x):
    """Mean and half-width of its 95% confidence interval."""
    x = np.asarray(x, dtype=float)
    return float(x.mean()), float(Z95 * x.std(ddof=1) / math.sqrt(len(x)))


def verdict(diff, half_width):
    """Decision rule from the PRD: the predicted difference is positive."""
    if diff - half_width > 0:
        return "CONFIRMED"
    if diff + half_width < 0:
        return "REJECTED"
    return "INCONCLUSIVE"


def summary(diff, half_width):
    return {"diff": diff, "ci_low": diff - half_width, "ci_high": diff + half_width,
            "verdict": verdict(diff, half_width)}


# ---------------------------------------------------------------- full analysis

def run(trials=200_000, seed=37):
    """Simulate `trials` games and test H0, H1 and H2. Returns a plain dict."""
    rng = np.random.default_rng(seed)
    z = rng.standard_normal((trials, N))

    # Strategies only use rank ("is this the best so far?"), and both worlds are
    # increasing transforms of the same draws z. So each game picks the same
    # startup in both worlds; only the payoff differs. This makes every
    # comparison paired, which gives tighter confidence intervals.
    rows = np.arange(trials)
    ranks = np.argsort(np.argsort(-z, axis=1), axis=1) + 1        # 1 = best
    values = {w: world_returns(z, w) for w in WORLDS}

    picks = {}   # per cutoff: chosen index
    sweep = {"cutoffs": CUTOFFS, "p_best": [], "stuck": [], "bad_pick": [],
             **{w: {"mean": [], "median": []} for w in WORLDS}}
    for k in CUTOFFS:
        chosen = choose(z, k)
        picks[k] = chosen
        rank = ranks[rows, chosen]
        sweep["p_best"].append(float((rank == 1).mean()))
        sweep["stuck"].append(float((chosen == N - 1).mean()))
        sweep["bad_pick"].append(float((rank > N // 2).mean()))
        for w in WORLDS:
            got = values[w][rows, chosen]
            sweep[w]["mean"].append(float(got.mean()))
            sweep[w]["median"].append(float(np.median(got)))

    def best_cutoff(curve):
        return int(np.argmax(curve))

    strategies = {}
    for name, k in STRATEGIES.items():
        rank = ranks[rows, picks[k]]
        entry = {"k": k}
        for metric, x in (("p_best", rank == 1), ("stuck", picks[k] == N - 1),
                          ("bad_pick", rank > N // 2)):
            m, h = mean_ci(x)
            entry[metric] = {"value": m, "ci": h}
        for w in WORLDS:
            got = values[w][rows, picks[k]]
            m, h = mean_ci(got)
            entry[w] = {"mean": m, "ci": h, "median": float(np.median(got))}
        strategies[name] = entry

    def best_indicator(k):
        return (ranks[rows, picks[k]] == 1).astype(float)

    def payoff(world, k):
        return values[world][rows, picks[k]]

    # H0: on P(best), the 37% strategy beats 10%, 25% and 50%,
    #     and the best cutoff in the sweep is near 37% (k = 6, 7 or 8).
    h0_tests = {}
    for other in ("10%", "25%", "50%"):
        d = best_indicator(7) - best_indicator(STRATEGIES[other])
        h0_tests[f"37% vs {other}"] = summary(*mean_ci(d))
    h0_best_k = best_cutoff(sweep["p_best"])
    verdicts = [t["verdict"] for t in h0_tests.values()]
    if "REJECTED" in verdicts:
        h0 = "REJECTED"
    elif all(v == "CONFIRMED" for v in verdicts) and h0_best_k in (6, 7, 8):
        h0 = "CONFIRMED"
    else:
        h0 = "INCONCLUSIVE"

    # H1: in the normal world, on average return, 25% beats 37%,
    #     and the best cutoff is earlier than 37% (k < 7).
    h1_test = summary(*mean_ci(payoff("normal", 5) - payoff("normal", 7)))
    # Effect size in plain terms: how much higher the average return is, in %.
    h1_test["relative_gain"] = h1_test["diff"] / strategies["37%"]["normal"]["mean"]
    h1_best_k = best_cutoff(sweep["normal"]["mean"])
    if h1_test["verdict"] == "REJECTED":
        h1 = "REJECTED"
    elif h1_test["verdict"] == "CONFIRMED" and h1_best_k < 7:
        h1 = "CONFIRMED"
    else:
        h1 = "INCONCLUSIVE"

    # H2: in the unicorn world, the best cutoff for average return moves later
    #     than in the normal world. Measured as: the advantage of 37% over 25%,
    #     relative to each world's average startup, is larger in the unicorn
    #     world, and the sweep's best cutoff is later. The verdict uses the
    #     mean only (PRD decision rule); the median is reported as an observation.
    mu, mn = world_mean("unicorn"), world_mean("normal")
    did = ((payoff("unicorn", 7) - payoff("unicorn", 5)) / mu
           - (payoff("normal", 7) - payoff("normal", 5)) / mn)
    h2_test = summary(*mean_ci(did))
    med = {w: {k: float(np.median(payoff(w, k))) for k in (5, 7)} for w in WORLDS}
    median_did = ((med["unicorn"][7] - med["unicorn"][5]) / WORLDS["unicorn"]["median"]
                  - (med["normal"][7] - med["normal"][5]) / WORLDS["normal"]["median"])
    h2_best_k = {w: best_cutoff(sweep[w]["mean"]) for w in WORLDS}
    median_agrees = (median_did > 0) == (h2_test["diff"] > 0)
    if h2_test["verdict"] == "REJECTED":
        h2 = "REJECTED"
    elif h2_test["verdict"] == "CONFIRMED" and h2_best_k["unicorn"] > h2_best_k["normal"]:
        h2 = "CONFIRMED"
    else:
        h2 = "INCONCLUSIVE"

    return {
        "config": {"n": N, "trials": trials, "seed": seed, "strategies": STRATEGIES,
                   "worlds": WORLDS,
                   "random_pick_mean": {w: world_mean(w) for w in WORLDS}},
        "sweep": sweep,
        "strategies": strategies,
        "hypotheses": {
            "H0": {"claim": "On P(best), 37% beats 10%, 25% and 50%; best cutoff near 37%",
                   "tests": h0_tests, "best_cutoff": h0_best_k, "verdict": h0},
            "H1": {"claim": "Normal world, average return: 25% beats 37%; best cutoff before 37%",
                   "test": h1_test, "best_cutoff": h1_best_k, "verdict": h1},
            "H2": {"claim": "Unicorn world: best cutoff for average return moves later",
                   "test": h2_test,
                   "observation": {"median_diff": median_did,
                                   "median_agrees_with_mean": bool(median_agrees),
                                   "median_25": med["unicorn"][5],
                                   "median_37": med["unicorn"][7]},
                   "best_cutoff": h2_best_k, "verdict": h2},
        },
    }


# ---------------------------------------------------------------- live helpers

def run_live(trials=10_000, seed=None, n=N):
    """Quick version for the stage: the four strategies, with n startups per game.
    Each strategy observes the same share of startups: 37% of 100 = 37."""
    rng = np.random.default_rng(seed)
    z = rng.standard_normal((trials, n))
    rows = np.arange(trials)
    best = z.argmax(axis=1)
    out = {}
    for name in STRATEGIES:
        k = int(name.rstrip("%")) * n // 100     # with n = 20: 2, 5, 7, 10
        chosen = choose(z, k)
        out[name] = {"k": k, "p_best": float((chosen == best).mean()),
                     **{f"mean_{w}": float(world_returns(z, w)[rows, chosen].mean())
                        for w in WORLDS}}
    return {"trials": trials, "n": n, "strategies": out}


def replay(startup_values, trials=10_000, seed=None):
    """Reshuffle the room's own 20 startups many times and run each strategy."""
    rng = np.random.default_rng(seed)
    v = np.asarray(startup_values, dtype=float)
    games = rng.permuted(np.tile(v, (trials, 1)), axis=1)
    rows = np.arange(trials)
    out = {}
    for name, k in STRATEGIES.items():
        got = games[rows, choose(games, k)]
        out[name] = {"p_best": float((got == v.max()).mean()),
                     "mean_return": float(got.mean())}
    return {"trials": trials, "strategies": out}


# ---------------------------------------------------------------- command line

def _print_report(r):
    pct = lambda x: f"{100 * x:5.1f}%"
    print(f"\nOne Shot simulation: {r['config']['trials']:,} games, seed {r['config']['seed']}\n")
    print(f"{'Strategy':<9}{'P(best)':>9}{'Stuck':>8}{'Bad pick':>10}"
          f"{'Normal mean':>13}{'Unicorn mean':>14}{'Unicorn median':>16}")
    for name, s in r["strategies"].items():
        print(f"{name:<9}{pct(s['p_best']['value']):>9}{pct(s['stuck']['value']):>8}"
              f"{pct(s['bad_pick']['value']):>10}"
              f"{s['normal']['mean']:>12.3f}x{s['unicorn']['mean']:>13.3f}x"
              f"{s['unicorn']['median']:>15.3f}x")
    print("\nBest cutoff (k startups observed):")
    print(f"  P(best): k={r['hypotheses']['H0']['best_cutoff']}"
          f" | normal mean: k={r['hypotheses']['H2']['best_cutoff']['normal']}"
          f" | unicorn mean: k={r['hypotheses']['H2']['best_cutoff']['unicorn']}")
    print("\nHypotheses:")
    for key, h in r["hypotheses"].items():
        print(f"  {key}: {h['verdict']:<13} {h['claim']}")
        tests = h.get("tests") or {"test": h["test"]}
        for label, t in tests.items():
            print(f"      {label}: diff {t['diff']:+.4f}  95% CI [{t['ci_low']:+.4f}, {t['ci_high']:+.4f}]")
    print()


def save_charts(r, folder):
    """Save the results as PNG charts. Command line only: the browser never
    calls this, so Pyodide does not need matplotlib."""
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    VIOLET, LIGHT, CORAL, GRAY = "#7c3aed", "#ddd6fe", "#ff6b6b", "#64748b"
    plt.rcParams.update({"font.size": 12, "axes.spines.top": False, "axes.spines.right": False,
                         "axes.titleweight": "bold", "axes.titlesize": 14})
    names = list(r["strategies"])
    strat = r["strategies"]
    sweep = r["sweep"]
    ks = sweep["cutoffs"]
    trials = r["config"]["trials"]
    folder.mkdir(exist_ok=True)
    saved = []

    def bars(ax, values, cis, highlight, fmt, ylabel):
        colors = [VIOLET if n == highlight else LIGHT for n in names]
        ax.bar(names, values, yerr=cis, color=colors, capsize=6, ecolor=GRAY)
        for i, v in enumerate(values):
            ax.text(i, v + max(values) * 0.02, fmt(v), ha="center", va="bottom", fontweight="bold")
        ax.set_ylim(0, max(values) * 1.18)
        ax.set_ylabel(ylabel)
        ax.set_xlabel("Strategy (share of the 20 startups observed first)")

    def sweep_line(ax, values, best, ylabel, color=VIOLET, label=None):
        ax.plot(ks, values, "o-", color=color, ms=4, label=label)
        ax.axvline(best, color=color, ls="--", lw=1)
        ax.annotate(f"best: observe {best}", (best, values[best]), xytext=(10, -24),
                    textcoords="offset points", color=color, fontweight="bold",
                    bbox=dict(fc="white", ec="none", alpha=0.9, pad=2))
        for k in r["config"]["strategies"].values():
            ax.axvline(k, color=GRAY, lw=0.6, alpha=0.3)
        ax.set_xlabel("Startups observed before leaping (k)")
        ax.set_ylabel(ylabel)
        ax.set_xticks(range(0, len(ks), 2))

    def save(fig, name, title, error_bars=True):
        fig.suptitle(title, fontsize=16, fontweight="bold")
        note = " · error bars = 95% CI" if error_bars else ""
        fig.text(0.99, 0.01, f"{trials:,} simulated games · seed {r['config']['seed']}{note}",
                 ha="right", fontsize=9, color=GRAY)
        fig.tight_layout(rect=(0, 0.03, 1, 0.95))
        path = folder / name
        fig.savefig(path, dpi=150)
        plt.close(fig)
        saved.append(path)

    # 1. Strategy comparison: chance of picking the single best startup.
    fig, (a, b) = plt.subplots(1, 2, figsize=(13, 5))
    bars(a, [strat[n]["p_best"]["value"] for n in names], [strat[n]["p_best"]["ci"] for n in names],
         "37%", lambda v: f"{100 * v:.1f}%", "Chance of picking the best")
    a.set_title("The four strategies")
    sweep_line(b, sweep["p_best"], r["hypotheses"]["H0"]["best_cutoff"], "Chance of picking the best")
    b.set_title("Every possible cutoff")
    save(fig, "strategies.png", f"H0: the 37% rule finds the best startup most often ({r['hypotheses']['H0']['verdict']})")

    # 2. Hypothesis 1: average return in the normal world.
    h1 = r["hypotheses"]["H1"]
    fig, (a, b) = plt.subplots(1, 2, figsize=(13, 5))
    bars(a, [strat[n]["normal"]["mean"] for n in names], [strat[n]["normal"]["ci"] for n in names],
         "25%", lambda v: f"{v:.2f}x", "Average return (normal world)")
    a.set_title(f"25% beats 37% by {h1['test']['diff']:+.3f}x (about {100 * h1['test']['relative_gain']:.0f}%)")
    sweep_line(b, sweep["normal"]["mean"], h1["best_cutoff"], "Average return (normal world)")
    b.set_title("Every possible cutoff")
    save(fig, "hypothesis1-average-return.png", f"H1: for average return, stop earlier ({h1['verdict']})")

    # 3. Hypothesis 2: the unicorn world moves the best cutoff later.
    h2 = r["hypotheses"]["H2"]
    fig, (a, b) = plt.subplots(1, 2, figsize=(13, 5))
    sweep_line(a, sweep["normal"]["mean"], h2["best_cutoff"]["normal"], "Average return (normal world)")
    a.set_title("Normal world")
    sweep_line(b, sweep["unicorn"]["mean"], h2["best_cutoff"]["unicorn"], "Average return (unicorn world)", color=CORAL)
    b.set_title("Unicorn world")
    save(fig, "hypothesis2-unicorn-world.png",
         f"H2: in a world of unicorns, the best cutoff moves later ({h2['verdict']})", error_bars=False)
    return saved


if __name__ == "__main__":
    from pathlib import Path

    root = Path(__file__).resolve().parent.parent
    results = run()
    _print_report(results)
    out = root / "data" / "results.json"
    out.parent.mkdir(exist_ok=True)
    out.write_text(json.dumps(results, indent=2))
    print(f"Saved {out.relative_to(root)}")
    for path in save_charts(results, root / "python-output"):
        print(f"Saved {path.relative_to(root)}")
