import { Execution, ExecuteResult, TableSelection, TableRowReference, Query } from './Query'

export type JoinCondition = (tableRowReference: TableRowReference) => boolean;

export class JoinExecution<T, R> implements Execution {
    constructor(private query: Query<T>, private anchorTable: TableSelection<T>, private otherTable: TableSelection<R>, private condition: JoinCondition) {
    }

    execute(intermediateResult: ExecuteResult): ExecuteResult {
        const result: ExecuteResult = [];

        intermediateResult.forEach(tableRow => {
            this.otherTable.table.all().forEach(row => {
                const tableRowReference = tableRow.copy();
                tableRowReference.set(this.otherTable, row);

                if (this.condition(tableRowReference)) {
                    result.push(tableRowReference);
                }
            });
        });

        return result;
    }
}