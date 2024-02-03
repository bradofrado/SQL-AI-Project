import pgPromise from 'pg-promise';
import openai from 'openai';
import fs from 'fs';
import * as dotenv from 'dotenv'
dotenv.config();

const pgp = pgPromise();

const gpt = new openai.OpenAI({
    apiKey: process.env.OPEN_AI_KEY
})

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
    }
}

async function executeQuery(query: string): Promise<unknown[] | string> {
    try {
        const result = await db.any(query);

        return result;
    } catch (error) {
        return String(error);
    }
}

async function executeQueries(queries: string[]): Promise<(unknown[] | undefined)[]> {
    const results: (unknown[] | undefined)[] = [];
    for (const query of queries) {
        try {
            const result = await db.any(query);
            console.log(result);
            results.push(result);
        } catch(error) {
            results.push(undefined);
        }
    } 
    // Close the database connection
    pgp.end();

    return results;
} 

async function getChatGPTResponse(message: string): Promise<string> {
    const response = await gpt.chat.completions.create({
        messages: [{content: message, role: 'user'}],
        model: 'gpt-4'
    });

    const choice = response.choices[0];
    if (!choice || choice.finish_reason !== 'stop' || choice.message.content === null) {
        return 'There was an error in the response';
    }

    console.log(choice.message.content);

    return choice.message.content;
}

function getSqlFromResponse(value: string): string {
    const sqlStartMarker = '```sql';
    const sqlEndMarker = '```';

    let newValue = value.toLowerCase().split(sqlStartMarker)[1];
    if (newValue === undefined) {
        return value.split(sqlEndMarker)[1] as string;
    }
    return newValue.split(sqlEndMarker)[0] as string;
    // const responses: string[] = [];

    // const split = value.split(sqlStartMarker);
    // for (let i = 1; i < split.length; i++) {
    //     const str = split[i] as string;
    //     responses.push(str.split(sqlEndMarker)[0] as string);
    // }

    //return responses;
}

function getSetupPrompt(question: string, isSingleShot: boolean): string {
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

    //const questionsStr = questions.map(question => `Question: ${question}\n`).join('');

    return `${setupSQL}
${isSingleShot ? `How many total players are there?
SELECT COUNT(1) FROM basketball_players;` : ''}

-- Using valid Postgres SQL syntax, answer the following questions for the tables provided above.
Question: ${question}`;
}

function getFriendlyPrompt(question: string, result: string): string {
    // if (questions.length !== results.length) {
    //     throw new Error("Invalid questions and results");
    // }

    // const togetherNow: string[] = [];
    // for (let i = 0; i < questions.length; i++) {
    //     const question = questions[i] as string;
    //     const result = results[i] as string;

    //     togetherNow.push(`Question: ${question}\nResult: ${result}\n`);
    // }

    return `Give user friendly descriptions in one sentence of the questions I asked and their associated results.
Question: ${question}\nResult: ${result}`
}

const questions = [
    'Which basketball team is the best?',
    'Which player is the best?',
    'Which basetball team is the worst?',
    'How many players have scored more than 50 points this season?',
    'Which team has played the best this season?',
    'Which players have not scored yet this season?'
];

const response = {
    role: 'assistant',
    content: `To answer these questions, we'll need to write some SQL queries and make some assumptions because the definition of "best" and "worst" teams, as well as the "best" player, can vary depending on the criteria (e.g., number of championships, win/loss record, points scored). We'll assume the following:\n` +
      '\n' +
      '- The "best" team is the one with the most championships.\n' +
      '- The "best" player is the one with the highest total player points.\n' +
      '- The "worst" team is the one with the fewest championships.\n' +
      '- The team that played the best this season has the highest point differential in games (sum of points scored minus points allowed).\n' +
      '- A player that has not scored yet has zero player points across all games.\n' +
      '\n' +
      'Here are the queries to answer each question:\n' +
      '\n' +
      '1. Which basketball team is the best?\n' +
      '```sql\n' +
      'SELECT * FROM basketball_team\n' +
      'ORDER BY num_championships DESC\n' +
      'LIMIT 1;\n' +
      '```\n' +
      '\n' +
      '2. Which player is the best?\n' +
      '```sql\n' +
      'SELECT player_id, SUM(player_points) AS total_points\n' +
      'FROM basketball_game_stats\n' +
      'GROUP BY player_id\n' +
      'ORDER BY total_points DESC\n' +
      'LIMIT 1;\n' +
      '```\n' +
      '\n' +
      '3. Which basketball team is the worst?\n' +
      '```sql\n' +
      'SELECT * FROM basketball_team\n' +
      'ORDER BY num_championships ASC\n' +
      'LIMIT 1;\n' +
      '```\n' +
      '\n' +
      '4. How many players have scored more than 50 points this season?\n' +
      '```sql\n' +
      'SELECT COUNT(DISTINCT player_id) FROM basketball_game_stats\n' +
      'WHERE player_points > 50;\n' +
      '```\n' +
      '\n' +
      '5. Which team has played the best this season?\n' +
      'For this, we need to calculate point differentials for home and away games separately, then sum them up.\n' +
      '```sql\n' +
      'SELECT team, SUM(point_diff) as total_diff \n' +
      'FROM (\n' +
      '    SELECT home_team as team, (home_final_score - away_final_score) as point_diff\n' +
      '    FROM basketball_games\n' +
      '    UNION ALL\n' +
      '    SELECT away_team as team, (away_final_score - home_final_score) as point_diff\n' +
      '    FROM basketball_games\n' +
      ') as subquery\n' +
      'GROUP BY team\n' +
      'ORDER BY total_diff DESC\n' +
      'LIMIT 1;\n' +
      '```\n' +
      '\n' +
      '6. Who is the player that has not scored yet this season?\n' +
      '```sql\n' +
      'SELECT id, name FROM basketball_players\n' +
      'WHERE id NOT IN (SELECT DISTINCT player_id FROM basketball_game_stats WHERE player_points > 0);\n' +
      '```\n' +
      '\n' +
      'Please keep in mind that "best" and "worst" are quite subjective and the queries might need to be adjusted based on the specific definitions used by the basketball league or organization in question. Also, these queries do not join with the player/team names for readability, but you could join with the relevant tables if you need the actual names instead of just the IDs.'
  }

function writeToFile(filepath: string, content: string): void {
    fs.writeFileSync(filepath, content, 'utf-8');
}

interface QuestionResult {
    question: string,
    sql: string,
    rawResponse: string,
    friendlyResponse: string,
    error: string | undefined
}

async function run(strategy: 'zero-shot' | 'single-shot') {
    await setupDatabase();

    const results: QuestionResult[] = [];
    for (const question of questions) {
        const prompt = getSetupPrompt(question, strategy === 'single-shot');
        
        const response = await getChatGPTResponse(prompt);
        const sqlResponse = getSqlFromResponse(response);
        console.log(sqlResponse);
        const rawResponse = await executeQuery(sqlResponse);
        console.log(rawResponse);

        let error: string | undefined;
        if (typeof rawResponse === 'string') {
            error = rawResponse;
        }

        const friendlyPrompt = typeof rawResponse !== 'string' ? getFriendlyPrompt(question, JSON.stringify(rawResponse)) : error as string;
        const friendlyResponse = await getChatGPTResponse(friendlyPrompt);

        results.push({question, sql: sqlResponse, rawResponse: JSON.stringify(rawResponse), error, friendlyResponse})
    }

    writeToFile(`./results/${strategy}.json`, JSON.stringify({strategy, results: results}));

    pgp.end();
}

run('single-shot');