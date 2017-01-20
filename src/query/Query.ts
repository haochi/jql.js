import { Table, Rows, Row } from '../Table';
import { JoinExecution } from './JoinExecution'
import { WhereExecution } from './WhereExecution'

type QueryResult<T> = Rows<T>;
type QueryTableReference<T> = Table<T> | QueryTableAs;
type QueryTableAs = String | Symbol;
type TableOrTableSelection<T> = Table<T> | TableSelection<T>;
type Selector = (tableRowReference: TableRowReference) => Rows<any>;
export type ExecuteResult = Array<TableRowReference>;
export type Predicate = (tableRowReference: TableRowReference) => boolean;

export class Query<T> {
    private executions : Array<Execution> = [];
    private anchorTable: TableSelection<T>;
    private tableReferences: Map<String, Table<T>> = new Map();
    private selector: Selector = (_) => [];

    select(selector: Selector): Query<T> {
        this.selector = selector;
        return this;
    }

    join<R>(table: TableOrTableSelection<R>, predicate: Predicate): Query<T> {
        const execution = new JoinExecution(this.anchorTable, this.tableToTableSelection(table), predicate);
        this.executions.push(execution);
        return this;
    }

    from(table: TableOrTableSelection<T>): Query<T> {
        this.anchorTable = this.tableToTableSelection(table);
        return this;
    }

    execute() {
        const anchorTable = this.anchorTable;

        let result: ExecuteResult = anchorTable.table.all().map(row => {
            const column = new TableRowReference();
            column.set(anchorTable, row);
            return column;
        });

        this.executions.forEach(execution => {
            result = execution.execute(result);
        });

        return result.map(this.selector);
    }

    private tableToTableSelection<R>(table: TableOrTableSelection<R>) : TableSelection<R> {
        if (table instanceof Table) {
            return new TableSelection<R>(table, Symbol());
        }
        return table;
    }
}

export class TableSelection<T> {
    constructor(public table: Table<T>, public as: QueryTableAs = null) {
    }
}

export interface Execution {
    execute(intermediateResult: ExecuteResult): ExecuteResult;
}

export class TableRowReference {
    private tableReference: Map<QueryTableReference<any>, Row<any>> = new Map();

    table<R>(tableReference: QueryTableReference<R>) :Row<R> {
        return this.tableReference.get(tableReference);
    }

    set(table: TableSelection<any>, row: Row<any>) {
        this.tableReference.set(table.as, row);
        this.tableReference.set(table.table, row);
    }

    copy() {
        const tableRowReference = new TableRowReference;
        this.tableReference.forEach((v, k) => tableRowReference.tableReference.set(k, v));
        return tableRowReference
    }
}
