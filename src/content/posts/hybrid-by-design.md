---
title: "Hybrid by design: when public cloud should keep the workload"
category: "Strategy"
readTime: "13 min read"
date: 2026-09-08
summary: "Not every workload belongs on private infrastructure. Here's the decision framework we use in Assessment."
featured: false
---
The most common mistake in a repatriation project is treating it as a binary choice.
The team decides to "move off the cloud," and every workload becomes a candidate. The result is a migration that takes longer than expected, costs more than expected, and ends with a private platform that is worse than the cloud for half the workloads it now runs.
The alternative is to treat placement as a per-workload decision. Some workloads belong on private infrastructure. Some belong on public cloud. Some belong on both, split by traffic pattern.
This post is the framework we use to make that call.
## The three questions
For every workload, we ask three questions, in order.
**1. Is the demand steady or spiky?**
A workload with steady, predictable demand is a candidate for private. A workload with genuinely spiky demand is a candidate for public.
The word "genuinely" is doing a lot of work there. Most teams believe their demand is spikier than it is. When we look at 90-day utilization data, the pattern is usually a steady baseline plus occasional spikes, not the unpredictable chaos the team describes.
The honest test: what percentage of the time is the workload running at 50% or more of its peak? If the answer is "most of the time," the workload is steady. If the answer is "a few hours a day," it is spiky.
**2. Is the workload stateful?**
Stateful workloads are painful to move because the state has gravity. Databases, message queues, and file stores all have data that has to go somewhere, and moving it is expensive and risky.
The default answer for stateful workloads is to leave them where they are unless the cost savings are large enough to justify the migration complexity. In practice, this means most databases stay on public cloud unless they are very large and very steady.
Stateless workloads (API services, workers, job runners) are much easier to move. They are the natural starting point for a repatriation.
**3. What does the workload depend on?**
This is the question that kills more repatriation plans than any other. A workload that looks simple on a diagram often turns out to depend on six managed services the team forgot about.
The list of things to check:
- Managed databases (RDS, Aurora, Cloud SQL)
- Managed queues and streams (SQS, Kinesis, Pub/Sub)
- Managed caches (ElastiCache, Memorystore)
- Managed storage (S3, GCS, Blob)
- Identity and access (IAM, workload identity, secrets managers)
- Observability (CloudWatch, Datadog agents with cloud-specific integrations)
- CI/CD (CodePipeline, Cloud Build, GitHub Actions runners)
Any workload with significant dependencies on managed services has to either replace those services on the private side or keep them on the cloud. Both are valid options, but the decision has to be made explicitly, not discovered mid-migration.
## The placement matrix
Once you have answers to the three questions, the framework is straightforward.
| | **Steady demand** | **Spiky demand** |
|---|---|---|
| **Stateless** | **Private.** The strongest candidate. Move first. | **Public.** Autoscaling is cheap and effective. |
| **Stateful** | **Depends.** Private if the data volume justifies it and migration risk is manageable. Otherwise public. | **Public.** Almost always. |
The strongest candidates for private are stateless workloads with steady demand and minimal managed-service dependencies. This is not a coincidence. It is why every successful repatriation project starts with a workload in this quadrant.
## Worked examples
**A CI/CD runner fleet.**
Runners are stateless, they run near-100% utilization during working hours, and they have minimal managed-service dependencies (they need a queue and a cache, both of which are easy to run on private infrastructure).
This is a textbook private candidate. The cost savings are large because the workload is steady and the cloud pricing for compute-heavy CI is expensive.
**A customer-facing API.**
Depends on the traffic pattern. If the API has a steady baseline with peaks during business hours, the baseline belongs on private and the peaks belong on public. This is the classic hybrid pattern, and it is more common than teams realize.
If the API is genuinely spiky (think a ticketing platform that spikes during on-sale events), keep it on public. Autoscaling is exactly the right tool for that shape.
**A production database.**
Almost always stays on public cloud unless it is very large, very steady, and the migration risk is acceptable. The managed-service benefits (backups, replication, patching, failover) are real and hard to replicate on private infrastructure without significant engineering investment.
**An ML inference service.**
Depends on utilization. See the previous post for the detailed math. The short version: steady baseline goes private, burst stays on public.
**A batch analytics pipeline.**
Almost always public. The workload is bursty by nature, and the managed services (data warehouse, orchestration, storage) are usually worth the premium.
## The four most common mistakes
**1. Moving everything.**
The most expensive mistake. Every workload that moves has to justify the migration cost, and workloads in the wrong quadrant will never pay it back.
**2. Moving nothing.**
The opposite mistake. Teams that decide the whole thing is too hard to think about end up paying cloud pricing for workloads that would clearly be cheaper on private infrastructure.
**3. Moving the wrong thing first.**
Starting with a stateful workload or a workload with heavy managed-service dependencies guarantees a painful first project. Start with the easiest, highest-savings workload in the stateless/steady quadrant.
**4. Forgetting the operating model.**
A hybrid estate needs a hybrid operating model. If the private side is run by the same team that runs the cloud side, and that team has no private infrastructure experience, the whole thing will fail. Either invest in the capability or buy it under a managed-operate engagement.
## What hybrid actually looks like
A well-run hybrid estate is not two separate infrastructures with a lot of duct tape between them. It is one platform with two execution environments.
The things that make this work:
- **A single control plane.** Developers deploy through the same pipeline regardless of target environment.
- **A single observability stack.** Metrics, logs, and traces from both environments land in the same place.
- **A single identity layer.** Workload identity works the same way on both sides.
- **A single cost reporting layer.** Finance sees one number, broken down by environment.
- **Clear placement rules.** Every workload has an explicit answer to "where does this run, and why."
The teams that get hybrid right do not think of it as a compromise. They think of it as the correct architecture for a world where no single environment is right for every workload.
That is the real answer to "should we move off the cloud." The answer is not yes or no. The answer is: which workload, and why.
---
*This is the third in a series on selective repatriation. Previous: private infrastructure without losing velocity, and AI/GPU bills change the math.*

---

# OG image template
