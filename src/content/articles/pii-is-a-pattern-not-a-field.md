---
title: "The Data Had No Name on It. It Still Mapped a Secret Military Base."
description: "A 2018 fitness-app heatmap outed military bases without a single name field attached — where PII actually hides in your stack, and which of redaction, masking, tokenization, or encryption actually stops it."
image: "../../assets/images/pii-heatmap-lights-cover.jpg"
pubDate: 2026-07-27
author: "The Duke Post"
category: "security"
tags: ["pii", "privacy", "observability", "devops", "data-classification"]
featured: false
draft: false
---

In November 2017, Strava — the fitness app millions of runners and cyclists use to track their routes — published something called the Global Heatmap. It took every public activity ever recorded on the app and laid them all on one glowing map of the planet: a billion activities, three trillion GPS points, ten terabytes of data. The more people moved through a place, the brighter it glowed. Marketing loved it. It looked like the whole planet was breathing.

Two months later, Nathan Ruser — a 20-year-old student in Australia — was scrolling over Syria on the map, presumably procrastinating on an assignment like every other 20-year-old on the internet. Most of the desert was dark, since nobody there logs a run on Strava. But a few spots glowed in the unmistakable shape of a running loop, sitting in the middle of nowhere. The same shape showed up around U.S. bases in Afghanistan, around Australia's secret Pine Gap facility, and over a Chinese military outpost on Woody Island. Soldiers out for a run, wearing a watch that talked to satellites, had traced the outline of their own base — for free, for the whole world, in HD.

None of that data had a name on it. Strava's heatmap was anonymized and aggregated — the exact status most privacy programs treat as "job done." Somewhere, someone in a windowless office had a genuinely terrible Monday.

## PII isn't a field. It's a pattern.

Most PII programs work off a list: email, phone, full name, home address, national ID. Find those fields, redact or restrict them, ship it. It's the compliance equivalent of locking the front door and leaving every window open — technically secure, if nobody looks sideways. That list matters, but it hides an assumption, and that assumption is exactly what got Strava in trouble: identity doesn't live in one field. It lives in what several fields add up to.

A GPS ping isn't PII. A timestamp isn't PII. A device ID with no name behind it isn't PII. Strava's heatmap had none of the fields on anyone's checklist. What it had was the same anonymous ping, at the same hour, every day, in a spot where the only explanation was "someone stationed at this base." Privacy researchers have a word for this: a quasi-identifier — harmless by itself, but enough to identify someone once combined with a couple more. It's also why no single list of PII fields works for every system. The same `city` or `device_id` column is just noise in a dataset of a million users, and a full identification in a dataset of a hundred — it depends on what else sits next to it, a caveat that never quite makes it onto the compliance slide.

<figure>
  <img src="/images/pii-fitness-tracker.jpg" alt="Close-up of a person checking a rugged GPS sports watch mid-workout, showing workout duration, distance, and heart rate." loading="lazy" />
  <figcaption>Distance, heart rate, a timestamp — the kind of data any fitness watch logs by default, none of it a name. Aggregated at scale, that was enough to trace a military base's perimeter. Photo: streetsh / <a href="https://unsplash.com/photos/_UZVVThG_u0" target="_blank" rel="noopener noreferrer">Unsplash</a>.</figcaption>
</figure>

## Where PII actually hides — and why the combination is the real risk

Picture a smaller version of the same mistake. A support engineer is debugging a failed checkout, pulls up the raw request log, and right next to the stack trace sits a customer's email, phone number, and shipping address. Nobody chose to log those on purpose — somebody just set `log.level = debug` back in 2019, and nobody's been brave enough to touch it since. It's still PII, still sitting there in plain text, and just as exposed if that log line ends up in a third-party error tracker or in front of a contractor working an unrelated ticket.

PII collects in the same handful of places, over and over:

- **Application, access, and audit logs** — anything captured from a raw request or response body.
- **Distributed traces** — span attributes like `user_id`, client IP, and session tokens, sometimes whole headers or payloads if capture isn't scoped.
- **The primary database, object storage, and the data warehouse** they feed.
- **Message queues and event streams**, which send the same data out to every service that's listening.
- **Support tooling** — tickets, spreadsheet exports, one-off data dumps built to answer a single question and then forgotten.

Logs and tracing are the riskiest of the five. The moment data is captured, it gets copied — to a log aggregator, a monitoring tool, a backup, a data lake — and each copy has its own list of who can see it, a list nobody checked against the others. The same quasi-identifier trap shows up here too. A trace span has no name field, just a `user_id`, an IP address, and a timestamp — none of which trips a rule built to catch "email." Joined across enough spans, that's enough to reconstruct one person's routine — just like the heatmap did for an army base, except this time it's Dave from accounting, and somehow that isn't any more comforting.

<figure>
  <img src="/images/pii-combination-diagram.svg" alt="Diagram showing three individually harmless fields — a GPS ping, a timestamp, and a device ID — converging into a combined pattern labeled 'same route, every day, same empty desert = one identifiable person'." loading="lazy" />
  <figcaption>None of the three fields on the left would trip a redaction rule written to catch names, emails, or phone numbers. Joined, they're a fingerprint.</figcaption>
</figure>

## Four tools, four different jobs

Once you know where PII sits, there are four different tools for dealing with it, and people use the names interchangeably in meetings — which is how you end up with a Jira ticket titled "encrypt the PII" that doesn't actually fix the thing it's supposed to fix:

- **Redaction** removes the field entirely before it's written — the log line never contains the phone number at all.
- **Masking** keeps a short, non-reversible piece of the data for debugging — say, the last three digits of a phone number, enough to confirm "this is the right customer" without a support agent reading the whole thing out loud over the phone.
- **Tokenization** replaces the value with a token. Only a separate, locked-down system can map that token back to the real value — useful when you need to join two datasets on a customer without either one holding the raw PII.
- **Encryption** protects data sitting on disk or moving over the network, but it doesn't replace the other three inside a logging pipeline — anyone with normal log access still sees the data in plain text once it's decrypted for display. Encryption is the lock on the safe. It says nothing about who already has a key.

Logs and tracing should default to redaction or masking, because that data exists to be read by a person in real time. Databases can lean more on encryption and access control, because reads there go through structured, permissioned queries instead of a person scrolling a raw feed at 2am, squinting.

## PII and secrets aren't the same risk

PII often gets lumped in with secrets — API keys, passwords, tokens — but they need different defenses. A leaked API key hands someone a capability they can use right away; the fix is to rotate it, quickly. A leaked PII record isn't a capability, it's an exposure; the fix is collecting less of it and controlling who can see it, because you can't rotate someone's home address no matter how good your incident runbook is. Strava's leak makes the difference clear. Nothing about it was a credential leak — nobody logged in as anyone. The damage was that a pattern of someone's daily life became visible to people who were never meant to see it.

## Why it actually leaks

The same causes show up in nearly every PII incident. Someone logs the raw request body "just for now." Debug logging stays on in production long after the reason for turning it on is forgotten. Tracing is set to capture everything instead of an approved list of fields, because scoping it felt like a problem for later. Exports go out unmasked because the pipeline was built before the policy was. Logs get kept forever because a retention policy is the kind of thing that lives on next quarter's roadmap and never quite makes it. Different failures. Same shape: a safe default that quietly went unsafe, or a control that only worked if someone remembered to use it — and someone, eventually, doesn't.

<figure>
  <img src="/images/pii-dashboard-data.jpg" alt="Close-up of an analytics dashboard on a monitor, showing a users-in-last-30-minutes counter and a top-countries breakdown with user counts by country." loading="lazy" />
  <figcaption>A "top countries" panel like this looks like harmless aggregate telemetry — right up until it's small enough, or specific enough in combination with other panels, to point at one person's location and habits instead of a crowd's.</figcaption>
</figure>

The fixes that actually hold up are the ones that don't depend on anyone's memory:

- **Classify by what can be joined, not just by field name** — a device ID next to a rough location and a timestamp is a bigger risk than any one of those alone, so treat the combination, not the single column, as the thing you classify.
- **Redact or mask when the data is written**, inside the collector — not later, when someone's looking at a dashboard. By the time an engineer decides a trace "looks fine," it's already been written and copied elsewhere.
- **Make the safe behavior the default**, not something a developer has to remember to turn on for each new service. A setting nobody turns on by default only protects the people who already understood the risk in the first place.

## The part Strava never fixed

After the story broke, Strava's actual fix was to make the opt-out easier to find — it moved the setting onto the first page of privacy settings within weeks, and the problem was declared solved. What it didn't do was change the default. The heatmap [stayed opt-out, not opt-in](https://www.engadget.com/2018-03-01-strava-simplified-opt-out-heat-map.html). Years later, [a 2023 study out of NC State](https://privacy-datahub.csc.ncsu.edu/publication/childs-conpro-2023) found researchers could still identify individual users from the public heatmap, using close to the same trick Nathan Ruser spotted just by scrolling, back in 2018.

None of this is really about a fitness app. A fix that depends on someone remembering to opt out, or remembering to add one more field to a redaction list, is a fix that has already failed once. The leak that actually gets you is never the field you knew to check for. It's the one that looked like nothing — right up until it lined up with two other fields that also looked like nothing.
