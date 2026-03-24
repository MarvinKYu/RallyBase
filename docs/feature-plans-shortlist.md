# Planned features shortlist
- TODO: Analyze and decide where to place into existing feature roadmap.

## Platform admin and org admin roles + dashboards + permissions
- Platform admin at highest level (should just be me) and can access all tournaments/matches across the site, and can edit any details about any player profile
- Org admin has administrator access to all tournaments/matches within their scoped org, can modify ratings within their org as well

## Birth year code for verification in case of only one phone 

## Update new player default rating: Unrated

## Way to toggle "keep me signed in" for Clerk?
- Investigate

## Preview component-ify entrants and schedule

## Historical ratings preservation
- When looking at past tournament results, player ratings displayed should be the ratings at the time of the event start, and not display their current rating.

# Long-term ideas
- Notes for things we could do in the future

## Add "League" competition format
- Separate rating scope
- Essentially a RR but with different group forming logic: given groups of size N, top N rated players are in group 1, then next N are in group 2, etc. 
- Subfeature idea: previous week group N winner advances to group N-1. 
- Subfeature idea: "league season" that can be signed up for in bulk

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