<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep all banking screens in the single mobile shell and reuse `BankCard` everywhere, because one future PNG replacement must update every card appearance.
- Banking access uses a cryptographically random device capability persisted locally and hashed server-side in separate RLS-locked tables; no login or public access to existing owner data.
- Render the reload splash once in the root document using paths extracted from the supplied vector; CSS animates the original geometry and respects reduced motion.
