import { Table } from '../src/Table';
import { Query, TableAs } from '../src/query/Query';
import { JoinType } from '../src/query/JoinType';

interface State {
    id: number
    name: string
}

interface City {
    id: number
    stateId: number
    name: string
}

interface Resident {
    id: number
    cityId: number
    name: string
}

const state = new Table<State>([{ id: 1, name: 'new york' }, { id: 3, name: 'california' }, { id: 4, name: 'texas' }]);
const city = new Table<City>([{ id: 1, stateId: 3, name: 'san francisco' }, { id: 2, stateId: 1, name: 'new york' }, { id: 3, stateId: 3, name: 'san jose' }]);
const resident = new Table<Resident>([{ id: 1, cityId: 1, name: 'eve' }, { id: 2, cityId: 1, name: 'alice' }, { id: 3, cityId: 1, name: 'bob' }]);

describe('Table', () => {
    describe('#all', () => {
        it('should contain all given data', () => {
            const table = new Table<any>([{ id: 1 }, { id: 3 }]);
            expect(table.all().length).toBe(2);
        })
    })

    describe('#query', () => {
        it('should run', () => {
            const result = state.query()
                .select(_ => [_.table<Resident>('rs').name, _.table(city).name, _.table(state).name])
                .join(city, _ => _.table(state).id === _.table(city).stateId)
                .join(new TableAs(resident, 'rs'), _ => _.table(city).id === _.table<Resident>('rs').cityId)
                .offset(1)
                .limit(2)
                .execute()

            const message = result.map(([name, city, state]) => `${name} lives in ${city}, ${state}`)
            expect(message).toEqual([ 'alice lives in san francisco, california', 'bob lives in san francisco, california' ]);
        })
    })
})

describe('Query', () => {
    describe('#select', () => {
        it('should return empty rows without calling #select', () => {
            const query = new Query
            const result = query.from(state).execute()

            result.forEach(row => {
                expect(row.length).toBe(0)
            })
        })

        it('should return columns given in select', () => {
            const query = new Query
            const result = query.from(state).select(_ => [_.table<State>(state).id]).execute()
            expect(result).toEqual([[1], [3], [4]])
        })
    });

    describe('#join', () => {

        it('should return the joined tables', () => {
            const query = new Query
            const result = query
                .from(state)
                .join<City>(city, _ => _.table<State>(state).id === _.table<City>(city).stateId)
                .select(_ => [_.table<State>(state).name, _.table<City>(city).name])
                .execute()

            expect(result).toEqual([ [ 'new york', 'new york' ], [ 'california', 'san francisco' ], [ 'california', 'san jose' ] ])
        })

        it('should return result from multiple joined tables', () => {
            const query = new Query
            const result = query
                .from(state)
                .join<City>(city, _ => _.table<State>(state).id === _.table<City>(city).stateId)
                .join<Resident>(resident, _ => _.table<City>(city).id === _.table<Resident>(resident).cityId)
                .select(_ => [_.table<State>(state).name, _.table<City>(city).name, _.table<Resident>(resident).name])
                .execute()

            expect(result).toEqual([ [ 'california', 'san francisco', 'eve' ], [ 'california', 'san francisco', 'alice' ], [ 'california', 'san francisco', 'bob' ] ])
        })

        it('should work with self join', () => {
            const query = new Query
            const result = query
                .from(city)
                .join<City>(new TableAs(city, 'city2'), _ => _.table<City>(city).id === _.table<City>('city2').id)
                .select(_ => [_.table<City>(city).name, _.table<City>('city2').name])
                .execute()

            expect(result).toEqual([ [ 'san francisco', 'san francisco' ], [ 'new york', 'new york' ], [ 'san jose', 'san jose' ], [ 'san francisco', 'san francisco' ], [ 'new york', 'new york' ], [ 'san jose', 'san jose' ], [ 'san francisco', 'san francisco' ], [ 'new york', 'new york' ], [ 'san jose', 'san jose' ] ])
        })
    })

    describe('#join -> left', () => {
        it('should return the left joined table', () => {
            const query = new Query
            const result = query
                .from(state)
                .join(city, _ => _.table(state).id === _.table(city).stateId, JoinType.LEFT)
                .select(_ => [_.table(state).name, _.column(city, t => t.name)])
                .execute()

            expect(result).toEqual( [ [ 'new york', 'new york' ], [ 'california', 'san francisco' ], [ 'california', 'san jose' ], [ 'texas', null ] ])
        })
    })

    describe('#join -> right', () => {
        it('should return the left joined table', () => {
            const query = new Query
            const result = query
                .from(city)
                .join(state, _ => _.table(state).id === _.table(city).stateId, JoinType.RIGHT)
                .select(_ => [_.table(state).name, _.column(city, t => t.name)])
                .execute()

            expect(result).toEqual( [ [ 'new york', 'new york' ], [ 'california', 'san francisco' ], [ 'california', 'san jose' ], [ 'texas', null ] ])
        })
    })

    describe('#where', () => {
        it('should filter with the given predicate', () => {
            const query = new Query
            const result = query.from(resident)
                .select(_ => [_.table<Resident>(resident).name])
                .where(_ => _.table<Resident>(resident).id >= 2)
                .execute()

            expect(result).toEqual([ [ 'alice' ], [ 'bob' ] ])
        })
    })

    describe('#limit & #offset', () => {
        it('should limit', () => {
            const query = new Query
            const result = query.from(resident)
                .select(_ => [_.table<Resident>(resident).name])
                .limit(1)
                .execute()

            expect(result.length).toEqual(1)
            expect(result).toEqual([['eve']])
        })

        it('should offset', () => {
            const query = new Query
            const result = query.from(resident)
                .select(_ => [_.table<Resident>(resident).name])
                .offset(1)
                .execute()

            expect(result.length).toEqual(2)
            expect(result).toEqual([['alice'], ['bob']])
        })

        it('should limit and offset', () => {
            const query = new Query
            const result = query.from(resident)
                .select(_ => [_.table<Resident>(resident).name])
                .offset(1)
                .limit(1)
                .execute()

            expect(result.length).toEqual(1)
            expect(result).toEqual([['alice']])
        })
    })
})

describe('StackOverflow Example', () => {
    // http://stackoverflow.com/review/suggested-edits/10405682

    const A = new Table([1,2,3,4].map(a => ({ a })))
    const B = new Table([3,4,5,6].map(b => ({ b })))

    it('should do inner join', () => {
        const result = A
            .query()
            .select(_ => [_.column(A, t => t.a), _.column(B, t => t.b)])
            .join(B, _ => _.table(A).a == _.table(B).b)
            .execute()
        expect(result).toEqual([ [3, 3], [4, 4] ])
    })

    it('should do left join', () => {
        const result = A
            .query()
            .select(_ => [_.column(A, t => t.a), _.column(B, t => t.b)])
            .join(B, _ => _.table(A).a == _.table(B).b, JoinType.LEFT)
            .execute()
        expect(result).toEqual([ [1, null], [2, null], [3, 3], [4, 4] ])
    })

    it('should do right join', () => {
        const result = A
            .query()
            .select(_ => [_.column(A, t => t.a), _.column(B, t => t.b)])
            .join(B, _ => _.table(A).a == _.table(B).b, JoinType.RIGHT)
            .execute()
        expect(result).toEqual([ [3, 3], [4, 4], [null, 5], [null, 6] ])
    })

    it('should do full join', () => {
        const result = A
            .query()
            .select(_ => [_.column(A, t => t.a), _.column(B, t => t.b)])
            .join(B, _ => _.table(A).a == _.table(B).b, JoinType.FULL)
            .execute()
        expect(result).toEqual([ [1, null], [2, null], [3, 3], [4, 4], [null, 5], [null, 6] ])
    })
})