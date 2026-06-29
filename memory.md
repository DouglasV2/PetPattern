# PetPattern Memory

This file is the product memory for future development conversations.

## Founder intent

The goal is to build a highly defensible pet industry software business with recurring revenue.

The product must not be a generic AI chatbot, symptom Q&A app, calorie calculator, pet translator, or novelty tool.

The core product thesis:

> Pet owners will pay for a system that remembers their pet over months and years, detects meaningful changes, and helps them avoid missing early signs of suffering.

## Product name

Working name: **PetPattern**

Possible positioning:

> A private health memory for your dog.

> Your dog can’t tell you what’s wrong. But the pattern is already there.

## Strongest wedge

Start with dogs that have recurring:

- itching
- soft stool
- diarrhea
- vomiting
- suspected food intolerance
- ear redness
- licking/scratching
- repeated food changes

This is more emotionally urgent than generic pet wellness.

## Why this can become defensible

The product gets stronger with time because it stores structured pet-specific history.

The more a user logs, the more valuable the product becomes:

- 3 months: baseline is established
- 6 months: repeated patterns become visible
- 12 months: switching cost increases because the pet’s history lives inside the system

## What makes it different from ChatGPT

ChatGPT can answer a one-off question.

PetPattern owns the structured timeline:

- what the pet ate
- when symptoms started
- how intense symptoms were
- what changed before the symptoms
- what happened after medication or food changes
- what is normal for this specific pet

The moat is not “AI answers.”

The moat is longitudinal memory plus structured pattern detection.

## UX principles

The UI should feel:

- calm
- trustworthy
- warm
- specific
- human
- emotionally aware

The UI should not feel:

- generic SaaS
- dashboard-heavy
- “AI copilot” themed
- cute/gimmicky
- overly clinical
- crypto/web3/startup-looking

Avoid words like:

- AI-powered
- copilot
- revolutionary
- smart dashboard
- assistant
- diagnose

Prefer words like:

- baseline
- pattern
- changed
- usual
- today
- bring this to your vet
- what changed before this

## Core screens

### 1. Onboarding

Owner creates pet profile.

Need to make the user feel:

> “This app is going to learn my pet, not give generic advice.”

### 2. Bella today

The main screen.

Shows:

- today’s check-in status
- small signal cards
- one meaningful pattern card
- recent timeline

### 3. Daily check-in

Must take less than 20 seconds.

Ask only:

- stool
- itching
- energy
- appetite
- water
- sleep
- unusual events

### 4. What changed before this?

Timeline that connects:

- food changes
- symptom changes
- meds
- notes

### 5. Vet summary

A clean, non-diagnostic summary for a veterinarian.

## Emotional marketing hooks

Strongest hook:

> Your dog can’t tell you what’s wrong. But the pattern is already there.

Alternative:

> Most pet owners notice too late. PetPattern learns what “normal” means for your dog.

Ad hook:

> If your dog keeps itching, it may not be random. Track the pattern before the next vet bill.

## MVP scope

3-month MVP should include:

- pet profile
- daily check-ins
- food logs
- deterministic pattern cards
- baseline tracking
- vet summary view
- basic subscription-ready structure

Do not start with:

- wearable integrations
- full vet portal
- insurance partnerships
- computer vision stool classifier
- complex AI diagnosis
- mobile apps before validating retention

## Backend philosophy

Use deterministic logic first.

AI is allowed only for:

- summarization
- extraction
- rewriting medical-safe explanations
- report formatting

AI is not allowed to:

- diagnose
- prescribe
- generate unsupported correlations
- override deterministic confidence rules

## Initial monetization hypothesis

Subscription:

- Free: one pet, basic logs, short history
- Plus: advanced history, pattern cards, vet reports
- Household plan: multiple pets

Early price range:

- €8–12/month for owner plan
- higher later for multi-pet/vet-connected plan

## Initial validation plan

Recruit 30 dog owners with recurring itching or stomach problems.

Measure:

- do they log daily?
- do they trust the pattern cards?
- do they show the vet summary to a vet?
- do they say the product noticed something they missed?
- would they pay after 30 days?

## Current pilot status

This repository contains a first technical pilot:

- React frontend
- Spring Boot backend
- PostgreSQL persistence
- deterministic pattern engine
- Bella demo seed

The next conversation should continue from this pilot, not restart the product strategy.
