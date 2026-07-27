---
title: "The Data Had No Name on It. It Still Mapped a Secret Military Base."
description: "A 2018 fitness-app heatmap outed military bases without a single name field attached — what that means for where PII actually hides in your stack, and which of redaction, masking, tokenization, or encryption actually fixes it."
image: "/images/pii-heatmap-lights-cover.jpg"
pubDate: 2026-07-27
author: "The Duke Post"
category: "security"
tags: ["pii", "privacy", "observability", "devops", "data-classification"]
featured: false
draft: false
---

In November 2017, Strava — the GPS fitness-tracking app millions of runners and cyclists use to log their routes — published something it called the Global Heatmap: every public activity ever recorded on the platform, layered into one glowing image of the planet. A billion activities. Three trillion GPS points. Ten terabytes of input data, rendered down to brightness — the more people moved through a place, the brighter it glowed.

Two months later, Nathan Ruser, a 20-year-old international-security student at Australian National University, was scrolling over Syria. Most of the desert was dark — nobody logs a jog there. Except for a few unmistakable clusters of glowing lines, laid out in the exact geometry of a running loop, sitting in the middle of nowhere. The same pattern showed up around U.S. and coalition bases in Afghanistan, Australia's secretive Pine Gap facility, and a Chinese military outpost on Woody Island — perimeters and patrol paths, traced by people out for a run wearing a watch that talked to satellites.

None of that data had a name attached to it. Strava's heatmap was, technically, anonymized and aggregated — exactly the transformation most privacy programs treat as the finish line. It still worked as a targeting map.

## PII isn't a field. It's a pattern.

Most PII programs are built around a list: email, phone, full name, home address, national ID. Scan for those fields, redact or restrict them, ship it. That list is necessary — but it encodes an assumption that got Strava in trouble: that identifiability lives in the field, not in what the fields add up to.

A GPS ping isn't PII. A timestamp isn't PII. A device ID with no name behind it isn't PII. Strava's heatmap had none of the fields on anyone's checklist — just the same anonymous ping, repeated at the same hour every day, in a location where the only plausible explanation was "someone stationed at this base." Privacy researchers call this a quasi-identifier: harmless alone, de-anonymizing in combination. It's also why there's no universal PII field list — the same `city` or `device_id` column is noise in a million-user dataset and a full identification in a hundred-user one, depending on what else it sits next to.

<figure>
  <img src="/images/pii-fitness-tracker.jpg" alt="Close-up of a person checking a rugged GPS sports watch mid-workout, showing workout duration, distance, and heart rate." loading="lazy" />
  <figcaption>Distance, heart rate, a timestamp — the kind of data any fitness watch logs by default, none of it a name. Aggregated at scale, that was enough to trace a military base's perimeter. Photo: streetsh / <a href="https://unsplash.com/photos/_UZVVThG_u0" target="_blank" rel="noopener noreferrer">Unsplash</a>.</figcaption>
</figure>

## Where PII actually hides — and why the combination is the real risk

Picture a smaller version of the same mistake: a support engineer debugging a failed checkout pulls up the raw request log, and sitting next to the stack trace is a customer's email, phone number, and shipping address — captured because "log everything so we can debug it later" is the default almost every framework ships with. It's still PII, still in plaintext, and just as exposed if that log line reaches a third-party error tracker or a contractor on an unrelated ticket.

PII collects in the same handful of places, over and over:

- **Application, access, and audit logs** — anything captured from a raw request or response body.
- **Distributed traces** — span attributes like `user_id`, client IP, and session tokens, sometimes whole headers or payloads if capture isn't scoped.
- **The primary database, object storage, and the data warehouse** they feed.
- **Message queues and event streams**, fanning the same payload out to every subscriber.
- **Support tooling** — tickets, ad-hoc CSV exports, one-off dumps generated to answer a single question and then forgotten.

Logs and tracing are the riskiest of the five: a payload gets replicated the moment it's captured — to a log aggregator, an APM tool, a backup, a data lake — and each hop has its own access list nobody audited together. The same quasi-identifier trap applies here too: a span carries no name field, just a `user_id`, an IP, and a timestamp, none of which trips a redaction rule built for "email." Joined across enough spans, it reconstructs one person's routine as precisely as the heatmap did at global scale.

<figure>
  <img src="/images/pii-combination-diagram.svg" alt="Diagram showing three individually harmless fields — a GPS ping, a timestamp, and a device ID — converging into a combined pattern labeled 'same route, every day, same empty desert = one identifiable person'." loading="lazy" />
  <figcaption>None of the three fields on the left would trip a redaction rule written to catch names, emails, or phone numbers. Joined, they're a fingerprint.</figcaption>
</figure>

## Four tools, four different jobs

Once you know where PII sits, the fixes come down to four techniques that get used interchangeably and shouldn't be:

- **Redaction** removes the field entirely before it's written — the log line never contains the phone number at all.
- **Masking** keeps a truncated, non-reversible fragment for debugging — the last three digits of a phone number, say, enough to confirm "right customer" without exposing the whole thing.
- **Tokenization** swaps the value for a token mappable back to it only inside a separate, access-controlled system — for joining datasets without either one holding the raw PII.
- **Encryption** protects data at rest and in transit, but doesn't substitute for the other three in a logging pipeline — anyone with normal log access still sees plaintext once it's decrypted for display. It answers "can someone read this if they steal the disk," not "can someone read this by accident."

Logs and tracing should default to redaction or masking, since that data exists to be read by a human in real time. Databases can lean more on encryption plus access control, since reads there are structured and permissioned.

## PII and secrets aren't the same risk

PII conversations tend to fold in secrets — API keys, passwords, tokens — but the two need different defenses. A leaked API key is a capability someone can use immediately; the fix is rotation. A leaked PII record isn't a capability, it's an exposure; the fix is minimizing what you collect and controlling who can query it, because there's no rotating a person's home address. Strava's leak makes the distinction obvious: nothing about it was a credential leak, nobody logged in as anyone — the damage was a pattern of behavior becoming visible to people it was never meant to be visible to.

## Why it actually leaks

The same causes show up in nearly every PII incident: raw bodies logged without redaction, debug logging left on in production long after the incident that justified it, tracing capturing full headers and payloads instead of an allowlist, exports shipped unmasked because the pipeline predates the policy, logs kept indefinitely with no retention owner. Different failures, same shape: a safe default that quietly went unsafe, or a control that existed but depended on someone remembering to use it.

<figure>
  <img src="/images/pii-dashboard-data.jpg" alt="Close-up of an analytics dashboard on a monitor, showing a users-in-last-30-minutes counter and a top-countries breakdown with user counts by country." loading="lazy" />
  <figcaption>A "top countries" panel like this looks like harmless aggregate telemetry — right up until it's small enough, or specific enough in combination with other panels, to point at one person's location and habits instead of a crowd's.</figcaption>
</figure>

The fixes that actually hold up are the ones that don't route through anyone's memory:

- **Classify by joinability, not just by field name** — a device ID next to a coarse location and a timestamp is a different risk than any one of those alone, so treat the combination as the unit of classification.
- **Redact or mask at write time**, inside the collector, not at query time in a dashboard — by the time an engineer decides a trace "looks fine," it's already been written and replicated.
- **Make the safe behavior the default**, not an opt-in a developer has to remember to enable on a new service — a control nobody enables by default only protects the people who already understood the risk without it.

## The part Strava never fixed

After the story broke, Strava's actual response was to make the opt-out easier to find — moving it onto the first page of privacy settings within weeks. What it didn't do was change the default: the heatmap [remained opt-out, not opt-in](https://www.engadget.com/2018-03-01-strava-simplified-opt-out-heat-map.html). Years later, [a 2023 study out of NC State](https://privacy-datahub.csc.ncsu.edu/publication/childs-conpro-2023) showed researchers could still de-anonymize individual users from the public heatmap, using essentially the same combination trick Nathan Ruser spotted by eye in 2018.

That's the actual lesson, and it isn't really about a fitness app. It's that a fix depending on someone remembering to opt out, or remembering to add one more field to a redaction list, is a fix that has already failed once — because the leak that gets you is never the field you knew to check for. It's the one that looked like nothing, right up until it lined up with two other fields that also looked like nothing.
