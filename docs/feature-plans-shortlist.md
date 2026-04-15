# Planned features shortlist
- TODO: Analyze and decide where to place into existing feature roadmap.

## Batch rating updates per tournament 

## For players: think about displayed name vs actual name + edge cases

## Publish tournament 
- Publishing tournament takes a while (esp for more events), at least several seconds
- Add some sort of visual indicator that publishing is in progress (loading bar? spinning wheel?)

# Long-term ideas
- Notes for things we could do in the future

## TD manual draw modifications
- Allow TD to manually change draws/groups/brackets auto-generated at event start
- Think about how to do this- drag and replace? type?

## Figure out observability
Learn to use/understand:
- Vercel built-in logs
- Neon dashboard

## DB branching 
- Add DEV branch for testing usage when developing future features

## Add "League" competition format
- Separate rating scope
- Essentially a RR but with different group forming logic: given groups of size N, top N rated players are in group 1, then next N are in group 2, etc. 
- Subfeature idea: previous week group N winner advances to group N-1. 
- Subfeature idea: "league season" that can be signed up for in bulk

## Add "Leaderboard" competition format 
- For player groups that have friendly competitions 
- Can choose to be rated or unrated
- Anyone in the group can add matches
- Rank by W/L record

## Add table assignment
- TD allots table number range for event
- Keep a list of assigned vs unassigned (free) tables
- Auto-assign free tables to matches based on schedule

## Explain rating
- Link in match history
- Include general explanation of algorithm
- Expand later: include walkthrough of how calculations were applied to specific matches ("?") next to rating delta per row.

## Add doubles, hardbat

## Build out NCTTA-specific functionality
- Competition format: divisionals -> regionals -> nationals
- Add "Schools" entity that players can belong to
- Team Match format: 4 singles, 1 doubles for tiebreaker
- Team Roster submission and player selection for team matches

## Script to import pre-existing player information

## Codebase comprehensive review/refactor for efficiency + reusable components

## UI/UX upgrade with https://github.com/nextlevelbuilder/ui-ux-pro-max-skill

## NotebookLM integration for creating visuals to explain the app