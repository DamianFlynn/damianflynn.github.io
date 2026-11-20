# Letting AI operate production Azure — what it gets wrong


## Abstract

Real failure stories from AI-assisted operations, each with the guardrail that fixed it:

- an Azure GET can't prove a property is settable (recommended four times off an empty read);
- advising a change from a stale read in the middle of a cutover;
- restating a verified fact until it's wrong;
- a disk caching change that hot-detached a production disk;
- "a freeze is not a control".

Plus the patterns that worked: subagents, cross-model review with gh copilot, and grep-verifying every HIGH finding. It's honest, funny, and very MVP.

