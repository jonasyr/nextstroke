"""Command line for the Phase 0 lab: candidate, pack, decide."""

from __future__ import annotations

import argparse
import json
import sys
from collections.abc import Sequence
from pathlib import Path

from nextstroke_lab.adapters.attempt_log import AttemptLog
from nextstroke_lab.domain.classification import Strategy, Trust
from nextstroke_lab.domain.decision import DeviceEvidence, StudyEvidence, decide
from nextstroke_lab.evaluation import (
    EvaluationError,
    build_outcomes,
    load_key,
    read_audits,
    rubrics_by_candidate,
)
from nextstroke_lab.pipeline import build_candidate, load_case
from nextstroke_lab.rating_pack import PackEntry, make_rating_pack

SHORT = {"s1": Strategy.S1, "s2": Strategy.S2, "s3": Strategy.S3}


def _cost(value: str) -> tuple[Strategy, float]:
    try:
        name, amount = value.split("=", 1)
        return SHORT[name], float(amount)
    except (KeyError, ValueError) as error:
        raise argparse.ArgumentTypeError(f"expected s1|s2|s3=USD, got {value!r}") from error


def _candidate(args: argparse.Namespace) -> int:
    case = load_case(args.case_dir)
    strategy = SHORT[args.strategy]
    out = args.out / case.case_id / strategy.value / str(args.attempt)
    result = build_candidate(case, strategy, args.source, out)
    audit = {"passed": result.audit.passed, "violating_pixels": result.audit.violating_pixels}
    (out / "audit.json").write_text(json.dumps(audit), encoding="utf-8")
    print(json.dumps({"out": str(out), **audit}))
    return 0


def _pack(args: argparse.Namespace) -> int:
    entries = []
    for audit in sorted(args.root.glob("*/*/*/audit.json")):
        folder = audit.parent
        names = {
            "transparent": "layer.png",
            "white": "on-white.png",
            "checkerboard": "on-checkerboard.png",
            "original": "on-original.png",
        }
        images = {k: folder / v for k, v in names.items() if (folder / v).exists()}
        if not images:
            images = {"original": folder / "composite.png"}
        entries.append(
            PackEntry(
                folder.parent.parent.name, Strategy(folder.parent.name), int(folder.name), images
            )
        )
    make_rating_pack(entries, args.out, args.key, seed=args.seed)
    print(json.dumps({"items": len(entries), "pack": str(args.out)}))
    return 0


def _decide(args: argparse.Namespace) -> int:
    try:
        first = rubrics_by_candidate(load_key(args.key), args.ratings)
        final = None
        if args.rereview is not None and args.rereview_key is not None:
            final = rubrics_by_candidate(load_key(args.rereview_key), args.rereview)
        outcomes, unnoticed = build_outcomes(
            AttemptLog(args.log).read(), read_audits(args.root), first, final, dict(args.cost)
        )
    except EvaluationError as error:
        raise SystemExit(str(error)) from error
    evidence = json.loads(args.evidence.read_text(encoding="utf-8"))
    study = StudyEvidence(**evidence["study"]) if "study" in evidence else None
    device = DeviceEvidence(**evidence["device"]) if "device" in evidence else None
    decision = decide(outcomes, study, device, bool(evidence["unreported_selection"]))
    report = {
        "outcome": decision.outcome.value,
        "best_strategy": decision.strategy.value if decision.strategy else None,
        "unmet": list(decision.unmet),
        "triggers": list(decision.triggers),
        "strategies": {
            strategy.value: {
                "cases": len(cases),
                "successes": sum(c.succeeded for c in cases),
                "controlled": sum(a.trust is Trust.CONTROLLED for c in cases for a in c.attempts),
                "unnoticed_changes": unnoticed.get(strategy, 0),
            }
            for strategy, cases in outcomes.items()
        },
    }
    print(json.dumps(report, indent=2))
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="nextstroke-lab", description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)

    cand = sub.add_parser("candidate", help="composite and audit one provider output")
    cand.add_argument("case_dir", type=Path)
    cand.add_argument("strategy", choices=sorted(SHORT))
    cand.add_argument("source", type=Path)
    cand.add_argument("--attempt", type=int, required=True, choices=[1, 2, 3])
    cand.add_argument("--out", type=Path, required=True)
    cand.set_defaults(run=_candidate)

    pack = sub.add_parser("pack", help="build a blinded rating pack")
    pack.add_argument("root", type=Path)
    pack.add_argument("--out", type=Path, required=True)
    pack.add_argument("--key", type=Path, required=True)
    pack.add_argument("--seed", type=int, required=True)
    pack.set_defaults(run=_pack)

    dec = sub.add_parser("decide", help="evaluate spec §15.4 GO/PIVOT")
    dec.add_argument("root", type=Path)
    dec.add_argument("--key", type=Path, required=True)
    dec.add_argument("--ratings", type=Path, required=True)
    dec.add_argument("--rereview-key", type=Path)
    dec.add_argument("--rereview", type=Path)
    dec.add_argument("--log", type=Path, required=True)
    dec.add_argument("--evidence", type=Path, required=True)
    dec.add_argument("--cost", type=_cost, action="append", default=[])
    dec.set_defaults(run=_decide)
    return parser


def main(argv: Sequence[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    try:
        code: int = args.run(args)
    except (FileNotFoundError, ValueError) as error:
        parser.exit(2, f"nextstroke-lab: error: {error}\n")
    return code


if __name__ == "__main__":  # pragma: no cover
    sys.exit(main())
