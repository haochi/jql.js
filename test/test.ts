import { Table } from '../src/Table';
import { Query, TableSelection } from '../src/query/Query';

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

describe('Table', () => {
    describe('#all', () => {
        it('should contain all given data', () => {
            const table = new Table<any>([{ id: 1 }, { id: 3 }]);
            expect(table.all().length).toBe(2);
        })
    })
})

describe('Query', () => {
    const state = new Table<State>([{ id: 1, name: 'new york' }, { id: 3, name: 'california' }]);
    const city = new Table<City>([{ id: 1, stateId: 3, name: 'san francisco' }, { id: 2, stateId: 1, name: 'new york' }, { id: 3, stateId: 3, name: 'san jose' }]);
    const resident = new Table<Resident>([{ id: 1, cityId: 1, name: 'eve' }, { id: 2, cityId: 1, name: 'alice' }, { id: 3, cityId: 1, name: 'bob' }]);
    
    it('should return empty rows without calling #select', () => {
        const query = new Query
        const result = query.from(state).execute()

        result.forEach(row => {
            expect(row.length).toBe(0)
        })
    })

    it('should return columns given in select', () => {
        const query = new Query
        const result = query.from(state).select(_ => [_.table(state).id]).execute()
        expect(result).toEqual([[1], [3]])
    })

    it('should return the joined tables', () => {
        const query = new Query
        const result = query
            .from(state)
            .join<City>(city, _ => _.table(state).id === _.table(city).stateId)
            .select(_ => [_.table(state).name, _.table(city).name])
            .execute()

        expect(result).toEqual([ [ 'new york', 'new york' ], [ 'california', 'san francisco' ], [ 'california', 'san jose' ] ])
    })

    it('should return result from multiple joined tables', () => {
        const query = new Query
        const result = query
            .from(state)
            .join<City>(city, _ => _.table(state).id === _.table(city).stateId)
            .join<Resident>(resident, _ => _.table(city).id === _.table(resident).cityId)
            .select(_ => [_.table(state).name, _.table(city).name, _.table(resident).name])
            .execute()

        expect(result).toEqual([ [ 'california', 'san francisco', 'eve' ], [ 'california', 'san francisco', 'alice' ], [ 'california', 'san francisco', 'bob' ] ])
    })
})