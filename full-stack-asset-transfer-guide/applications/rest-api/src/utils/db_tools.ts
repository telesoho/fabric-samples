import { IDatabase } from 'pg-promise';
import { pgp } from './pg_db';
import * as fs from 'fs';
import * as config from '../config';

class PgTool {
    readonly db: IDatabase<{}>;

    private constructor(db: IDatabase<{}>) {
        this.db = db;
    }

    public static async create(
        connection: string, 
        dbName: string, 
    ): Promise<PgTool> {
        const cn = {
            connectionString: `${connection}/${dbName}`,
            allowExitOnIdle : true
        };

        const db = pgp(cn);

        const instance = new PgTool(db);

        return instance;
    }

    public destroy() {
        if (this.db) {
            this.db.$pool.end();
        }
    }

    public async any(sql: any) {
        try {
            return await this.db.any(sql.sql, sql.params || {});
        } catch (error) {
            console.error('Query execution failed:', error);
            throw new Error(`Database query failed: ${
                error instanceof Error ? error.message : 'Unknown error'
            }`);
        }
    }    
};

async function main() {
    try {
        console.debug(process.argv);
        const sqlFile = process.argv[2]??"dbtools-sample.json";

        if(config.postgreSqlUri) {
            const sqlStr = fs.readFileSync(sqlFile, 'utf8');
            const sql = JSON.parse(sqlStr);
            const instance = await PgTool.create(config.postgreSqlUri, sql.db);
            for(const s of sql.sqls) {
                const res = await instance.any(s);
                console.log(res);    
            }
        }
    } catch (error) {
        console.error(error);
    }
}

main().catch((err) => {
    console.error({ err }, 'Unexpected error');
});