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
    execute(): ExecuteResult;
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

    execute(): ExecuteResult {
        const result: ExecuteResult = [];

        this.anchorTable.table.all().forEach(r1 => {
            this.otherTable.table.all().forEach(r2 => {
                const rows = new TableRowReference();

                rows.set(this.anchorTable, r1);
                rows.set(this.otherTable, r2);

                if (this.condition(rows)) {
                    result.push(rows);
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
        let result: ExecuteResult = [];
        this.executions.forEach(execution => {
            result = execution.execute();
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

// test
interface IdRecord {
    id: number
}

interface IdWithNameRecord extends IdRecord {
    name: string
}

const table1 = new Table<IdRecord>([{ id: 1 }, { id: 3 }]);
const table2 = new Table<IdWithNameRecord>([{ id: 1, name: 'haochi' }, { id: 2, name: 'chen' }, { id: 3, name: 'ni hao' }]);

const result = table1.query().select(_ => {
    return [_.table<IdRecord>(table1).id, _.table<IdWithNameRecord>('table2').name];
}).join<IdWithNameRecord>(new TableSelection(table2, 'table2'), _ => {
    return _.table<IdWithNameRecord>('table2').id === _.table<IdRecord>(table1).id;
}).execute();

console.log(result);