# Current bugs

## Version 0.4.0

### Bracket page showing up in round robin format after event creation
After creating a new round robin event with 3 players (call them A, B, C for simplicity) and clicking "generate schedule", app generates a bracket with quarterfinal between player B and C, semifinal between player A and B, and final between player A and C, and shows it on webpage. this should not exist at all, after generating schedule for round robin TD should see the page that can be navigated to by "view standings" button that shows current standings with table of players, w/l, games, points and the match schedule. 

### Text alignment for matches from TD view
status text such as "completed", "pending", "awaiting confirmation", and match options like "enter result", and "void" aren't visually aligned. in particular, the "void" option is clearly visually slightly lower inside the box than the other text. should fix this and recheck text alignment for other text fields as well. 

# Fixed

## Version 0.3.1

### Game score validation
- Score gap when either score is >11 has to be at most 2. This is because the win by 2 rule has to take place after deuce (10-10) is reached. Need to reject game scores like 11-50.
