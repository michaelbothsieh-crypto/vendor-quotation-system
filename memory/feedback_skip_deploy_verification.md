---
name: feedback-skip-deploy-verification
description: User wants git push to be the final step; do not wait for Vercel deploy or curl-verify production after pushing.
metadata:
  type: feedback
---

After pushing a commit (e.g. to this vendor-quotation-system repo's GitHub remote, auto-deployed via Vercel), stop there. Do not `vercel ls` to poll deploy status, do not curl production to verify the fix landed, do not schedule a wakeup to check later.

**Why:** User explicitly said "以後只要push就好不用驗證" (from now on just push, no need to verify) after several rounds where the assistant polled `vercel ls` and curled the live site after every push.

**How to apply:** Push and report what was changed in the commit message/summary. Only re-introduce verification if the user asks for it again or reports something is still broken.
