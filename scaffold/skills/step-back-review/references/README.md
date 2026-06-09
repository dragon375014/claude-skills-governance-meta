# step-back-review — references

This skill is the externalised, business-neutral version of the reverse-organ pattern. The full theory — why governance-as-code grows forward-biased, and the three-part fix — lives in the concept doc rather than being duplicated here:

- **Theory**: [`../../../concepts/forward-bias-and-the-reverse-organ.md`](../../../concepts/forward-bias-and-the-reverse-organ.md)
- **The cadence rule that auto-fires this skill**: [`../../../claude-md-rule-templates/rule-34-step-back-cadence.md`](../../../claude-md-rule-templates/rule-34-step-back-cadence.md)
- **The sentinel (Part 2)**: [`../../../../step-back-sentinel-template.mjs`](../../../../step-back-sentinel-template.mjs)

## Originating case study (paraphrased, business-neutral)

A solo founder running a coding agent against a ~12-month production codebase asked: *"Does our skill/governance system have anything like a step-back / gap-analysis mode? My impression is it only happens when I proactively ask."*

The impression was ~70% right. A gap-analysis mechanism existed (inside the architecture-change gate), but it only fired on a forward build declaration — so it always *felt* user-initiated. The deeper finding: across ~30 rules and ~60 skills, **every trigger was forward-facing.** There was no cadence trigger, no adversarial persona, no handoff-stress-test. The system had grown a dense forward immune system and a blank spot exactly where "step back" would live — for the four structural reasons in the concept doc.

The fix shipped as the three-part reverse organ (adversarial skill + asymmetry sentinel + cadence rule), deliberately kept small so it counterweights the forward bias without rebalancing the system or ever blocking a push.
