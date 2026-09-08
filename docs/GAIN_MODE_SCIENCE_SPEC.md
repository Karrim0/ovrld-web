# Gain Mode V1 — Science & Safety Specification

## Purpose

Gain Mode is a behavioural tracking and training-support experience for adult women who intentionally want to gain body weight. It is not a medical diagnosis, treatment plan, or substitute for a physician or registered dietitian.

The product should help a user answer four recurring questions:

1. Am I eating consistently enough for my goal?
2. Is my body-weight trend moving over time?
3. Am I training consistently and getting stronger?
4. What is the smallest sensible next action based on those signals?

## Evidence translated into product rules

### Gradual gain, not random overeating

The NHS describes gradual healthy weight gain and notes that adults could try adding roughly 300–500 kcal/day, with balanced food choices, protein and strength training. It also recommends smaller meals, snacks and energy-dense additions when larger meals are difficult.

**Product rule:** Simple Mode does not prescribe a rigid calorie number. It begins with consistency and uses the observed weight trend before suggesting a small food adjustment. Precision calorie targets can be a later opt-in mode.

### Low appetite deserves a different strategy

Small frequent meals/snacks and calorie-dense additions can be more practical than forcing large meals for people who struggle to eat enough.

**Product rule:** appetite and large-meal difficulty materially change the recommendation shown by Gain Mode.

### Protein is a useful reference, not the entire plan

Morton et al. (2018) found a breakpoint around 1.6 g protein/kg/day in a meta-regression of resistance-training studies, beyond which additional protein produced little additional lean-mass benefit on average.

**Product rule:** V1 shows `~1.6 g/kg/day` as a simple approximate reference when a current weight exists. It is labelled as a reference, not a personalized medical prescription.

### Resistance training is central

Systematic reviews show adult women make substantial strength and hypertrophy gains from resistance training. Meta-analyses comparing men and women using the same protocols report broadly similar *relative* hypertrophy responses.

ACSM's 2026 resistance-training position stand emphasizes consistency, individualization and sufficient weekly volume; for hypertrophy it gives ~10 weekly sets per muscle group as a broad practical target rather than a mandatory rule.

**Product rule:** Gain Mode never treats scale weight as the only success signal. Workout adherence, progressive performance and plan distribution remain part of the process.

### Avoid overclaiming from short-term scale changes

Body weight fluctuates. A single reading should not trigger a major change.

**Product rule:** recommendations are based on repeated measurements and elapsed time. If data are insufficient, the correct output is “collect more data,” not a fake diagnosis.

### Female-specific safety without stereotypes

The IOC consensus on Relative Energy Deficiency in Sport describes health/performance consequences of prolonged or severe low energy availability, including effects on reproductive and musculoskeletal health. Unexpected weight loss and concerning eating behaviours can also warrant clinical assessment.

**Product rule:** Gain Mode includes a visible safety boundary. Unexpected weight loss, persistent symptoms or a concerning relationship with food should prompt professional evaluation. V1 does not diagnose RED-S, eating disorders, hormonal problems or gastrointestinal disease.

## Data minimisation

Only collect health-adjacent data that changes the product:

- weight trend
- height
- age (18+ gate)
- appetite / early fullness
- activity level
- diet pattern
- training data already present in OVRLD

Do not collect menstrual-cycle details merely for novelty. If a future safety screen asks about major menstrual changes, it should be optional, explained, privacy-conscious and designed with clinical input.

## V1 recommendation hierarchy

1. If a weigh-in is due: collect the measurement.
2. If there is not enough trend data: keep collecting; do not change the plan.
3. If weight is flat and training adherence is poor: fix consistency before changing intake.
4. If weight is flat, adherence is reasonable and appetite is low: suggest one easy repeatable energy addition / smaller frequent intake strategy.
5. If weight is moving and gym performance is improving: keep the process stable.
6. Otherwise: make no large adjustment from one noisy week; continue observing.

### V1 trend guardrail

To operationalize the “do not react to one reading” rule, V1 waits for at least three recent weight readings spanning roughly 14 days before it can suggest an intake adjustment. The app estimates the recent slope from measurements inside an approximately 21-day window. This is a product guardrail for noise reduction, not a clinical threshold or a claim that 14/21 days are biologically special.

## Sources reviewed

- NHS. *Healthy ways to gain weight.* https://www.nhs.uk/live-well/healthy-weight/managing-your-weight/healthy-ways-to-gain-weight/
- Morton RW et al. *A systematic review, meta-analysis and meta-regression of the effect of protein supplementation on resistance training-induced gains in muscle mass and strength in healthy adults.* Br J Sports Med. 2018. PMID: 28698222.
- Roberts BM, Nuckols G, Krieger JW. *Sex Differences in Resistance Training: A Systematic Review and Meta-Analysis.* J Strength Cond Res. 2020. PMID: 32218059.
- Hamilton L et al. *Sex differences in absolute and relative changes in muscle size following resistance training in healthy adults: a systematic review with Bayesian meta-analysis.* PMID: 40028215.
- Hagstrom AD et al. *The Effect of Resistance Training in Women on Dynamic Strength and Muscular Hypertrophy: A Systematic Review with Meta-analysis.* Sports Med. PMID: 31820374.
- American College of Sports Medicine. *Resistance Training Prescription for Muscle Function, Hypertrophy, and Physical Performance in Healthy Adults* (2026 Position Stand / supporting infographic).
- International Olympic Committee. *2023 IOC consensus statement on Relative Energy Deficiency in Sport (REDs).* Br J Sports Med. 2023/2024.
