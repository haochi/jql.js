import { Execution, ExecuteResult, Predicate } from './Query'

export class WhereExecution<T, R> implements Execution {
    constructor(private predicate: Predicate) {
    }

    execute(intermediateResult: ExecuteResult): ExecuteResult {
        return intermediateResult.filter(this.predicate);
    }
}