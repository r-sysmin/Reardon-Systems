---
title: "AI and GPU bills change the repatriation math"
category: "Platforms"
readTime: "15 min read"
date: 2026-09-06
summary: "GPU capacity is the fastest-growing line item on most mid-market cloud bills, and the least predictable. Here's how to model it before your next renewal."
featured: true
---
Two years ago, if you asked a mid-market CTO what was driving their cloud bill, they would have said compute and storage. Today, in most of the assessments we run, the answer is GPU.
The pattern is consistent. A team experiments with a model on a small number of instances, finds a use case that works, and scales it. Six months later the GPU line item is 30–50% of the cloud bill, and the finance team is asking questions nobody can answer.
This post is about how to model that spend, and where private capacity starts to win.
## Why GPU spend is different
The reason GPU spend breaks cloud bills is not that GPUs are expensive. It is that the demand shape is different from every other workload on the bill.
**Steady-state CPU workloads** have predictable utilization curves. You can forecast them, right-size them, and buy committed-use discounts against them.
**Bursty CPU workloads** spike and recover. They are expensive on-demand, cheap with autoscaling, and manageable with a good FinOps practice.
**GPU workloads** are neither. They have a utilization problem that is unique: the moment you need a GPU, you need a lot of it, and the moment you are done, you need none. Inference traffic is spiky in ways that are hard to predict, and training jobs run for hours or days at a time and then stop.
The result is a bill that looks like noise. On-demand GPU pricing is high enough that running production inference on it is expensive. Reserved capacity is cheap enough that running it without full utilization is expensive. There is no obvious right answer.
## The three workload shapes
Before deciding whether to move GPU workloads off the cloud, it helps to sort them into three buckets.
**1. Training.** Large, discrete jobs. Run for hours or days. Usually scheduled. Tolerate spot instance interruption with checkpointing.
**2. Fine-tuning.** Smaller than full training. Can often run on a single node. Predictable enough to schedule.
**3. Inference.** Ongoing. Latency-sensitive. Traffic varies by time of day, day of week, and product events. This is where most of the money is being spent, and where the decisions are hardest.
Each bucket has a different answer to the cloud-vs-private question.
## Where public cloud still wins
Let me say this clearly, because it is the part most repatriation pitches skip:
**For training, public cloud is usually the right answer.**
The reason is that training workloads have a shape that matches what public cloud is good at. They are bursty, they are predictable in the aggregate, and they benefit enormously from the ability to scale up and down on demand. Spot instances and preemptible VMs exist specifically for this use case, and the discounts are real.
The exception is teams with very high, very steady training demand — think a research lab or a foundation model company. For those teams, private training clusters can win on cost. For everyone else, training on public cloud is usually cheaper.
**For inference, it depends.**
Inference is where private capacity starts to make sense, and it is where most of the savings in a GPU repatriation project come from. The reason is that inference demand is often more predictable than it looks once you separate it from the noise.
Most teams think their inference traffic is spiky. What they actually have is a steady baseline plus occasional spikes. The baseline is usually 60–80% of peak, and it runs 24/7.
That baseline is what you move. The spikes stay on public cloud.
## The math that matters
Here is the framework we use in an assessment.
**Step 1: Establish the baseline.**
Look at GPU utilization over the last 90 days. Find the 25th percentile utilization per model, per region. That is your steady-state floor. It is the amount of GPU capacity you are running continuously, whether you need it or not.
**Step 2: Model the fully loaded cost.**
For each steady-state workload, compute:
- On-demand cloud cost at current utilization
- Reserved instance cost if you committed for a year
- Private cost: hardware amortized over 3–4 years, plus power, cooling, rack space, and ops hours
The ops hours are the part teams underestimate. A single GPU node needs the same patching, monitoring, and incident response as any other server. The number is not zero, and it is not small.
**Step 3: Find the crossover.**
The crossover point — where private is cheaper than cloud, fully loaded — is usually around 60–70% sustained utilization. Below that, public cloud wins. Above that, private wins, and the gap widens quickly.
For a team with 8 GPUs running 70% average utilization, the private case is usually marginal. For a team with 32 GPUs at the same utilization, the private case is usually strong.
**Step 4: Model the burst.**
Everything above the steady-state floor stays on public cloud. This is not a compromise — it is the point. The hybrid model exists because no single environment is right for every workload shape.
## The hidden costs on both sides
The honest version of this math includes costs that are easy to forget.
**On the cloud side:**
- Egress charges when inference outputs leave the cloud
- Data transfer between GPU regions and storage
- Managed service premiums for anything that touches the GPU pipeline
- The cost of the reserved capacity you are not fully using
**On the private side:**
- Power and cooling. A single H100 node can draw 10kW under load, and that is not free.
- Rack space in a colo. Varies widely by market.
- Networking. Cross-connects, bandwidth commits, and redundancy.
- Spares. You need at least one spare node per cluster, or you need a support contract.
- The ops team. Even a small private GPU cluster needs dedicated capacity to run.
The private numbers sound large. They usually are. The question is whether the fully loaded private cost is lower than the fully loaded cloud cost for the steady-state baseline. For most mid-market teams with sustained GPU demand, the answer is yes, but not by as much as the on-demand comparison suggests.
## What this means in practice
If you are trying to figure out whether GPU workloads belong on private infrastructure, the sequence looks like this:
1. **Measure actual utilization** over 90 days, per workload. Do not trust peak numbers or on-demand pricing as a proxy for real cost.
2. **Compute the fully loaded cost** on both sides, including ops, power, and spares.
3. **Find the crossover point** for your specific utilization. If you are below 60%, you are probably not a private GPU candidate.
4. **Pilot on one workload**, with a parallel run against the baseline. GPUs are expensive enough that a pilot is worth the time even for a small cluster.
5. **Keep the burst on public cloud.** This is not a compromise. It is the point.
The teams that get this right do not move everything to private, and they do not keep everything on public. They place workloads deliberately, based on utilization and economics, and they revisit the placement annually.
## The honest summary
AI and GPU bills have changed the repatriation math, but not in the way most pitches suggest. The pitch is usually "GPUs are expensive on cloud, so move them off." The reality is more nuanced.
Training workloads usually belong on public cloud. Inference workloads sometimes belong on private, depending on utilization. The crossover point is real, and it is around 60–70% sustained utilization for most workloads.
The teams that will save the most money on GPU spend over the next two years are not the ones that moved everything to private. They are the ones that measured carefully, moved the steady baseline, kept the burst on public, and revisited the decision every year.
That is a less satisfying story than "we saved 60% on GPUs." It is also the one that holds up when the finance team asks how the numbers were built.
---
*Next in the series: when public cloud should keep the workload.*

---

# Blog post 3
