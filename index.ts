import pgPromise from 'pg-promise';

const pgp = pgPromise();

const db = pgp({
    host: 'localhost',
    port: 5432,
    database: 'ai',
    user: 'postgres',
    password: 'password',
});

async function setupDatabase(): Promise<void> {
    try {
        const setupQuery = new pgPromise.QueryFile('./setup.sql');
        await db.none(setupQuery);

        console.log('Database setup successful!');
    } catch (error) {
        console.error('Error setting up the database:', error);
    } finally {
        pgp.end();
    }
}

async function executeQuery(query: string): Promise<unknown[] | undefined> {
    try {
        const result = await db.any(query);

        return result;
    } catch (error) {
        console.error('Error querying the database:', error);
    } finally {
        // Close the database connection
        pgp.end();
    }

    return undefined;
}

function getSetupPrompt(questions: string[]): string {
    const setupSQL = `create table basketball_team (
        id int primary key,
        name text,
        num_championships int
        );
        /* 4 example rows: 
        select * from basketball_team;
        id |  name   | num_championships 
        ----+---------+-------------------
        1 | BYU     |                10
        2 | Baylor  |                 3
        3 | Utah    |                 0
        4 | Houston |                 5
        */
        
        create table basketball_players (
        id int primary key,
        name text,
        team_id int,
        foreign key(team_id) references basketball_team(id)
        );
        /* 8 example rows:
        select * from basketball_players limit 8;
        id |      name       | team_id 
        ----+-----------------+---------
        1 | Trevin Knell    |       1
        2 | Spencer Johnson |       1
        3 | Bob Stout       |       2
        4 | Jo Jo Jones     |       2
        5 | Little Hand     |       3
        6 | Jaxson Flaxon   |       3
        7 | Kevin           |       4
        8 | Michael Mikeson |       4
        */
        
        create table basketball_games (
        id int primary key,
        home_team int,
        away_team int,
        home_final_score int,
        away_final_score int,
        foreign key (home_team) references basketball_team(id),
        foreign key (away_team) references basketball_team(id)
        );
        /* 5 example rows:
        select * from basketball_games limit 5;
        id | home_team | away_team | home_final_score | away_final_score 
        ----+-----------+-----------+------------------+------------------
        1 |         1 |         3 |              100 |               10
        2 |         3 |         2 |               20 |               67
        3 |         4 |         3 |               89 |                2
        4 |         4 |         1 |               67 |               69
        5 |         2 |         4 |               78 |               98
        */
        
        create table basketball_game_stats (
        id int primary key,
        game_id int,
        player_id int,
        player_points int,
        foreign key (game_id) references basketball_games(id),
        foreign key (player_id) references basketball_players(id)
        );
        /* 12 example rows:
        select * from basketball_game_stats limit 12;
        id | game_id | player_id | player_points 
        ----+---------+-----------+---------------
        1 |       1 |         1 |            60
        2 |       1 |         2 |            10
        3 |       1 |         5 |             0
        4 |       1 |         6 |             8
        5 |       2 |         5 |             0
        6 |       2 |         3 |            45
        7 |       3 |         7 |            89
        8 |       3 |         5 |             0
        9 |       4 |         7 |            67
        10 |       4 |         1 |            50
        11 |       5 |         3 |            20
        12 |       5 |         7 |            98
        */`;

    const questionsStr = questions.map(question => `Question: ${question}\n`).join();

    return `${setupSQL}
-- Using valid Postgres, answer the following questions for the tables provided above.
${questionsStr}`;
}

setupDatabase();


async function run() {
    await setupDatabase();
    
}