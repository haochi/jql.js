type Row<T> = T;
type Rows<T> = Array<Row<T>>;
type QueryResult<T> = Rows<T>;
type TableOrTableSelection<T> = Table<T> | TableSelection<T>;
type JoinCondition = (tableRowReference: TableRowReference) => boolean;
type QueryTableReference<T> = Table<T> | QueryTableAs;
type QueryTableAs = String | Symbol;
type ExecuteResult = Array<TableRowReference>;
type Selector = (tableRowReference: TableRowReference) => Rows<any>;

interface Execution<T> {
    execute(intermediateResult: ExecuteResult): ExecuteResult;
}

class Table<T> {
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

class JoinExecution<T, R> implements Execution<T> {
    constructor(private query: Query<T>, private anchorTable: TableSelection<T>, private otherTable: TableSelection<R>, private condition: JoinCondition) {
    }

    execute(intermediateResult: ExecuteResult): ExecuteResult {
        const result: ExecuteResult = [];

        intermediateResult.forEach(tableRow => {
            this.otherTable.table.all().forEach(row => {
                const oldValue = tableRow.table<R>(this.otherTable.table);

                tableRow.set(this.otherTable, row);

                if (this.condition(tableRow)) {
                    result.push(tableRow);
                } else {
                    tableRow.set(this.otherTable, oldValue);
                }
            });
        });
        return result;
    }
}

class TableSelection<T> {
    constructor(public table: Table<T>, public as: QueryTableAs = null) {
    }
}

class TableRowReference {
    private tableReference: Map<QueryTableReference<any>, Row<any>> = new Map();

    table<R>(tableReference: QueryTableReference<R>) :Row<R> {
        return this.tableReference.get(tableReference);
    }

    set(table: TableSelection<any>, row: Row<any>) {
        this.tableReference.set(table.as, row);
        this.tableReference.set(table.table, row);
    }
}

class Query<T> {
    private executions : Array<Execution<T>> = [];
    private anchorTable: TableSelection<T>;
    private tableReferences: Map<String, Table<T>> = new Map();
    private selector: Selector = (_) => [];

    select(selector: Selector): Query<T> {
        this.selector = selector;
        return this;
    }

    join<R>(table: TableOrTableSelection<R>, condition: JoinCondition): Query<T> {
        const execution = new JoinExecution(this, this.anchorTable, this.tableToTableSelection(table), condition);
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
