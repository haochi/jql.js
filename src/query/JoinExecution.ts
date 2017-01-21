import { Execution, ExecuteResult, TableSelection, TableRowReference, Predicate } from './Query'
import { JoinType } from './JoinType'
import { Row } from '../Table'

type JoinStrategy<R> = (intermediateResult: ExecuteResult, otherTable: TableSelection<R>, predicate: Predicate) => ExecuteResult

export class JoinExecution<T, R> implements Execution {
    private joinStrategies: Map<JoinType, JoinStrategy<R>> = new Map([
        [JoinType.INNER, JoinExecution.innerJoin],
        [JoinType.LEFT, JoinExecution.leftJoin],
        [JoinType.RIGHT, JoinExecution.rightJoin],
        [JoinType.FULL, JoinExecution.fullJoin]
    ]);

    constructor(private otherTable: TableSelection<R>, private predicate: Predicate, private joinType: JoinType) {
    }

    execute(intermediateResult: ExecuteResult): ExecuteResult {
        const strategy = this.joinStrategies.get(this.joinType);
        return strategy(intermediateResult, this.otherTable, this.predicate);
    }

    private static innerJoin<R>(intermediateResult: ExecuteResult, otherTable: TableSelection<R>, predicate: Predicate): ExecuteResult {
        const result: ExecuteResult = []
        intermediateResult.forEach(tableRow => {
            otherTable.table.all().forEach(row => {
                const tableRowReference = tableRow.copy();
                tableRowReference.set(otherTable, row);

                if (predicate(tableRowReference)) {
                    result.push(tableRowReference);
                }
            });
        })
        return result;
    }

    private static leftJoin<R>(intermediateResult: ExecuteResult, otherTable: TableSelection<R>, predicate: Predicate): ExecuteResult {
        const result: ExecuteResult = []
        intermediateResult.forEach(tableRow => {
            let joined = false;

            otherTable.table.all().forEach(row => {
                const tableRowReference = tableRow.copy();
                tableRowReference.set(otherTable, row);

                if (predicate(tableRowReference)) {
                    result.push(tableRowReference);
                    joined = true;
                }
            });

            if (!joined) {
                result.push(tableRow);
            }
        });

        return result;
    }

    private static rightJoin<R>(intermediateResult: ExecuteResult, otherTable: TableSelection<R>, predicate: Predicate): ExecuteResult {
        const result: ExecuteResult = [];
        otherTable.table.all().forEach(row => {
            let joined = false;

            intermediateResult.forEach(tableRow => {
                const tableRowReference = tableRow.copy();
                tableRowReference.set(otherTable, row);

                if (predicate(tableRowReference)) {
                    result.push(tableRowReference);
                    joined = true;
                }
            })

            if (!joined) {
                const tableRowReference = new TableRowReference();
                tableRowReference.set(otherTable, row);
                result.push(tableRowReference);
            }
        });

        return result;
    }

    private static fullJoin<R>(intermediateResult: ExecuteResult, otherTable: TableSelection<R>, predicate: Predicate): ExecuteResult {
        const result: ExecuteResult = JoinExecution.leftJoin(intermediateResult, otherTable, predicate)
        const joined: Array<Row<R>> = result.filter(row => row.has(otherTable)).map(row => row.table<R>(otherTable.table))
        const joinedSet: Set<Row<R>> = new Set(joined)
        
        otherTable.table.all().forEach(row => {
            if (!joinedSet.has(row)) {
                const tableRowReference = new TableRowReference();
                tableRowReference.set(otherTable, row);
                result.push(tableRowReference);
            }
        });

        return result;
    }
}