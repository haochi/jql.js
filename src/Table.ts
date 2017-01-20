import { Query } from './query/Query';

export type Row<T> = T;
export type Rows<T> = Array<Row<T>>;

export class Table<T> {
    constructor(private rows: Rows<T>) {
    }

    query(): Query<T> {
        const query = new Query<T>();
        query.from(this);
        return query;
    }

    all(): Rows<T> {
        return this.rows;
    }
}