# PetPattern Product

## Thesis

ChatGPT answers questions. PetPattern remembers your pet.

PetPattern helps **dog and cat** owners build a structured health memory over
time — recurring itching, stool instability and food sensitivity for dogs; litter
box changes, appetite, hiding, water and weight for cats. It surfaces recurring
changes that are easy to miss between vet visits.

## Species (beta scope)

PetPattern is a **multi-species** product with species-specific tracking — 10
species, each with its own daily check-in and cautious pattern language, not a
generic all-pet diary. Dogs and cats have the deepest models (species signals plus
trend analysis); rabbits, guinea pigs, hamsters, birds, reptiles, turtles,
fish/aquariums and other small pets have species-appropriate **starter** tracking
plus a shared visible-change/wound record. Patterns never diagnose or imply a
specific disease — they stay at "a change worth discussing with your vet".

## Wedge

The first wedge is food and symptom correlation:

- What changed in food?
- What happened 3-10 days later?
- Is this normal for this dog, or higher than usual?
- Is the pattern worth bringing to a vet?

## Target User

The target user is a dog or cat owner who has seen recurring, unclear issues and is tired of trying to reconstruct the timeline from memory. They want a calm, credible record that makes vet conversations more useful.

## What To Build

- Fast, species-specific daily check-ins (dog vs cat fields)
- Food and treat exposure tracking
- Baselines for each pet
- Deterministic, species-appropriate pattern candidates
- Vet-ready summaries and timelines

## What Not To Build

- A vet replacement
- A chatbot-first product
- Generic symptom Q&A
- Medical claims
- Food allergy declarations
- A broad pet diary with no pattern engine

## Core Value Moments

### "What changed before this?" — the aha moment

It is not enough to say "Bella's scratching is higher than usual." The product
shows the days leading up to it as a short story: a chicken treat started, then
scratching rose, then stool softened, then ear redness appeared. Seeing the
sequence is what makes an owner feel "maybe this is not random." This is the most
important moment in the product, reached from the pattern teaser on Bella today
and from every pattern card.

### "Bring this to your vet" — the second value moment

The vet-ready summary turns scattered logs into a calm, organized record an owner
can actually hand to a veterinarian: identity, date range, owner-observed
concern, recent signals, food changes, stool changes, possible patterns, and
notes worth discussing — with a clear disclaimer. It is copyable and printable.
It organizes observations; it never diagnoses.

## Progressive Disclosure — the app must feel simple

The biggest risk to adoption is not missing features — it is a first-time owner
opening the app and feeling they must track everything. The product is designed
so the owner thinks: "I can do this in 20 seconds a day."

The whole experience reads as four plain steps:

1. Log how Bella is today.
2. Track food changes when they happen.
3. PetPattern notices patterns over time.
4. Bring a clean summary to the vet.

Advanced features (photo diary, food-elimination trial, recap, AI-assisted
logging, pattern memory) are useful and are NOT removed — but they must not
compete with the core flow. They are progressively disclosed:

- Primary navigation is exactly five: Today, Log, Food, Patterns, Vet.
- Photos → offered inside Log ("Add a photo if it helps") and shown on the timeline.
- Food trial → offered inside Food and inside a food-trigger pattern's detail
  ("Track a careful food trial" — never "protocol" or clinical language).
- Recap → offered inside Patterns ("See your last 30 days").
- AI-assisted logging → a convenience inside Log's optional details, never the
  product ("Write naturally — PetPattern can suggest fields, but you stay in
  control"). AI is never named in navigation.

The Log screen actively reduces anxiety: "Only log what you noticed. A quick
check-in is enough," with inputs grouped into How was Bella? / Anything unusual?
/ Optional details (collapsed). The default habit is small; depth is opt-in.

## Current Sprint Position

Sprint 1-4 establish the product spine:

- Bella today
- Daily check-in
- Food change logging
- Deterministic pattern engine v1

Sprint 5-7 turn the spine into the product's two value moments:

- Sprint 5 — "What changed before this?" pattern timeline
- Sprint 6 — "Bring this to your vet" vet-ready summary
- Sprint 7 — AI-assisted logging as a low-friction input helper (extraction only,
  owner confirms before saving)
