import pgPromise, {IDatabase} from 'pg-promise';

const pgp = pgPromise({ capSQL: true })

export {pgp}
