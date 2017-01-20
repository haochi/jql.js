interface IdRecord {
    id: number
}

interface IdWithNameRecord extends IdRecord {
    name: string
}

const table1 = new Table<IdRecord>([{ id: 1 }, { id: 3 }]);
const table2 = new Table<IdWithNameRecord>([{ id: 1, name: 'haochi' }, { id: 2, name: 'chen' }, { id: 3, name: 'ni hao' }]);
const table3 = new Table<IdWithNameRecord>([{ id: 1, name: 'wong' }, { id: 2, name: 'fei' }, { id: 3, name: 'hong' }]);

const result = table1
.query()
.select(_ => [_.table<IdRecord>(table1).id, _.table<IdWithNameRecord>('table2').name, _.table<IdWithNameRecord>(table3).name])
.join<IdWithNameRecord>(new TableSelection(table2, 'table2'), _ => _.table<IdWithNameRecord>(table2).id === _.table<IdRecord>(table1).id)
.join<IdWithNameRecord>(table3, _ => _.table<IdRecord>(table1).id === _.table<IdWithNameRecord>(table3).id)
.execute();

console.table(result);