# Planned features shortlist
- TODO: Analyze and decide where to place into existing feature roadmap.

## Multi-select add entrants for TD, only display non-registered players in paginated results

## Tournament flow reversal - option to move from "published" back to "draft"
- Also fix: TD should be able to "start event" for new events added to in-progress tournaments. right now attempting that displays an error message saying the tournament has to be published.

## Birth year code for verification in case of only one phone

## Way to toggle "keep me signed in" for Clerk?
- Investigate

## Preview component-ify entrants and schedule

## Historical ratings preservation
- When looking at past tournament results, player ratings displayed should be the ratings at the time of the event start, and not display their current rating.

## For players: think about display vs actual name + edge cases

# Long-term ideas
- Notes for things we could do in the future

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

## Develop custom algorithm for rating in separate org (RB rating)
- Factor in age of player/number of years active

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

## Security check for all user input