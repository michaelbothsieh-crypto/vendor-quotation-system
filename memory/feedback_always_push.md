---
name: feedback-always-push
description: User wants every completed change pushed to the GitHub remote automatically, without being asked each time.
metadata:
  type: feedback
---

After making and committing a change in this repo, push to `origin master` immediately — don't wait for the user to say "push it" again.

**Why:** User said "改完就push 下次請記得" (once it's changed, push it — remember this next time) after several rounds where pushing only happened when explicitly requested.

**How to apply:** Treat "commit" and "push" as one combined step for this repo by default. Combined with [[feedback_skip_deploy_verification]] — push and stop, no polling `vercel ls` or curling prod afterward.
