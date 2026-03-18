# Current bugs

## Matches from tournament in draft status showing up in player dashboard
- After shipping v0.6.0, previous tournaments were all made drafts. however, there were still pending matches from one of the previous tournaments which shows up in testuser_2 player dashboard. Normally, tournaments wouldn't go from published back to being a draft, so this shouldn't happen under normal circumstances, but we should add a safeguard that matches shown as upcoming matches in the player dashboard should only appear if the tournament is in progress. 

## No way to navigate directly to event detail page from TD dashboard
- TD dashboard shows list of events, each event card should also be clickable that brings you to the event detail page. right now the event cards aren't clickable, can only navigate to event detail page by clicking edit button on the event card then "back to event". 

## Edit event button should also show up in the event detail page for TD
- Right now, only appears on the tournament detail page with list of events

## Back-route navigation fix
- Right now, navigating from tournament detail page -> manage -> edit tournament brings you to the page to edit the tournament settings, and there's a button for "back to tournament" which brings you back to the tournament detail page. i think it would make more sense for the edit tournament page to have a back button which brings you back to the TD dashboard/"manage" page, not all the way back to the tournament detail page. 
- Similarly, the event detail page (if accessed from the TD dashboard) should have a back button that brings back to the TD dashboard, not to the overall tournament detail page. 

## Auto-open registration
- If tournament is in PUBLISHED state, all events should get updated to have REGISTRATION_OPEN. Any new events created after tournament is published should also default to REGISTRATION_OPEN

## Auto-close registration
- If tournament is started, registration should be auto-closed for all events

## Add event button should only be in the TD dashboard, no longer in the tournament detail page

## Tournaments and events should automatically start at their set startTime

## Brackets/RR schedules should be generated automatically upon event start 

# Fixed

## Version 0.4.1

### Bracket page showing up in round robin format after event creation
After creating a new round robin event with 3 players (call them A, B, C for simplicity) and clicking "generate schedule", app generates a bracket with quarterfinal between player B and C, semifinal between player A and B, and final between player A and C, and shows it on webpage. this should not exist at all, after generating schedule for round robin TD should see the page that can be navigated to by "view standings" button that shows current standings with table of players, w/l, games, points and the match schedule.

### Text alignment for matches from TD view
status text such as "completed", "pending", "awaiting confirmation", and match options like "enter result", and "void" aren't visually aligned. in particular, the "void" option is clearly visually slightly lower inside the box than the other text. should fix this and recheck text alignment for other text fields as well.

## Version 0.3.1

### Game score validation
- Score gap when either score is >11 has to be at most 2. This is because the win by 2 rule has to take place after deuce (10-10) is reached. Need to reject game scores like 11-50.
