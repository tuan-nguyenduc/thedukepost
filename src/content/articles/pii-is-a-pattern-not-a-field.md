---
title: "The Data Had No Name on It. It Still Mapped a Secret Military Base."
description: "A 2018 fitness-app heatmap outed military bases without a single name field attached — the same blind spot is the default setting in most logging and tracing pipelines."
image: "/images/pii-heatmap-lights-cover.jpg"
pubDate: 2026-07-27
author: "The Duke Post"
category: "security"
tags: ["pii", "privacy", "observability", "devops", "data-classification"]
featured: false
draft: false
---

In November 2017, Strava — the GPS fitness-tracking app millions of runners and cyclists use to log their routes — published something it called the Global Heatmap: every public activity ever recorded on the platform, layered into one glowing image of the planet. A billion activities. Three trillion GPS points. Ten terabytes of input data, rendered down to brightness — the more people moved through a place, the brighter it glowed.

Two months later, Nathan Ruser, a 20-year-old international-security student at Australian National University, was scrolling over Syria. Most of the desert was dark — nobody logs a jog there. Except for a few unmistakable clusters of glowing lines, laid out in the exact geometry of a running loop, sitting in the middle of nowhere. He posted what he'd found, and by the weekend it had gone viral: the same pattern showed up around U.S. and coalition bases in Afghanistan, around Australia's secretive Pine Gap intelligence facility, over a Chinese military outpost on Woody Island in the South China Sea — perimeters, supply routes, patrol paths, all traced by people out for a run wearing a watch that talked to satellites.

Here's the part that should bother anyone who builds systems for a living: none of that data had a name attached to it. Strava's heatmap was, technically, anonymized and aggregated — exactly the transformation most privacy programs treat as the finish line. It still worked as a targeting map.

## PII isn't a field. It's a pattern.

Most PII programs are built around a list: email, phone, full name, home address, national ID. Scan for those fields, redact or restrict them, ship it. That list is necessary — but it encodes an assumption that turned out to be exactly what got Strava in trouble: that identifiability lives in the field, not in what the fields add up to.

A GPS ping isn't PII. A timestamp isn't PII. A device ID with no name behind it isn't PII. Strava's heatmap contained none of the fields on anyone's checklist. What it contained was the same anonymous ping, repeated at the same hour every day, tracing the same loop, in a location where the only plausible explanation was "one of the small number of people stationed at this specific base." That's not a field problem — it's identifiability that only exists once enough dots get connected. Privacy researchers have a name for exactly this: a quasi-identifier, a piece of data that's harmless alone and de-anonymizing in combination.

<figure>
  <img src="/images/pii-fitness-tracker.jpg" alt="Close-up of a person checking a rugged GPS sports watch mid-workout, showing workout duration, distance, and heart rate." loading="lazy" />
  <figcaption>Distance, heart rate, a timestamp — the kind of data any fitness watch logs by default, none of it a name. Aggregated at scale, that was enough to trace a military base's perimeter. Photo: streetsh / <a href="https://unsplash.com/photos/_UZVVThG_u0" target="_blank" rel="noopener noreferrer">Unsplash</a>.</figcaption>
</figure>

## The same shape of data lives in your logging pipeline

No one reading this runs a fitness app that maps army bases. But the shape of the mistake — collect fields that look harmless in isolation, aggregate them somewhere, assume "no name field means safe" — is the default behavior of most observability stacks, not an edge case.

A trace span doesn't carry a name field either. It carries a `user_id`, a `session_id`, a client IP, a request path, a timestamp down to the millisecond, sometimes a device fingerprint. None of that trips a redaction rule written to catch "email" or "phone." But `user_id` + IP + timestamp, joined across enough spans, reconstructs exactly what the heatmap did at global scale: one specific person's routine, visible to anyone with query access to the trace store. Do that across a couple of services and you don't need a name field at all — you can usually work backward to one from the pattern itself.

<figure>
  <img src="/images/pii-combination-diagram.svg" alt="Diagram showing three individually harmless fields — a GPS ping, a timestamp, and a device ID — converging into a combined pattern labeled 'same route, every day, same empty desert = one identifiable person'." loading="lazy" />
  <figcaption>None of the three fields on the left would trip a redaction rule written to catch names, emails, or phone numbers. Joined, they're a fingerprint.</figcaption>
</figure>

"Anonymized" exports have the same failure mode. A dataset that had names and emails stripped but still carries a device ID, a rounded location, and a timestamp is one join away from being exactly as identifying as the raw table it was supposedly de-risked from — the strip just removed the fields someone remembered were on the list.

## PII and secrets aren't the same risk

It's worth being precise here, because PII conversations tend to fold in secrets — API keys, passwords, tokens — and the two need different defenses. A leaked API key is a capability someone can use immediately; the fix is rotation and tighter secret management. A leaked PII record isn't a capability, it's an exposure; the fix is minimizing what you collect and controlling who can query it, because there's no rotating a person's home address or their daily jogging route. Strava's leak makes the distinction obvious: nothing about it was a credential leak. Nobody logged in as anyone. The damage was that a pattern of behavior became visible to people it was never meant to be visible to.

<figure>
  <img src="/images/pii-dashboard-data.jpg" alt="Close-up of an analytics dashboard on a monitor, showing a users-in-last-30-minutes counter and a top-countries breakdown with user counts by country." loading="lazy" />
  <figcaption>A "top countries" panel like this looks like harmless aggregate telemetry — right up until it's small enough, or specific enough in combination with other panels, to point at one person's location and habits instead of a crowd's.</figcaption>
</figure>

## The fix that has to change is the default, not the checklist

A field-name checklist will always be reactive — someone adds "email" to the redaction list the first time an email leaks in a log line. What actually holds up is treating identifiability as something that emerges from combination, and building pipelines that don't collect or don't expose the joinable fields by default, rather than trusting that the fields get scrubbed after the fact:

- **Classify by joinability, not just by field name.** A device ID next to a coarse location and a timestamp is a different risk than any one of those alone — treat the combination, not the individual column, as the unit of classification.
- **Redact at write time, in the collector, not at query time in a dashboard.** By the time an engineer is looking at a trace and deciding it "looks fine," it's already been written, replicated, and possibly exported somewhere else.
- **Treat "anonymized and aggregated" as a claim to verify, not a status to trust.** Strava's heatmap was both, and it still leaked. The test isn't whether names were removed — it's whether the output can still be tied back to one person with data an attacker plausibly has.
- **Make the safe behavior the default**, not an opt-out a developer has to remember to flip on a new service. A control nobody enables by default is a control that only works for the people who already understood the risk without it.

## The part Strava never fixed

After the story broke, Strava's actual response was to make the opt-out easier to find — moving it onto the first page of privacy settings within weeks. What it didn't do was change the default: the heatmap [remained opt-out, not opt-in](https://www.engadget.com/2018-03-01-strava-simplified-opt-out-heat-map.html). Years later, [a 2023 study out of NC State](https://privacy-datahub.csc.ncsu.edu/publication/childs-conpro-2023) showed researchers could still de-anonymize individual users from the public heatmap, using essentially the same combination trick Nathan Ruser spotted by eye in 2018.

That's the actual lesson, and it isn't really about a fitness app. It's that a fix depending on someone remembering to opt out, or remembering to add one more field to a redaction list, is a fix that has already failed once — because the leak that gets you is never the field you knew to check for. It's the one that looked like nothing, right up until it lined up with two other fields that also looked like nothing.
