---
title: "Private infrastructure without losing developer velocity"
category: "Platforms"
readTime: "14 min read"
date: 2026-09-04
summary: "The objection that kills most repatriation proposals, and how to answer it with a real pilot instead of a promise."
featured: false
---
Every repatriation conversation dies on the same question. It comes up in the second meeting, usually from a VP of Engineering who has been quiet until now:
*"This sounds good for the bill. What happens to my developers?"*
The question is not unreasonable. Most of the people asking it have lived through a data center migration in 2014, or inherited a legacy private cloud that took three weeks to provision a VM. They have a mental model of "private infrastructure" that means tickets, change advisory boards, and waiting.
That mental model was accurate. It is not accurate anymore.
## What actually changed
The reason private infrastructure used to be slow was not that it was private. It was that the tooling around it was built for a world where provisioning was a manual process and every change went through a review board.
The tooling caught up. Kubernetes, GitOps, Terraform, Pulumi, Crossplane: none of these care whether they are talking to AWS or to a rack in a colo. The developer experience is defined by the interface, not the substrate.
What developers actually touch:
- **A portal** where they open a PR to add a service, environment, or secret
- **A preview environment** that spins up per pull request
- **Observability** that shows logs, traces, and metrics in one place
- **A deploy pipeline** that ships to staging and production without a human in the loop
None of these things require a hyperscaler. They require a control plane that knows how to talk to whatever is underneath it.
## The three things that actually break velocity
When a repatriation goes wrong, it is almost never because the substrate is wrong. It is one of three things:
**1. The control plane is an afterthought.**
If the private platform is built as "servers in a rack" and the developer experience is bolted on later, it will never catch up. The landing zone, the GitOps pipeline, and the preview environments have to be part of the initial build, not a phase-two project.
**2. The self-service boundary is wrong.**
Too much self-service and developers provision things that cost real money and never get cleaned up. Too little and every change is a ticket. The right line is usually: developers self-serve anything that is ephemeral or scoped to a namespace; platform engineers own the things that touch the network edge, identity, and cost.
**3. Secrets and identity are an afterthought.**
This is the one that bites hardest. If secrets management and workload identity are not solved on day one, developers will invent their own solutions, and you will end up with a private platform that is less secure than the public cloud you left.
## What "keeping velocity" actually means
It is worth being precise about this, because "developer velocity" is a phrase that means different things to different people.
For most engineering teams, it breaks down to four things:
- **Time to first deploy** for a new service
- **Time to provision** a new environment
- **Time to roll back** a bad change
- **Time to debug** an incident
If those four numbers are as good on private infrastructure as they were on public cloud, velocity is preserved. If any of them regresses, the repatriation is not done.
This is measurable. A pilot should measure all four against the baseline before, during, and after.
## The honest tradeoffs
Private infrastructure is not free. It has real costs that public cloud does not:
**You own the failure modes.** When the hypervisor has a bad day, there is no status page to check. You are the status page. This means you need SRE capacity, or you need to buy it under a managed-operate engagement.
**Capacity planning becomes your job.** The upside of public cloud is that you can scale elastically for free. The downside of private is that you have to forecast. For steady-state workloads, this is a feature. For genuinely spiky demand, it is a problem. That is why the hybrid answer exists.
**You are on the hook for upgrades.** Kubernetes versions, OS patches, driver updates, CVE responses. All of it. This is where managed operations earns its keep.
None of these tradeoffs are fatal. They are just real. The teams that struggle with repatriation are usually the teams that did not plan for them.
## The pilot as the answer
The reason "will developers lose velocity" is a hard question to answer in a deck is that it depends entirely on how the private platform is built. Two teams can implement the same architecture and get completely different developer experiences.
The only honest way to answer the question is to run a pilot.
A good pilot is:
- **One real workload.** Not a toy. Something with production traffic patterns.
- **A parallel run.** The workload runs in both environments simultaneously, with the same observability, for long enough to compare.
- **Measured on the four velocity metrics.** Time to deploy, provision, roll back, and debug.
- **Measured on cost.** Not just the compute bill, but the fully loaded cost including the ops hours.
- **Time-boxed.** Four to eight weeks is usually enough. Longer than that and it becomes a program.
If the pilot shows velocity is preserved and cost is lower, the answer to the VP of Engineering is "we measured it." If the pilot shows velocity regresses, the answer is "we stop here, and you have lost nothing but the pilot fee."
Both of those answers are better than a promise.
## What good looks like
The teams that have done this successfully tend to share a few traits:
- They started with a workload that was **steady-state and predictable**, not the hardest thing in the estate.
- They invested in the **control plane first**, not the hardware.
- They **kept the public cloud** for burst, managed services, and genuinely unpredictable demand.
- They **measured everything** (cost, velocity, reliability) against a baseline set before the migration started.
- They **did not frame this as anti-cloud.** It was a placement decision, not a religious one.
That last point matters more than it sounds. The teams that framed repatriation as "we're leaving AWS" had a harder time than the teams that framed it as "we're moving the steady stuff off the meter and keeping the rest."
The technology is not the hard part anymore. The tooling is mature enough that a competent platform team can build a private environment that developers do not hate.
The hard part is deciding what to move, and having the discipline to leave the rest alone.
---
*This is the first in a series on selective repatriation. Next: how AI/GPU spend changes the math.*

---

# Blog post 2
