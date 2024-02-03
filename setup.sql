drop table if exists basketball_game_stats;
drop table if exists basketball_games;
drop table if exists basketball_players;
drop table if exists basketball_team;

create table basketball_team (
id int primary key,
name text,
num_championships int
);

create table basketball_players (
id int primary key,
name text,
team_id int,
foreign key(team_id) references basketball_team(id)
);

create table basketball_games (
id int primary key,
home_team int,
away_team int,
home_final_score int,
away_final_score int,
foreign key (home_team) references basketball_team(id),
foreign key (away_team) references basketball_team(id)
);

create table basketball_game_stats (
id int primary key,
game_id int,
player_id int,
player_points int,
foreign key (game_id) references basketball_games(id),
foreign key (player_id) references basketball_players(id)
);

insert into basketball_team
values (1, 'BYU', 10), (2, 'Baylor', 3), (3, 'Utah', 0), (4, 'Houston', 5);

insert into basketball_players
values (1, 'Trevin Knell', 1), (2, 'Spencer Johnson', 1), (3, 'Bob Stout', 2), (4, 'Jo Jo Jones', 2),
(5, 'Little Hand', 3), (6, 'Jaxson Flaxon', 3), (7, 'Kevin', 4), (8, 'Michael Mikeson', 4);

insert into basketball_games
values (1, 1, 3, 100, 10), (2, 3, 2, 20, 67), (3, 4, 3, 89, 2), (4, 4, 1, 67, 69),
(5, 2, 4, 78, 98);

insert into basketball_game_stats values
(1, 1, 1, 60), (2, 1, 2, 10), (3, 1, 5, 0), (4, 1, 6, 8), (5, 2, 5, 0), (6, 2, 3, 45), (7, 3, 7, 89),
(8, 3, 5, 0), (9, 4, 7, 67), (10, 4, 1, 50), (11, 5, 3, 20), (12, 5, 7, 98);