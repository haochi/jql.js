import { Table, Rows, Row } from '../Table';
import { JoinExecution } from './JoinExecution'
import { WhereExecution } from './WhereExecution'
import { JoinType } from './JoinType'

type QueryResult<T> = Rows<T>;
type QueryTableReference<T> = Table<T> | QueryTableAs;
type QueryTableAs = String;
type TableOrTableSelection<T> = Table<T> | TableAs<T>;
type Selector = (tableRowReference: TableRowReference) => Rows<any>;
export type ExecuteResult = Array<TableRowReference>;
export type Predicate = (tableRowReference: TableRowReference) => boolean;

export class Query<T> {
    private executions : Array<Execution> = [];
    private anchorTable: TableAs<T>;
    private tableReferences: Map<String, Table<T>> = new Map();
    private selector: Selector = (_) => [];
    private take: number;
    private skip: number;

    select(selector: Selector): Query<T> {
        this.selector = selector;
        return this;
    }

    join<R>(table: TableOrTableSelection<R>, predicate: Predicate, joinType: JoinType = JoinType.INNER): Query<T> {
        const execution = new JoinExecution(this.tableToTableSelection(table), predicate, joinType);
        this.executions.push(execution);
        return this;
    }

    where(predicate: Predicate) {
        this.executions.push(new WhereExecution(predicate))
        return this;
    }

    limit(limit: number) {
        this.take = limit
        return this;
    }

    offset(offset: number) {
        this.skip = offset;
        return this;
    }

    from(table: TableOrTableSelection<T>): Query<T> {
        this.anchorTable = this.tableToTableSelection(table);
        return this;
    }

    execute() : Array<any> {
        const anchorTable = this.anchorTable;

        let result: ExecuteResult = anchorTable.table.all().map(row => {
            const column = new TableRowReference();
            column.set(anchorTable, row);
            return column;
        });

        this.executions.forEach(execution => {
            result = execution.execute(result);
        });

        if (this.skip !== undefined) {
            result = result.slice(this.skip);
        }

        if (this.take !== undefined) {
            result.length = this.take;
        }

        return result.map(this.selector);
    }

    private tableToTableSelection<R>(table: TableOrTableSelection<R>) : TableAs<R> {
        if (table instanceof Table) {
            return new TableAs<R>(table);
        }
        return table;
    }
}

export class TableAs<T> {
    constructor(public table: Table<T>, public as: QueryTableAs = null) {
    }
}

export interface Execution {
    execute(intermediateResult: ExecuteResult): ExecuteResult;
}

type ColumnReader<R> =(row: Row<R>) => any;
export class TableRowReference {
    private tableReference: Map<QueryTableReference<any>, Row<any>> = new Map();

    table<R>(tableReference: QueryTableReference<R>): Row<R> {
        return this.tableReference.get(tableReference);
    }

    column<R>(tableReference: QueryTableReference<R>, columnReader: ColumnReader<R>): any {
        if (this.tableReference.has(tableReference)) {
            return columnReader(this.tableReference.get(tableReference));
        }
        return null;
    }

    has(table: TableAs<any>) {
        return this.tableReference.has(table.table);
    }

    set(table: TableAs<any>, row: Row<any>) {
        if (table.as) {
            this.tableReference.set(table.as, row);
        }
        this.tableReference.set(table.table, row);
    }

    copy() {
        const tableRowReference = new TableRowReference;
        this.tableReference.forEach((v, k) => tableRowReference.tableReference.set(k, v));
        return tableRowReference
    }

    clear() {
        this.tableReference.clear();
    }
}
