---
title: "The Front Door Won't Close: What a DDoS Attack Actually Does to Production"
description: "DDoS isn't about traffic volume — it's about bottlenecks, capacity, and how well you can tell attackers apart from real users at 3am."
image: "/images/ddos-network-cables-cover.jpg"
pubDate: 2026-07-26
author: "The Duke Post"
category: "security"
tags: ["ddos", "sre", "incident-response", "infrastructure"]
featured: false
---

It's 3:14am. The pager goes off with a p95 latency alert on `/search`. Thirty seconds later, a second alert: 5xx rate above threshold. CPU on the search pods is pinned at 100%. The queue in front of them is growing, not shrinking.

Every health check is green. The database is fine. The deploy from six hours ago hasn't changed. Nothing is *broken* — and yet real users are getting timeouts, and the on-call engineer is staring at a dashboard that says the system is both up and unusable at the same time.

This is what a DDoS attack looks like from the inside. Not a dramatic outage with red everywhere — a slow, specific squeeze on exactly the resource you didn't protect.

## It's not about how much traffic. It's about where it breaks first

The instinct is to think of DDoS as "too much traffic." That's technically true and almost useless as a mental model, because it tells you nothing about what to actually do.

The more useful framing: **a DDoS attack finds your cheapest bottleneck and pushes on it until legitimate users can't get through.** Sometimes that bottleneck is raw bandwidth. More often, in modern infrastructure, it's something narrower and much less obvious — a connection table, an autoscaling policy, a single endpoint that happens to run an expensive database query.

That distinction matters because it means DDoS resilience isn't one control, it's a property of your whole system: where you put protection, how you isolate expensive paths from cheap ones, and whether you can tell "attack" from "launch day traffic spike" before your on-call team burns an hour finding out the hard way.

## DoS and DDoS aren't the same problem to defend against

DoS and DDoS share a goal — deny service to legitimate traffic — but they don't share a defense.

A DoS attack comes from one source, or a small handful. You can often block it with a firewall rule and move on with your night. A DDoS attack is deliberately distributed across thousands of sources — botnets, compromised IoT devices, open proxies — specifically so that IP blocking doesn't work. Block one range and traffic keeps arriving from ten thousand others.

That's the whole reason DDoS is harder: it forces you to defend at a layer above "block the bad IP," which usually means edge infrastructure you don't fully control yourself — a CDN, an Anycast network, a scrubbing provider — working together with defenses you *do* control inside your own stack.

<figure>
  <img src="/images/ddos-botnet-diagram.png" alt="Diagram showing an attacker issuing commands to a controller, which directs a large network of compromised 'zombie' machines to flood a single victim server with traffic." loading="lazy" />
  <figcaption>Every arrow into the victim comes from a different machine — none of them the attacker's own. Diagram: Nasanbuyn / <a href="https://commons.wikimedia.org/wiki/File:Ddos-attack-ex.png" target="_blank" rel="noopener noreferrer">Wikimedia Commons</a>, <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener noreferrer">CC BY-SA 4.0</a>.</figcaption>
</figure>

## Three attacks wearing the same name

"DDoS" gets used as a catch-all, but the three common flavors behave completely differently, and only one of them looks like an obvious attack.

**Volumetric** is the loud one — raw bandwidth, saturating the pipe into your infrastructure before packets even reach your load balancer. Easy to see on a graph, hard to fight without upstream help, because by the time it hits your servers, the damage is already done at the network link.

**Protocol** attacks target state, not bandwidth — a classic SYN flood opens huge numbers of half-finished TCP connections to exhaust a connection table or a load balancer's backlog. The traffic volume can look almost modest. What's exhausted is capacity to *track* connections, not capacity to serve them.

**Application-layer** is the one that should worry you most, because it's the one that looks like your own users. An HTTP flood against a normal-looking endpoint, credential-stuffing traffic dressed up as login attempts, a scraper hammering your search bar — all indistinguishable from real demand until you look at what it's actually doing to your backend. A `/search` endpoint with no cache and no rate limit doesn't need a botnet to fall over; a few thousand requests a second that all miss cache and hit the database will do it.

<figure>
  <img src="/images/ddos-osi-layers-diagram.svg" alt="The seven-layer OSI model, from Physical at the bottom through Data Link, Network, Transport, Session, Presentation, up to Application at the top." loading="lazy" />
  <figcaption>Volumetric attacks hit the lower layers (Physical/Network) before packets even reach your load balancer. Protocol attacks target Transport-layer state (SYN backlogs, connection tables). Application-layer attacks skip straight to the top — layer 7 — which is exactly why they look like ordinary traffic. Diagram: Offnfopt / <a href="https://commons.wikimedia.org/wiki/File:OSI_Model_v1.svg" target="_blank" rel="noopener noreferrer">Wikimedia Commons</a>, public domain.</figcaption>
</figure>

That third category is why "just add more servers" stopped being an answer years ago. You can autoscale in front of an application-layer attack all night — and the attacker gets exactly what they wanted anyway: your cloud bill climbing while real users still time out, because the bottleneck was never compute in the first place.

## Where it actually lands

In production, the same handful of places take the hit, over and over:

- **Bandwidth and egress**, especially for anything public-facing without a CDN in front of it.
- **Load balancer capacity and connection limits** — the layer everyone assumes is infinite until it isn't.
- **Connection state**: SYN backlogs, connection tracking tables, pool limits.
- **Application hotspots** — the one expensive endpoint, the one unindexed query, the one dependency with a slow timeout.
- **Shared dependencies** — a DNS resolver, a NAT gateway, an upstream API — that quietly become a single point of failure for services that thought they were independent of each other.

That last one is the sneaky part. Two teams can each believe their service is resilient, right up until an attack on Service A saturates a NAT gateway that Service B also depends on, and now B is down too, for reasons its own on-call has no visibility into.

## Reading the signs before they read you

The pattern is usually recognizable, if you're looking at the right slice of data: RPS spiking on a narrow set of endpoints rather than uniformly across the site, p95 latency climbing with no corresponding deploy, 5xx and timeout rates rising, CPU and packet loss climbing together, and load balancer connection counts moving in a way that doesn't match your normal traffic shape.

<figure>
  <img src="/images/ddos-monitoring-dashboard.jpg" alt="Close-up of a monitoring dashboard showing multiple metric tiles with line graphs, including click-through rate and quality score panels." loading="lazy" />
  <figcaption>A single spiking tile means nothing on its own — it's the breakdown by endpoint and status code, side by side, that turns a metrics wall into a diagnosis. Photo: Stephen Dawson / <a href="https://unsplash.com/photos/turned-on-monitoring-screen-qwtCeJ5cLYs" target="_blank" rel="noopener noreferrer">Unsplash</a>.</figcaption>
</figure>

The catch is that none of this is visible if your dashboard only shows total RPS. A flood against one endpoint can hide comfortably inside an aggregate number that still looks unremarkable. The fix is cheap: **break down traffic by endpoint and status code by default**, and by region or ASN when you can, so an anomaly on one path doesn't get averaged away into "traffic's a little high today."

## Building for the attack you haven't had yet

None of this requires exotic tooling — mostly it requires deciding, before an incident, which of these you actually have:

- Protection as close to the edge as possible — a CDN or Anycast network in front of anything public, so volumetric traffic never reaches infrastructure you pay to scale.
- Rate limits scoped to client, token, and endpoint — not a single global limit that a determined attacker on one path can spend without anyone else noticing.
- Separation between sensitive and ordinary traffic — admin paths and internal APIs living somewhere an HTTP flood against the public site can't touch.
- Observability that defaults to endpoint- and status-code-level breakdowns, so triage doesn't start with "let me go figure out what normal even looks like."
- A pre-built, controlled degradation mode — serve a lighter response, extend a cache TTL, disable a non-critical feature — so the core user path survives even if a corner of the product doesn't.

## What actually turns an attack into an outage

Attacks happen to everyone with public infrastructure, eventually. Whether it becomes a five-minute blip or a multi-hour incident usually comes down to a short list of gaps: no CDN or edge layer in front of public traffic, no per-endpoint rate limiting on the requests that are actually expensive, no per-tenant quota so one noisy customer can't starve everyone else, load balancers with connection limits nobody load-tested, and — the quiet killer — no runbook, so the first thirty minutes of a real attack get spent re-discovering things a calmer version of the team already knew.

## The endpoint that started it

Back to `/search` at 3:14am. In the version of this story that ends badly, there's no cache, no rate limit, and the runbook is a Slack thread from the last incident that nobody bookmarked. CPU stays pinned, the queue keeps growing, and the fix is improvised live, in production, while users churn.

In the version that ends in twenty minutes: the dashboard already shows the spike is concentrated on one endpoint, a rate limit throttles the offending pattern without touching everyone else, a cache in front of the expensive query buys immediate breathing room, and the runbook says exactly who to loop in if it doesn't resolve on its own.

Same attack. The difference was entirely decided before it started.
