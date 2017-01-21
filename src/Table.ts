import { Query, TableAs } from './query/Query';
import { JoinType } from './query/JoinType';

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

export { JoinType, TableAs };