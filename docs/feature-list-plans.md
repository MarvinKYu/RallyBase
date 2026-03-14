# Planned

- For version 0.3

## Add start time to events and tournaments
- Tournament start time can be explicitly set or default to start time of earliest event

## Add "Completed/Past" tournaments category in tournaments page
- Tournaments should move into this category once past tournament end date
- End date should default to tournament start date if not explicitly set

## Add match history and rating graph to player dashboard

# Completed 

- Implemented in version 0.2

## Improve player search in default player search and in tournament add player
- Add filters
- Clear search bar after selecting
- Add player id which is unique and can be searchable

## Let players sign up for tournaments themselves
- Right now, only way is for tournament directors to manually add
- Extend functionality for event type and check eligibility for player on event signup attempt (rating, age, max participants, etc)
- Ensure event names unique

## Add round robin tournament format
- Support 3, 4, 5, and 6 player round robin formats
- Extend with round robin -> single elim integrated format

## Separate tournament director view from player view
- As a tournament director, have complete view of tournament- all events, all matches, have ability to set/manipulate results in case of player error or discrepancies
- As a player, if signed up for a tournament, navigating to the tournaments tab should show you the tournaments you're signed up for at the top. clicking into a tournament you're signed up for should show the events you're entered in and your matches. Player default page/dashboard should also update to show upcoming matches when tournament in progress

## Fix single-elim bracket UI alignment