# Database Schema

Core entities required for MVP.

## Identity

users

player_profiles

roles

user_roles

## Organizations

organizations

disciplines

rating_categories

## Ratings

player_ratings

rating_transactions

## Tournaments

tournaments

events

event_entries

tournament_tables

## Matches

matches

match_games

## Result Submission

match_result_submissions

match_result_submission_games

## Key Principles

Ratings are scoped by rating category.

Official match scores are stored in match_games.

Submitted scores remain pending until confirmation.