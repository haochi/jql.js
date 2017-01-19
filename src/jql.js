var Table = (function () {
    function Table(rows) {
        this.rows = rows;
    }
    Table.prototype.query = function () {
        var query = new Query();
        query.from(this);
        return query;
    };
    Table.prototype.all = function () {
        return this.rows;
    };
    return Table;
}());
var JoinExecution = (function () {
    function JoinExecution(query, anchorTable, otherTable, condition) {
        this.query = query;
        this.anchorTable = anchorTable;
        this.otherTable = otherTable;
        this.condition = condition;
    }
    JoinExecution.prototype.execute = function () {
        var _this = this;
        var result = [];
        this.anchorTable.table.all().forEach(function (r1) {
            _this.otherTable.table.all().forEach(function (r2) {
                var rows = new TableRowReference();
                rows.set(_this.anchorTable, r1);
                rows.set(_this.otherTable, r2);
                if (_this.condition(rows)) {
                    result.push(rows);
                }
            });
        });
        return result;
    };
    return JoinExecution;
}());
var TableSelection = (function () {
    function TableSelection(table, as) {
        if (as === void 0) { as = null; }
        this.table = table;
        this.as = as;
    }
    return TableSelection;
}());
var TableRowReference = (function () {
    function TableRowReference() {
        this.tableReference = new Map();
    }
    TableRowReference.prototype.table = function (tableReference) {
        return this.tableReference.get(tableReference);
    };
    TableRowReference.prototype.set = function (table, row) {
        this.tableReference.set(table.as, row);
        this.tableReference.set(table.table, row);
    };
    return TableRowReference;
}());
var Query = (function () {
    function Query() {
        this.executions = [];
        this.tableReferences = new Map();
        this.selector = function (_) { return []; };
    }
    Query.prototype.select = function (selector) {
        this.selector = selector;
        return this;
    };
    Query.prototype.join = function (table, condition) {
        var execution = new JoinExecution(this, this.anchorTable, this.tableToTableSelection(table), condition);
        this.executions.push(execution);
        return this;
    };
    Query.prototype.from = function (table) {
        this.anchorTable = this.tableToTableSelection(table);
        return this;
    };
    Query.prototype.execute = function () {
        var result = [];
        this.executions.forEach(function (execution) {
            result = execution.execute();
        });
        return result.map(this.selector);
    };
    Query.prototype.tableToTableSelection = function (table) {
        if (table instanceof Table) {
            return new TableSelection(table, Symbol());
        }
        return table;
    };
    return Query;
}());
var table1 = new Table([{ id: 1 }, { id: 3 }]);
var table2 = new Table([{ id: 1, name: 'haochi' }, { id: 2, name: 'chen' }, { id: 3, name: 'ni hao' }]);
var result = table1.query().select(function (_) {
    return [_.table(table1).id, _.table('table2').name];
}).join(new TableSelection(table2, 'table2'), function (_) {
    return _.table('table2').id === _.table(table1).id;
}).execute();
console.log(result);
