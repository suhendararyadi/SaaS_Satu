# Global Persistent Memory Architecture

Last verified: **16 September 2026 (Asia/Jakarta)**.

School OS now uses a two-level memory model so critical knowledge does not depend on a single project worktree.

## 1. VPS-global Agent Memory — durable authority

Global MSO Agent Memory is stored outside the repository at:

`/home/ubuntu/.mso/agent-memory`

This is the durable source for high-value confirmed semantic/procedural claims that must remain available if the School OS worktree is deleted, moved, or re-cloned.

Verified permissions:

- global root: `0700`;
- per-principal directory: `0700`;
- `MEMORY.md`, `USER.md`, and `records-v1.json`: `0600`;
- owner: `ubuntu`.

No `OS_AGENT_MEMORY_DIR` override is currently needed because the MSO default already resolves to this VPS-global location.

Global human-readable manifest:

`/home/ubuntu/.mso/MEMORY_ARCHITECTURE.md`

Initial snapshot backup:

`/home/ubuntu/backups/MSO/global-agent-memory-20260916T1656WIB.tar.gz`

The backup archive was verified readable and is mode `0600`.

## 2. School OS claims promoted globally

Confirmed high-value knowledge promoted to Agent Memory:

- `project.school_os.identity`
- `project.school_os.production_baseline`
- `project.school_os.program_mapping`
- `project.school_os.student_contract`
- `project.school_os.ptk_contract`
- `project.school_os.design_contract`
- `project.school_os.security_contract`
- `project.school_os.deployment_contract`
- `project.school_os.current_release`
- `project.school_os.backups`
- `project.school_os.docs_entrypoint`
- `project.school_os.memory_architecture`
- `system.mso.global_memory_architecture`

Mutable claims use **replace/supersede semantics** so a new verified value replaces the resolved old value without losing historical provenance.

Examples:

- production baseline;
- current production release;
- authoritative program mapping;
- design/security/deployment contracts when deliberately changed.

## 3. Repo-local Project/RASMIC Memory — operational

The project still keeps operational memory under:

`<project>/.agent/memory/`

This layer remains useful for:

- task history;
- debug findings;
- test evidence;
- failures;
- local project decisions;
- investigation context.

It is intentionally ignored by Git and may disappear if the worktree is deleted.

Therefore, **repo-local `.agent/memory` must never be the only copy of critical long-term knowledge**.

## 4. Workflow/Experience Memory

MSO also has global workflow memory at:

`/home/ubuntu/.mso/skill-memory.json`

This contains reusable execution recipes/experience. It is separate from semantic Agent Memory and should not be treated as the project knowledge store.

## 5. Git documentation

Repository documentation remains the human-readable context layer:

- `docs/AI_AGENT_HANDOFF.md`
- `docs/PROJECT_CONTEXT.md`
- `docs/RELEASE_*.md`
- this file.

Git documentation complements Agent Memory. It is readable without MSO tools but still depends on the repository existing.

## 6. Promotion policy

Promote a project-local memory into global Agent Memory only when:

1. it is confirmed or explicitly approved;
2. it matters across multiple sessions/modules;
3. it should survive worktree deletion or relocation;
4. it contains no raw student/PTK PII or secrets;
5. it is concise enough for reliable retrieval.

Do not promote:

- raw conversations;
- transient task notes;
- routine debug traces;
- temporary build failures;
- raw student/PTK identity payloads;
- credentials, tokens, passwords, private keys, or other secrets.

## 7. Update contract

After a materially important, verified production change:

1. verify production/runtime state;
2. update Git documentation;
3. update repo-local project memory/evidence as needed;
4. **replace affected global Agent Memory claims**;
5. verify global retrieval returns the new resolved values;
6. create/update a global Agent Memory snapshot when the change is significant.

The global store should carry concise facts/contracts, while detailed logs remain in Git/project memory.

## 8. Retrieval contract for future agents

At the beginning of a new School OS session:

1. search/read global Agent Memory for `project.school_os.*`;
2. read `docs/AI_AGENT_HANDOFF.md`;
3. read `docs/PROJECT_CONTEXT.md`;
4. inspect current runtime/repository state;
5. use area-specific release/docs before editing.

Runtime verification wins over stale memory or documentation.

## 9. Current global verification

Verified searches without supplying a project path returned:

- SMKN 12 Garut production baseline;
- active Apple HIG-inspired design contract;
- deployment contract;
- current release `03655f4-ptk-editor`;
- global memory architecture itself.

This demonstrates the promoted knowledge is retrievable independently of the School OS `.agent/memory` folder.

## 10. Recovery limitation

Global Agent Memory survives project deletion, but it does **not** survive complete VPS loss unless `/home/ubuntu/.mso` (or the relevant global memory backup) is preserved by infrastructure/external backups.

For that reason, the VPS backup policy should include:

- `/home/ubuntu/.mso/agent-memory`;
- `/home/ubuntu/.mso/MEMORY_ARCHITECTURE.md`;
- `/home/ubuntu/.mso/skill-memory.json`;
- `/home/ubuntu/backups/MSO/`.
