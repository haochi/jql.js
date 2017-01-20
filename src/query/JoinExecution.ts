import { Execution, ExecuteResult, TableSelection, TableRowReference, Predicate } from './Query'

export class JoinExecution<T, R> implements Execution {
    constructor(private anchorTable: TableSelection<T>, private otherTable: TableSelection<R>, private predicate: Predicate) {
    }

    execute(intermediateResult: ExecuteResult): ExecuteResult {
        const result: ExecuteResult = [];

        intermediateResult.forEach(tableRow => {
            this.otherTable.table.all().forEach(row => {
                const tableRowReference = tableRow.copy();
                tableRowReference.set(this.otherTable, row);

                if (this.predicate(tableRowReference)) {
                    result.push(tableRowReference);
                }
            });
        });

        return result;
    }
}