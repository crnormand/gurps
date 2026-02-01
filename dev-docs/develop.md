## Rules of Engagement

- Everyone who works on GGA needs to pick up Bug issues for the current release. If you want to contribute, start with resolving a bug first, and then add new features.
- No one should have a branch that is not merged into the current dev branch every day of active development. Changes have to be made in small, standalone, and logically consistent steps such that on each commit, the whole platform continues to work even if your are in the "middle" of a big refactor.
- Unit tests can be run via `npm run tdd` or `npm run test`. I would prefer you install the Node TDD extension and configure it to run on every file save. Never push code to the dev branch if any unit test is failing, or they can't run for any reasson.
- All changes should be submitted as a PR and reviewed by either Chris (Nose) or Jeff (Nick Coffin, PI).
- Use the wiki for development discussions, especially about refactoring or new features. https://github.com/crnormand/gurps/wiki/Development-Discussion
