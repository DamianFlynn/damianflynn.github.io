# Agents need an identity, and your IT department will say no


## Abstract

Everyone agrees AI agents should be treated like employees: their own identity, scoped permissions, an owner, monitoring and offboarding. Then you try to do it.

The agent on your laptop runs as you, because your machine is the security context. Your IT team rejects the application identity you ask for, because it doesn't do MFA. Half your backends never see Entra ID at all, because they authenticate with personal access tokens. And the moment an agent can act on behalf of a user, "who owns this agent" quietly turns into "whose permissions does it have".

This session is a practitioner's account of doing this for real, using our own company as customer zero. We'll cover where the identity breaks down, how an AI gateway can translate between Entra and legacy backends, and a simple governance model that holds up: an organisational ruleset for every agent, a versioned authorisation contract for each one, and runtime enforcement that stops an agent exceeding its contract even when it's prompted to. Moving from "draft a message" to "send a message" is a permission change, not a new feature.

What attendees will learn:

- Why agents default to the human's identity, and what it takes to change that
- Getting agent identities approved by security teams that currently say no
- Using an AI gateway to bring non-Entra backends under the same control
- A three-layer governance model: organisational rules, per-agent contracts, runtime enforcement
- Why every change in an agent's authority needs a version, an approver and evidence

Level: Intermediate–Advanced (300–400)

Audience: Security architects, identity and platform teams, AI and governance leads

