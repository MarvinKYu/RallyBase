# Version 0.2 bugs

## Game score validation
- Score gap when either score is >11 has to be at most 2. This is because the win by 2 rule has to take place after deuce (10-10) is reached. Need to reject scores like 11-50.

## Enforce tournament name uniqueness and event name uniqueness within a tournament

# Additional features

## Add separate player signup page for tournament/event registration
- right now, players sign up for tournaments by clicking into a tournament, clicking into an event, and searching themselves up through the "add entrant" search. desired flow: user clicks into tournament, sees list of events, and there should be a "register" button which takes them to a separate page which shows them the list of events they are eligible for. user should then check off/select events they wish to register for, then submit. 

## Restrict event creation, player addition to tournament director 

## Add player abilty to withdraw from an event
- Should only remove player from event roster prior to preset withdraw deadline. 

## Change verification code to 4 digit numerical 

## Remove bracket display from pure round robin format

## Display match scores in tournament director overview 

## Check round robin tie breaker implementation

## Change "SUBMIT" button color in view bracket

## Update match score input
- When clicking into score field, field contents should clear but default to 0 if clicked out of without any input. 
- If invalid score, keep previously entered values to avoid having to reinput everything for a small typo. maybe can highlight the invalid row/field

## Allow TD to void matches while match is in "awaiting confirmation" state. 

## Player search should display players and their current rating (match filters, default to USATT singles)

## Add "Dashboard" button to header
- right now, users can only navigate back to the default landing page with their profile (upcoming matches, current rating, etc) by clicking on the RallyBase button in top left. we can keep that functionality but also add a "Dashboard" button to improve UI and make clear.
