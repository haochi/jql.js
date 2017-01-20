var table1 = new Table([{ id: 1 }, { id: 3 }]);
var table2 = new Table([{ id: 1, name: 'haochi' }, { id: 2, name: 'chen' }, { id: 3, name: 'ni hao' }]);
var table3 = new Table([{ id: 1, name: 'wong' }, { id: 2, name: 'fei' }, { id: 3, name: 'hong' }]);
var result = table1
    .query()
    .select(function (_) { return [_.table(table1).id, _.table('table2').name, _.table(table3).name]; })
    .join(new TableSelection(table2, 'table2'), function (_) { return _.table(table2).id === _.table(table1).id; })
    .join(table3, function (_) { return _.table(table1).id === _.table(table3).id; })
    .execute();
console.table(result);
